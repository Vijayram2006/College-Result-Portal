"""Security smoke test for CI (and for any test copy): roles, cross-student access, injection and headers.

Runs against a backend started with SEED_DEMO_DATA=true on an EMPTY test database. Never point it at production.

Environment: API (default http://127.0.0.1:8080/api), ADMIN_PW, HOD_PW, FACULTY_PW, SUPER_PW.
Exit code 0 when every check passes.
"""
import base64, hashlib, hmac, json, os, struct, sys, time, urllib.error, urllib.request

API = os.environ.get("API", "http://127.0.0.1:8080/api").rstrip("/") + "/v1"
if "onrender.com" in API or "vercel.app" in API:
    sys.exit("Refusing to run against a hosted site")
PW = {"ADMIN": os.environ["ADMIN_PW"], "HODCSE": os.environ["HOD_PW"], "FACCSE": os.environ["FACULTY_PW"]}
SUPER_PW = os.environ.get("SUPER_PW", "")
results = []


def check(name, ok, extra=""):
    results.append(ok)
    print(("PASS " if ok else "FAIL ") + name + ("" if ok else f"  {extra}"))


def call(method, path, body=None, token=None):
    req = urllib.request.Request(API + path, method=method, data=None if body is None else json.dumps(body).encode())
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            raw = r.read()
            return r.status, (json.loads(raw) if raw else None), dict(r.headers)
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, json.loads(raw), dict(e.headers)
        except ValueError:
            return e.code, raw.decode(errors="replace"), dict(e.headers)


