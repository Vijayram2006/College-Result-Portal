# KVELL University Result Portal

Examination results for the Karpaga Vinayaga colleges (Engineering, Nursing, Pharmacy): a **student / HOD / faculty
portal**, a **COE panel** for the Controllers of Examinations, and one **shared backend and database**.

| Part | Folder | Stack | Hosted demo |
|---|---|---|---|
| Portal (students, HODs, faculty) | `client/` | React + TypeScript (Vite) | https://kvell-result-portal.vercel.app |
| COE panel (college COEs, Chief COE) | `admin-panel/` | React + TypeScript (Vite) | https://kvell-coe-admin.vercel.app/admin/login |
| Backend API | `backend/` | Spring Boot 4 (Java 21), PostgreSQL, Flyway | https://kvell-result-api.onrender.com |

## Documents

| For | Read |
|---|---|
| Controllers of Examinations | [COE user manual](docs/COE-MANUAL.md) |
| Students | [Student guide](docs/STUDENT-GUIDE.md) |
| Developers | [Architecture](docs/ARCHITECTURE.md) · [Environment variables](docs/ENVIRONMENT.md) · [API](docs/API.md) · [Security](docs/SECURITY.md) |
| Operations | [Runbook](docs/RUNBOOK.md) · [Disaster recovery](docs/DISASTER-RECOVERY.md) · [Withdrawing a result](docs/WITHDRAW-RESULT.md) · [Staging](docs/STAGING.md) |
| Go-live | [UAT plan](docs/UAT-PLAN.md) · [Go-live plan](docs/GO-LIVE-PLAN.md) · [Credentials handover](docs/CREDENTIALS-HANDOVER.md) |
| Policy | [Retention policy](docs/RETENTION-POLICY.md) · [Privacy policy](client/public/privacy.html) · [Terms](client/public/terms.html) · [Support agreement template](docs/SUPPORT-AGREEMENT-TEMPLATE.md) |
| Changes | [Changelog](CHANGELOG.md) |

## Run it on one computer

Needs Java 21, Node 22, pnpm 10, Docker (for PostgreSQL).

```bash
# 1. Database
docker run -d --name result-portal-db -e POSTGRES_USER=result_portal -e POSTGRES_PASSWORD=<choose> \
  -e POSTGRES_DB=result_portal -p 127.0.0.1:5432:5432 postgres:17

# 2. Backend (migrations run at start-up; SEED_DEMO_DATA creates demo accounts on an empty database only)
cd backend
DB_PASSWORD=<same> SEED_DEMO_DATA=true DEMO_ADMIN_PASSWORD=<10+ letters and digits> ... ./mvnw spring-boot:run

# 3. Portal (port 3000) and COE panel (port 3002)
pnpm install && pnpm dev
cd admin-panel && npm ci && npm run dev
```

Windows: `start-demo.ps1` does all of this (it reads the passwords from a private `.env` outside the repository).
COE accounts must set up two-step sign-in (an authenticator app) at their first sign-in.

## Tests

| What | Command |
|---|---|
| Backend unit + integration tests (needs a test database in `DB_URL`) | `cd backend && ./mvnw verify` |
| Security smoke test against a running test backend | `python backend/security-tests/rbac_smoke.py` (see its header) |
| Everything, on every push | GitHub Actions `CI` (`.github/workflows/ci.yml`) |

Never run tests or load tests against the hosted site.
