"""
Demo data for the ERP (local demo only, never run against the hosted database).

Writes tools/demo-erp-seed.sql and tools/demo-erp-cleanup.sql:
  * CSE and AIDS (Semester I) faculty with realistic names, each allotted one subject
    (the demo logins FACCSE / FACAIDS keep their subjects and co-handle them)
  * a lesson plan (5 units x 6 topics, planned dates) for every Semester I subject of CSE and AIDS
  * logbook entries from 7 July to 3 November 2026 (no classes on holidays and IAT weeks),
    each faculty member with a different regularity and pace, so completion and performance differ
  * approved leave and a few HOD remarks

Run:  python tools/demo_erp_seed.py
      docker exec -i result-portal-db sh -c 'psql -U "$POSTGRES_USER" -d result_portal_v2' < tools/demo-erp-seed.sql
Undo: same with tools/demo-erp-cleanup.sql
Faculty accounts use the same password as the demo faculty login (FACCSE).
"""
import datetime as dt
import os
import random

HERE = os.path.dirname(os.path.abspath(__file__))
YEAR, TERM = "2026-2027", "ODD"
START, END, LAST_ENTRY = dt.date(2026, 7, 7), dt.date(2026, 11, 28), dt.date(2026, 11, 3)
HOLIDAYS = {dt.date(2026, 8, 15), dt.date(2026, 8, 27), dt.date(2026, 10, 1), dt.date(2026, 10, 2), dt.date(2026, 10, 20)}
IAT_WEEKS = [(dt.date(2026, 9, 14), dt.date(2026, 9, 19)), (dt.date(2026, 10, 26), dt.date(2026, 10, 31))]

