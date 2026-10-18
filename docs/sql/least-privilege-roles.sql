-- Least-privilege database users for the result portal. Run ONCE as the database owner (on Neon: neondb_owner),
-- replacing the two passwords. Then set on the backend (Render > Environment):
--   DB_USER=kvell_app        DB_PASSWORD=<app password>        (what the application uses)
--   FLYWAY_USER=<owner>      FLYWAY_PASSWORD=<owner password>  (only for schema migrations at start-up)
-- and give the reporting / backup jobs kvell_readonly.
--
-- kvell_app can read and write rows but cannot create, alter or drop tables, cannot change the audit log (the
-- append-only trigger also stops it), and is not a superuser. kvell_readonly can only read.

\set ON_ERROR_STOP on

CREATE ROLE kvell_app LOGIN PASSWORD 'CHANGE-ME-app-password' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
CREATE ROLE kvell_readonly LOGIN PASSWORD 'CHANGE-ME-readonly-password' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;

-- Connect and see the schema, nothing more
DO $$ BEGIN EXECUTE format('GRANT CONNECT ON DATABASE %I TO kvell_app, kvell_readonly', current_database()); END $$;
GRANT USAGE ON SCHEMA public TO kvell_app, kvell_readonly;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

-- The application: rows only
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO kvell_app;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO kvell_app;
-- The migration history is the owner's alone
REVOKE INSERT, UPDATE, DELETE ON flyway_schema_history FROM kvell_app;
-- The audit log can be added to, never changed (the retention job deletes old entries through the trigger's
-- purge switch, so DELETE stays granted; UPDATE is refused here and by the trigger)
REVOKE UPDATE ON audit_logs FROM kvell_app;

-- Reporting / backups: read only
GRANT SELECT ON ALL TABLES IN SCHEMA public TO kvell_readonly;

-- Tables that later migrations create (as the owner) get the same rights automatically
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO kvell_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO kvell_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO kvell_readonly;
