# Environment variables

Secrets are set in the hosting dashboards (Render, Vercel) or a private `.env` outside the repository. **Never commit
a value.** Defaults are in `backend/src/main/resources/application.properties`.

## Backend (Render > Environment)

| Variable | Required | Meaning | Production value |
|---|---|---|---|
| `DB_URL` | yes | JDBC URL of PostgreSQL, e.g. `jdbc:postgresql://host/db?sslmode=require` | Neon URL |
| `DB_USER` / `DB_PASSWORD` | yes | The **application** user: rows only (docs/sql/least-privilege-roles.sql) | `kvell_app` |
| `FLYWAY_USER` / `FLYWAY_PASSWORD` | recommended | Schema owner, used only for migrations at start-up; defaults to `DB_USER` | owner role |
| `DB_POOL_SIZE` | no | Connections per backend instance (keep instances × size below the database limit) | `10` |
| `PORT` | set by Render | HTTP port | – |
| `CORS_ORIGINS` | yes | Comma-separated browser origins allowed to call the API (no `*`) | the two Vercel URLs |
| `CLIENT_IP_HEADER` | yes on Render | Header holding the visitor's real address behind the CDN. **Empty when browsers reach the backend directly** | `CF-Connecting-IP` |
| `FORWARD_HEADERS_STRATEGY` | no | `native` behind a private reverse proxy | `none` |
| `MFA_REQUIRED` | no | Two-step sign-in required for COE / Chief COE | `true` |
| `ADMIN_IDLE_MINUTES` / `IDLE_MINUTES` | no | Session idle timeout for COEs / everyone else | `30` / `120` |
| `RATE_LIMIT_PUBLIC` / `RATE_LIMIT_SIGNED_IN` | no | Requests per visitor per minute | `120` / `600` |
| `AUDIT_RETENTION_YEARS` / `NOTIFICATION_RETENTION_DAYS` | no | Retention policy | `7` / `365` |
| `LOG_FORMAT` | no | `ecs` for JSON log lines (for a log platform); empty for plain text | empty |
| `API_DOCS_ENABLED` | no | Serves `/v3/api-docs`. **Off in production** | `false` |
| `SEED_DEMO_DATA` and `DEMO_*_PASSWORD` | no | Demo accounts on an empty database. **Never in production** | unset |

## Frontends (Vercel > Environment Variables, read at build time)

| App | Variable | Meaning |
|---|---|---|
| Portal | `VITE_API_BASE_URL` | Backend API base, e.g. `https://kvell-result-api.onrender.com/api` (the app adds `/v1`) |
| Portal | `VITE_ADMIN_PANEL_URL` | COE panel sign-in address (the portal's "COE Portal" link) |
| COE panel | `VITE_API_URL` | Backend API base (as above) |
| COE panel | `VITE_MAIN_PORTAL_URL` | Portal address |
| COE panel | `VITE_SUPPORT_EMAIL`, `VITE_SUPPORT_PHONE` | Shown in the footer (optional) |

`VITE_*` values end up in the public JavaScript, so they must never hold a secret. (`VITE_FRONTEND_FORGE_*`,
`VITE_OAUTH_PORTAL_URL`, `VITE_APP_ID` belong to unused template files and can be left unset.)

## GitHub Actions secrets (Settings > Secrets and variables > Actions)

| Secret | Used by |
|---|---|
| `RENDER_DEPLOY_HOOK_URL`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID_PORTAL`, `VERCEL_PROJECT_ID_ADMIN` | `deploy.yml` |
| `NEON_DATABASE_URL` (read-only user), `BACKUP_PASSPHRASE` | `backup.yml` |