PLANS = {
    "CS26C02T": [
        ("Introduction to Data Science", ["What is data science", "Data science life cycle", "Types of data", "Data sources and collection", "Applications in industry", "Ethics and data privacy"]),
        ("Data Preprocessing", ["Data cleaning", "Handling missing values", "Normalisation and scaling", "Feature encoding", "Exploratory data analysis", "Data visualisation basics"]),
        ("Statistics for Data Science", ["Descriptive statistics", "Probability basics", "Probability distributions", "Correlation and covariance", "Hypothesis testing", "Sampling methods"]),
        ("Introduction to Artificial Intelligence", ["History and scope of AI", "Intelligent agents", "Uninformed search (BFS, DFS)", "Heuristic search (A*)", "Knowledge representation", "Expert systems"]),
        ("Machine Learning Basics", ["Supervised vs unsupervised learning", "Linear regression", "Classification with k-NN", "Decision trees", "Clustering with k-means", "Model evaluation metrics"]),
    ],
    "CS26N01I": [
        ("Python Basics", ["Installing Python and the IDE", "Variables and data types", "Operators and expressions", "Input and output", "Conditional statements", "Loops"]),
        ("Data Structures", ["Lists", "Tuples", "Sets", "Dictionaries", "Comprehensions", "String handling"]),
        ("Functions and Modules", ["Defining functions", "Arguments and return values", "Lambda functions", "Modules and packages", "Recursion", "Variable scope"]),
        ("Files and Exceptions", ["Reading and writing files", "Working with CSV files", "Exception handling", "Custom exceptions", "Working with JSON", "Mini project: student record system"]),
        ("OOP and Libraries", ["Classes and objects", "Inheritance", "Polymorphism", "NumPy basics", "Pandas basics", "Industry case study"]),
    ],
    "CY26C01I": [
        ("Water Technology", ["Hardness of water", "Estimation of hardness (EDTA method)", "Boiler troubles", "Softening methods", "Reverse osmosis", "Drinking water standards"]),
        ("Electrochemistry and Corrosion", ["Electrochemical cells", "Electrode potential", "Nernst equation", "Types of corrosion", "Corrosion control", "Protective coatings"]),
        ("Energy Sources and Storage", ["Lead-acid and Li-ion batteries", "Fuel cells", "Solar cells", "Nuclear energy", "Supercapacitors", "Green hydrogen"]),
        ("Polymers and Composites", ["Polymerisation", "Thermoplastics and thermosets", "Conducting polymers", "Biodegradable polymers", "Composites", "Engineering applications"]),
        ("Nanomaterials and Instrumental Methods", ["Synthesis of nanomaterials", "Properties of nanomaterials", "UV-Visible spectroscopy", "IR spectroscopy", "Chromatography", "Laboratory safety"]),
    ],
    "MA26C01T": [
        ("Matrices", ["Eigenvalues and eigenvectors", "Properties of eigenvalues", "Cayley-Hamilton theorem", "Diagonalisation", "Quadratic forms", "Nature of quadratic forms"]),
        ("Differential Calculus", ["Limits and continuity", "Derivatives", "Rolle's and mean value theorems", "Taylor series", "Curvature", "Maxima and minima"]),
        ("Functions of Several Variables", ["Partial derivatives", "Total derivative", "Jacobians", "Taylor expansion in two variables", "Maxima and minima of two variables", "Lagrange multipliers"]),
        ("Integral Calculus", ["Definite integrals", "Integration by parts", "Reduction formulae", "Area and volume", "Improper integrals", "Beta and gamma functions"]),
        ("Multiple Integrals", ["Double integrals", "Change of order of integration", "Area as a double integral", "Triple integrals", "Volume as a triple integral", "Change of variables"]),
    ],
    "UC26C01T": [
        ("Language and Literature", ["Language families of India", "Sangam literature", "Ethics in Thirukkural", "Bhakti literature", "Modern Tamil literature", "Contribution of Bharathiyar"]),
        ("Heritage: Rock Art to Modern Art", ["Rock art and hero stones", "Temple architecture", "Bronze icons", "Musical instruments", "Folk arts", "Kolam and crafts"]),
        ("Folk and Martial Arts", ["Therukoothu", "Karagattam", "Silambam", "Valari", "Puppetry", "Traditional games"]),
        ("Thinai Concept of Tamils", ["Flora and fauna in Sangam literature", "Aham and Puram", "Education in the Sangam age", "Ancient ports and trade", "Overseas conquests of the Cholas", "Sangam society"]),
        ("Contribution of Tamils to Indian Culture", ["Role in the freedom struggle", "Tamil influence across India", "Self-respect movement", "Siddha medicine", "Inscriptions and manuscripts", "History of Tamil printing"]),
    ],
}
SUBJECT_ORDER = list(PLANS)

