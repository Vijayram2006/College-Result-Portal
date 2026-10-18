# Environments

| | Development | Staging | Production |
|---|---|---|---|
| Where | A developer's computer (127.0.0.1 only) | Hosted, production-like, test data only | Hosted |
| Database | Local PostgreSQL in Docker | Neon **branch** of production with masked data | Neon main branch |
| Backend | `./mvnw spring-boot:run` | Second Render service from the same image | Render service |
| Frontends | `pnpm dev`, `npm run dev` | Vercel **preview** deployments (every branch push) | Vercel production |
| Deployed from | – | any branch | `main` only, after CI (`deploy.yml`) |

## Setting up staging (one time, about 30 minutes)

1. Neon console > Branches > **Create branch** from main, named `staging`. Copy its connection string.
2. Mask personal data on the branch (run as owner): names → `Student <reg no>`, dates of birth shifted, emails and
   phones cleared: `docs/sql/mask-staging.sql`.
3. Render > New > Web Service from the same repository, branch `backend-integration` or a release branch, with the
   staging `DB_URL`, `CORS_ORIGINS` = the Vercel preview URLs, `SEED_DEMO_DATA` unset.
4. Vercel: preview deployments are automatic; set `VITE_API_BASE_URL` / `VITE_API_URL` for the Preview environment
   to the staging backend.
5. Every release: deploy to staging, run the UAT checklist (docs/UAT-PLAN.md) there, then merge to `main`.

Migrations are tested on the staging branch first; production only ever receives a migration that already ran on
staging.
