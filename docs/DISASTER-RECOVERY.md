# Backup and disaster recovery

## Targets

| | Target | How it is met |
|---|---|---|
| **RPO** (data that may be lost) | 24 hours, 0 for published results | Nightly encrypted backup (`backup.yml`); manual backup before every release with a migration and before publishing; Neon's own point-in-time history on top |
| **RTO** (time to be working again) | 1 hour | Restore ~1 minute (drill below) + point the backend at it + redeploy (~10 min) |

## What is backed up

| Data | Backup |
|---|---|
| Database (students, marks, results, accounts, audit log, scanned answer scripts — stored in the database) | `pg_dump` custom format, nightly, AES-256 encrypted, kept 30 days as a GitHub Actions artifact (off the database server, different provider) |
| Configuration | Environment variable list in docs/ENVIRONMENT.md; values in the college's password manager |
| Code | GitHub (every commit) |

## Restore

```bash
# 1. Get the newest artifact (GitHub > Actions > Nightly database backup > run > Artifacts) and decrypt it
gpg --batch --pinentry-mode loopback --passphrase "<BACKUP_PASSPHRASE>" -d kvell-db-YYYYMMDD-HHMM.dump.gpg > db.dump

# 2. Restore into a NEW, empty database (a Neon branch or a fresh database), never over the live one
docker run --rm -v "$PWD:/in" postgres:18 pg_restore --no-owner --no-acl -d "<new database URL>" /in/db.dump

# 3. Check counts (tools/verify-counts.sql) against the last known numbers, then set DB_URL to the new database
#    on Render and redeploy. Students and staff sign in again.
```

## Restore drill

| Date | Backup | Result |
|---|---|---|
| 18 Oct 2026 | Live database, 17 Oct 2026 19:00 IST (204 KB) | Restored into a throwaway PostgreSQL 18 server: server ready 4 s, restore 1 s, total 5 s. Tables and rows present (users 28, subjects 6, audit log 141, migrations 15). Two warnings for Neon-only roles; use `--no-acl` |

Repeat the drill every semester before result publication and add a row here.