# username, name, designation, dept, subject, regularity (share of classes logged), pace (chance a class moves to the next topic),
# leave [(code, from, days)], hod remarks
FACULTY = [
    ("CSE_LAKSHMIPRIYA", "Dr. R. Lakshmi Priya", "Professor", "cse", "CS26C02T", 0.95, 0.45, [("CL", "2026-08-21", 1)],
     "Consistently ahead of the lesson plan; logbook kept up to date. Can mentor new faculty on lesson planning."),
    ("CSE_ARUNKUMAR", "Mr. K. Arun Kumar", "Assistant Professor", "cse", "CS26N01I", 0.88, 0.38, [("CL", "2026-09-04", 1), ("CL", "2026-10-09", 1), ("OD", "2026-08-28", 1)], None),
    ("CSE_MEENAKSHI", "Dr. S. Meenakshi", "Associate Professor", "cse", "CY26C01I", 0.78, 0.30, [("ML", "2026-09-22", 3)], None),
    ("CSE_VIGNESH", "Mr. P. Vignesh", "Assistant Professor", "cse", "MA26C01T", 0.62, 0.22, [("CL", "2026-08-10", 2), ("CL", "2026-09-29", 2), ("ML", "2026-10-12", 2)],
     "Unit III is behind plan. Please schedule extra classes before the end-semester examinations and update the logbook daily."),
    ("CSE_KAVITHA", "Dr. M. Kavitha", "Assistant Professor", "cse", "UC26C01T", 0.90, 0.31, [("OD", "2026-09-10", 2)], None),
    ("AIDS_SANTHOSH", "Dr. V. Santhosh Kumar", "Associate Professor", "aids", "CS26C02T", 0.92, 0.43, [("CL", "2026-08-14", 1)], None),
    ("AIDS_DIVYA", "Ms. A. Divya Bharathi", "Assistant Professor", "aids", "CS26N01I", 0.84, 0.40, [("CL", "2026-09-25", 1), ("OD", "2026-10-15", 1)], None),
    ("AIDS_RAMESH", "Dr. T. Ramesh Babu", "Professor", "aids", "CY26C01I", 0.72, 0.29, [("ML", "2026-08-03", 4)],
     "Completion is below plan in Units IV and V. Kindly cover the pending topics with tutorial hours."),
    ("AIDS_PRIYADHARSHINI", "Ms. S. Priyadharshini", "Assistant Professor", "aids", "MA26C01T", 0.86, 0.32, [("CL", "2026-10-07", 1)], None),
    ("AIDS_ANBARASI", "Dr. K. Anbarasi", "Assistant Professor", "aids", "UC26C01T", 0.91, 0.33, [], None),
]
CO_HANDLER = {"cse": "FACCSE", "aids": "FACAIDS"}
HOD = {"cse": "Head of Department (CSE)", "aids": "Head of Department (AIDS)"}
TOPIC_METHODS = ["Lecture", "Lecture", "Lecture", "Flipped class", "Seminar"]
REPEAT_METHODS = ["Tutorial", "Lecture", "Assignment discussion"]
EXTRA = [("Revision", "Revision of the previous unit"), ("Test", "Class test"), ("Tutorial", "Problem solving session"),
         ("Assignment discussion", "Assignment review and doubt clearing")]
REMARKS = [None, None, None, "Board work", "PPT used", "Doubts cleared", "Assignment given", "Notes shared on the class group", "Good participation"]


def q(s):
    return "NULL" if s is None else "'" + str(s).replace("'", "''") + "'"


def teaching(d):
    return (d.weekday() != 6 and d not in HOLIDAYS and not any(a <= d <= b for a, b in IAT_WEEKS))


def days(a, b):
    d = a
    while d <= b:
        yield d
        d += dt.timedelta(days=1)


def leave_dates(leaves):
    out = set()
    for code, start, n in leaves:
        d, left = dt.date.fromisoformat(start), n
        while left > 0:
            if d.weekday() != 6:
                out.add(d)
                left -= 1
            d += dt.timedelta(days=1)
    return out


