# Runbook

Who decides on rollback during an incident: **the named release owner on the go-live sheet** (docs/GO-LIVE-PLAN.md).
Status page for students and staff: `/status.html` on either site. Incidents are announced through the Super Admin
announcement banner (Chief COE > Super Admin Control).

## Where to look

| What | Where |
|---|---|
| Is it up? | `https://kvell-result-api.onrender.com/readyz` (database, pool, memory) · GitHub issues labelled `outage` (uptime monitor) |
| Backend logs | Render > service > Logs (search the `X-Request-Id` a user reports) |
| Browser errors | Render logs, logger `client-errors` |
| Who changed what | COE panel > Audit Logs (old and new values) |
| Deploys | Render > Deploys · Vercel > Deployments · GitHub Actions |

## Incidents

### The site is slow to open / "Starting the result server…"
Free hosting sleeps after 15 idle minutes; the first visitor waits up to a minute. The uptime monitor keeps it awake.
Before result day, move to a paid plan (no sleep) and open the site 10 minutes early to warm it up.

### The backend is down (`/readyz` fails or 5xx errors)
1. Render > Events: was there a deploy? If the problem started with it → **roll back** (below).
2. `/readyz` shows `"database":"down"` → see *Database down*.
3. Memory near 100 % or restarts in a loop → Render > Manual deploy > restart; consider a larger plan.

### Database down
1. Neon console: project status, connection limit, storage quota.
2. If Neon is down: wait (check status.neon.tech) and post the announcement.
3. If the data is damaged: **restore** (docs/DISASTER-RECOVERY.md), point `DB_URL` at the restored branch, redeploy.

### Traffic spike (result day)
Measured capacity: 300 simultaneous users at 9.8 ms (95th percentile) on one instance. If it slows down: scale the
Render instance up; the rate limit (120 public requests per visitor per minute) protects against single abusers.

### A wrong result was published
Follow docs/WITHDRAW-RESULT.md (withdraw → correct → publish again). Target: withdrawn within 15 minutes.

### A COE lost their phone (two-step sign-in)
They can sign in with one of their recovery codes. Otherwise the Chief COE: Super Admin Control > Officer & COE
Provisioning > the phone button next to the officer ("Reset two-step sign-in"). They set it up again at next sign-in.

### A COE is locked out after wrong passwords
The lockout ends by itself after 15 minutes. If the password is forgotten, the Chief COE sets a new starting password
(key button); the officer must change it at next sign-in.

### Suspected account compromise
Chief COE: suspend the account (lock button) → reset its password and two-step sign-in → check Audit Logs for that
user's actions (old/new values) → withdraw and correct anything changed.

## Deploy

Normal path: merge to `main` → CI passes → `deploy.yml` deploys backend then both frontends and smoke-tests them.
Manual path: docs in the private hosting folder (DEPLOY-STEPS.md). **Back up the database before any release that
contains a new migration** (`db/migration/V*.sql`).

## Roll back

| Part | How | Time |
|---|---|---|
| Backend | Render > Deploys > previous successful deploy > **Rollback** | ~2 min |
| Frontends | Vercel > Deployments > previous > **Promote to Production** | < 1 min |
| Database (a bad migration) | Restore the pre-release backup (docs/DISASTER-RECOVERY.md), then roll back the backend | ~15 min |

Migrations must stay backward compatible with the previous backend version (add columns, never rename or drop in the
same release), so rolling back the backend alone is safe.