def totp(secret):
    key = base64.b32decode(secret + "=" * (-len(secret) % 8))
    h = hmac.new(key, struct.pack(">Q", int(time.time() // 30)), hashlib.sha1).digest()
    o = h[-1] & 15
    return "%06d" % ((struct.unpack(">I", h[o:o + 4])[0] & 0x7FFFFFFF) % 1000000)


def login(user, pw, role):
    st, body, _ = call("POST", "/auth/login", {"username": user, "password": pw, "role": role})
    # An account that already has two-step sign-in (a re-used test copy): TOTP_<USER> holds its secret
    if st == 401 and isinstance(body, dict) and body.get("otpRequired") and os.environ.get("TOTP_" + user):
        st, body, _ = call("POST", "/auth/login", {"username": user, "password": pw, "role": role,
                                                    "otp": totp(os.environ["TOTP_" + user])})
    assert st == 200, (user, st, body)
    token, view = body["token"], body["user"]
    # Seeded accounts start with a password that must be changed before anything else (this session stays valid)
    if view.get("mustChangePassword"):
        st, changed, _ = call("POST", "/auth/change-password", {"currentPassword": pw, "newPassword": pw + "Nx7"},
                              token=token)
        assert st == 200, (user, "change-password", st, changed)
        if user in PW:
            PW[user] = pw + "Nx7"
        view = changed
    return token, view


# --- Sign in every role. The COE must set up two-step sign-in first.
admin, user = login("ADMIN", PW["ADMIN"], "admin")
if user.get("mfaSetupRequired"):
    st, setup, _ = call("POST", "/auth/mfa/setup", token=admin)
    st, en, _ = call("POST", "/auth/mfa/enable", {"code": totp(setup["secret"])}, token=admin)
    check("COE two-step set-up works", st == 200 and len(en["recoveryCodes"]) == 8, (st, en))
hod, _ = login("HODCSE", PW["HODCSE"], "hod")
fac, _ = login("FACCSE", PW["FACCSE"], "faculty")

# A test student (two, to check one cannot see the other)
st, body, _ = call("PUT", "/admin/students", {"deptKey": "cse", "year": "1st Year", "semester": "Semester I",
                                               "academicYear": "2026 - 2027", "students": [
    {"row": 1, "regNo": "CI0000000001", "name": "CI Student One", "dob": "2006-01-15", "category": "regular"},
    {"row": 2, "regNo": "CI0000000002", "name": "CI Student Two", "dob": "2006-02-16", "category": "regular"}]},
    token=admin)
check("COE adds test students", st == 200, (st, body))
student, _ = login("CI0000000001", "2006-01-15", "student")

# --- 1. Nothing protected answers without a session
PROTECTED = ["/admin/dashboard", "/admin/students", "/admin/audit-logs", "/hod/overview", "/faculty/overview",
             "/student/me/results", "/super-admin/officers", "/notifications", "/auth/me"]
for path in PROTECTED:
    st, _, _ = call("GET", path)
    check(f"no session -> 401 {path}", st == 401, st)
st, _, _ = call("GET", "/admin/dashboard", token="not-a-real-token")
check("forged token -> 401", st == 401, st)

# --- 2. Each role only reaches its own area
ROLE_DENIED = {
    "student": (student, ["/admin/dashboard", "/admin/students", "/hod/overview", "/faculty/overview", "/super-admin/officers"]),
    "faculty": (fac, ["/admin/dashboard", "/admin/students", "/hod/overview", "/student/me/results", "/super-admin/officers"]),
    # (an HOD also does mark entry, so the faculty area is open to them)
    "hod": (hod, ["/admin/dashboard", "/admin/students", "/student/me/results", "/super-admin/officers"]),
    "college COE": (admin, ["/super-admin/officers", "/super-admin/config", "/student/me/results", "/hod/overview"]),
}
for role, (tok, paths) in ROLE_DENIED.items():
    for path in paths:
        st, _, _ = call("GET", path, token=tok)
        check(f"{role} refused {path}", st in (401, 403), st)

# --- 3. A student sees only their own results; the register number comes from the session
st, body, _ = call("GET", "/student/me/results", token=student)
check("student reads own results", st == 200 and body["profile"]["regNo"] == "CI0000000001", (st, body))
st, body, _ = call("GET", "/student/me/results?regNo=CI0000000002", token=student)
check("student cannot ask for another register number", st == 200 and body["profile"]["regNo"] == "CI0000000001", body)

# --- 4. Injection attempts never cause a server error or leak
PAYLOADS = ["' OR '1'='1", "1; DROP TABLE students;--", "\" OR 1=1 --", "cse' UNION SELECT password_hash FROM users--"]
for p in PAYLOADS:
    q = urllib.request.quote(p)
    for path in [f"/admin/students?dept={q}&semester=Semester%20I", f"/admin/marks?dept=cse&semester=Semester%20I&subject={q}&assessment=IAT-1"]:
        st, body, _ = call("GET", path, token=admin)
        check(f"injection refused safely ({p[:14]}...)", st in (200, 400, 404) and "$2a$" not in str(body) and "$2b$" not in str(body), (st, str(body)[:120]))
    st, _, _ = call("POST", "/auth/login", {"username": p, "password": p, "role": "admin"})
    check("injection in sign-in refused", st in (400, 401), st)
st, body, _ = call("GET", "/admin/students?dept=cse&semester=Semester%20I", token=admin)
check("students table intact after injection attempts", st == 200 and len(body) >= 2, (st, len(body) if isinstance(body, list) else body))

# --- 5. Headers and errors
st, body, h = call("GET", "/public/summary")
check("API sends a strict Content-Security-Policy", "default-src 'none'" in h.get("Content-Security-Policy", ""), h)
check("API sends X-Content-Type-Options", h.get("X-Content-Type-Options") == "nosniff", h)
st, body, _ = call("GET", "/admin/faculty-master/not-a-number", token=admin)
check("bad input gives 400, not a stack trace", st == 400 and "Exception" not in str(body), (st, body))

# Clean up the test students
for reg in ("CI0000000001", "CI0000000002"):
    call("DELETE", f"/admin/students/{reg}", token=admin)

print(f"\n{sum(results)} passed, {len(results) - sum(results)} failed")
sys.exit(0 if all(results) else 1)