def main():
    rnd = random.Random(2026)
    seed, cleanup = [], []
    seed.append("-- Generated by tools/demo_erp_seed.py (local demo data). Undo with tools/demo-erp-cleanup.sql.\nBEGIN;")
    names = [f[0] for f in FACULTY]
    in_list = ", ".join(q(n) for n in names)

    # faculty accounts (same password as the demo faculty login)
    for u, name, desig, dept, *_ in FACULTY:
        seed.append(f"INSERT INTO users (username, password_hash, role, display_name, dept_key, designation, enabled) "
                    f"SELECT {q(u)}, password_hash, 'FACULTY', {q(name)}, {q(dept)}, {q(desig)}, true FROM users WHERE username = 'FACCSE' "
                    f"ON CONFLICT (username) DO UPDATE SET display_name = EXCLUDED.display_name, designation = EXCLUDED.designation, enabled = true;")

    # allotment: the faculty member + the demo login as co-handler
    for u, name, desig, dept, code, *_ in FACULTY:
        for who in (u, CO_HANDLER[dept]):
            seed.append(f"INSERT INTO faculty_subjects (user_id, dept_key, semester, subject_code) SELECT id, {q(dept)}, 1, {q(code)} "
                        f"FROM users WHERE username = {q(who)} ON CONFLICT DO NOTHING;")

    # lesson plans: planned dates spread over the teaching days of the term
    term_days = [d for d in days(START, END) if teaching(d) and d.weekday() in (0, 1, 3, 4)]
    for dept in ("cse", "aids"):
        for code, units in PLANS.items():
            topics = sum(len(t) for _, t in units)
            k = 0
            for un, (title, tlist) in enumerate(units, 1):
                seed.append(f"INSERT INTO syllabus_units (dept_key, semester, subject_code, unit_no, title, planned_hours) VALUES ({q(dept)}, 1, {q(code)}, {un}, {q(title)}, 9) "
                            f"ON CONFLICT (dept_key, semester, subject_code, unit_no) DO UPDATE SET title = EXCLUDED.title, planned_hours = EXCLUDED.planned_hours;")
                for tn, t in enumerate(tlist, 1):
                    planned = term_days[min(len(term_days) - 1, round(k * (len(term_days) - 1) / (topics - 1)))]
                    k += 1
                    seed.append(f"INSERT INTO syllabus_topics (unit_id, topic_no, title, planned_date) SELECT id, {tn}, {q(t)}, DATE '{planned}' FROM syllabus_units "
                                f"WHERE dept_key = {q(dept)} AND semester = 1 AND subject_code = {q(code)} AND unit_no = {un} "
                                f"ON CONFLICT (unit_id, topic_no) DO UPDATE SET title = EXCLUDED.title, planned_date = EXCLUDED.planned_date;")
                seed.append(f"DELETE FROM syllabus_topics WHERE topic_no > {len(tlist)} AND unit_id = (SELECT id FROM syllabus_units WHERE dept_key = {q(dept)} AND semester = 1 AND subject_code = {q(code)} AND unit_no = {un});")
            seed.append(f"DELETE FROM syllabus_units WHERE dept_key = {q(dept)} AND semester = 1 AND subject_code = {q(code)} AND unit_no > {len(units)};")

    # logbook (a class every working day, fixed periods like a timetable)
    for u, name, desig, dept, code, reg, pace, leaves, _ in FACULTY:
        idx = SUBJECT_ORDER.index(code)
        weekdays = [0, 1, 2, 3, 4, 5]
        off = leave_dates(leaves)
        flat = [(un, tn, t) for un, (_, tl) in enumerate(PLANS[code], 1) for tn, t in enumerate(tl, 1)]
        pos, started = 0, False
        for d in days(START, LAST_ENTRY):
            if not teaching(d) or d.weekday() not in weekdays:
                continue
            period = (idx + d.weekday()) % 7 + 1
            co = rnd.random() < 0.08
            if (not co and d in off) or rnd.random() > reg:
                continue
            who = CO_HANDLER[dept] if co else u
            remark = rnd.choice(REMARKS)
            if started and rnd.random() < 0.12:
                method, text = rnd.choice(EXTRA)
                topic_sql = "NULL"
            else:
                if started and rnd.random() > pace:
                    method = rnd.choice(REPEAT_METHODS)          # same topic again
                elif started and pos < len(flat) - 1:
                    pos += 1
                    method = rnd.choice(TOPIC_METHODS)
                else:
                    method = "Lecture"
                started = True
                un, tn, text = flat[pos]
                topic_sql = (f"(SELECT t.id FROM syllabus_topics t JOIN syllabus_units s ON s.id = t.unit_id WHERE s.dept_key = {q(dept)} "
                             f"AND s.semester = 1 AND s.subject_code = {q(code)} AND s.unit_no = {un} AND t.topic_no = {tn})")
            ts = f"TIMESTAMPTZ '{d} 16:30:00+05:30'"
            seed.append(f"INSERT INTO logbook_entries (dept_key, semester, section, subject_code, faculty_id, entry_date, period, topic_id, topic_text, method, remarks, created_at, updated_at) "
                        f"SELECT {q(dept)}, 1, 'A', {q(code)}, id, DATE '{d}', {period}, {topic_sql}, {q(text)}, {q(method)}, {q(remark)}, {ts}, {ts} "
                        f"FROM users WHERE username = {q(who)} ON CONFLICT DO NOTHING;")

    # leave (approved by the HOD) and the balances it uses
    reasons = {"CL": "Personal work", "ML": "Fever, medical certificate attached", "OD": "Resource person for a workshop at another college"}
    for u, name, desig, dept, code, reg, pace, leaves, _ in FACULTY:
        for lc, start, n in leaves:
            to = sorted(d for d in leave_dates([(lc, start, n)]))[-1]
            seed.append(f"INSERT INTO leave_requests (applicant_id, applicant_role, dept_key, leave_code, from_date, to_date, days, reason, academic_year, approver_role, status, decided_by, decided_at, decision_remarks, created_at) "
                        f"SELECT id, 'FACULTY', {q(dept)}, {q(lc)}, DATE '{start}', DATE '{to}', {n}, {q(reasons[lc])}, {q(YEAR)}, 'HOD', 'APPROVED', {q(HOD[dept])}, "
                        f"TIMESTAMPTZ '{start} 10:00:00+05:30' - interval '1 day', 'Approved', TIMESTAMPTZ '{start} 09:00:00+05:30' - interval '2 days' FROM users WHERE username = {q(u)};")
            if lc != "OD":
                allowed = 12 if lc == "CL" else 10
                seed.append(f"INSERT INTO leave_balances (user_id, leave_code, academic_year, allowed, used) SELECT id, {q(lc)}, {q(YEAR)}, {allowed}, {n} FROM users WHERE username = {q(u)} "
                            f"ON CONFLICT (user_id, leave_code, academic_year) DO UPDATE SET used = leave_balances.used + EXCLUDED.used;")

    # HOD remarks (the scores themselves are always calculated by the ERP)
    for u, name, desig, dept, code, reg, pace, leaves, remark in FACULTY:
        if remark:
            seed.append(f"INSERT INTO performance_reviews (user_id, academic_year, term, hod_remarks, hod_by, hod_at) SELECT id, {q(YEAR)}, {q(TERM)}, {q(remark)}, {q(HOD[dept])}, now() "
                        f"FROM users WHERE username = {q(u)} ON CONFLICT (user_id, academic_year, term) DO UPDATE SET hod_remarks = EXCLUDED.hod_remarks, hod_by = EXCLUDED.hod_by, hod_at = EXCLUDED.hod_at;")
    seed.append("COMMIT;")

    # cleanup: the demo faculty (cascades to their allotments, logbook, leave, scorecards), the demo logins' seeded entries, the lesson plans
    cleanup.append("-- Removes the data of tools/demo-erp-seed.sql.\nBEGIN;")
    cleanup.append(f"DELETE FROM logbook_entries WHERE faculty_id IN (SELECT id FROM users WHERE username IN ('FACCSE', 'FACAIDS')) "
                   f"AND created_at = (entry_date + time '16:30') AT TIME ZONE 'Asia/Kolkata';")
    cleanup.append(f"DELETE FROM users WHERE username IN ({in_list});")
    for dept in ("cse", "aids"):
        cleanup.append(f"DELETE FROM syllabus_units WHERE dept_key = {q(dept)} AND semester = 1 AND subject_code IN ({', '.join(q(c) for c in PLANS)});")
    cleanup.append("COMMIT;")

    for fn, lines in (("demo-erp-seed.sql", seed), ("demo-erp-cleanup.sql", cleanup)):
        with open(os.path.join(HERE, fn), "w", encoding="utf-8", newline="\n") as f:
            f.write("\n".join(lines) + "\n")
    print(f"seed: {len(seed)} statements; cleanup: {len(cleanup)}")


if __name__ == "__main__":
    main()
