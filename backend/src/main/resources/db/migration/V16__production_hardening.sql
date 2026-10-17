-- Production hardening: withdrawn results, append-only audit log with old/new values, idle session timeout,
-- two-step sign-in (TOTP) for COEs, optimistic locking on marks, and mark-range checks.

-- 1. Result lifecycle: DRAFT -> VALIDATED -> PUBLISHED -> WITHDRAWN (hidden again, with a reason)
ALTER TABLE result_batches DROP CONSTRAINT result_batches_status_check;
ALTER TABLE result_batches ADD CONSTRAINT result_batches_status_check
    CHECK (status IN ('DRAFT', 'VALIDATED', 'PUBLISHED', 'WITHDRAWN'));
ALTER TABLE result_batches
    ADD COLUMN withdrawn_by    VARCHAR(120),
    ADD COLUMN withdrawn_at    TIMESTAMPTZ,
    ADD COLUMN withdraw_reason VARCHAR(300);

-- 2. Audit log: old and new values, the request id, and no edits or deletes (only the retention job may purge)
ALTER TABLE audit_logs
    ADD COLUMN old_value  TEXT,
    ADD COLUMN new_value  TEXT,
    ADD COLUMN request_id VARCHAR(64);

CREATE OR REPLACE FUNCTION audit_logs_append_only() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'DELETE' AND coalesce(current_setting('app.audit_purge', true), '') = 'on' THEN
        RETURN OLD;
    END IF;
    RAISE EXCEPTION 'audit_logs is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_no_update BEFORE UPDATE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION audit_logs_append_only();
CREATE TRIGGER audit_logs_no_delete BEFORE DELETE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION audit_logs_append_only();
CREATE TRIGGER audit_logs_no_truncate BEFORE TRUNCATE ON audit_logs
    FOR EACH STATEMENT EXECUTE FUNCTION audit_logs_append_only();

-- 3. Sessions: last use, for the idle timeout
ALTER TABLE auth_tokens ADD COLUMN last_used_at TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE INDEX idx_auth_tokens_user ON auth_tokens (user_id);

-- 4. Two-step sign-in (authenticator app codes) for Controllers of Examinations and the Chief COE
ALTER TABLE users
    ADD COLUMN totp_secret     VARCHAR(64),
    ADD COLUMN totp_enabled    BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN totp_last_step  BIGINT,
    ADD COLUMN totp_recovery   TEXT[];

-- 5. Optimistic locking: a mark entry saved over someone else's newer entry is refused
ALTER TABLE marks ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- 6. Mark ranges, checked by the database as well as the application. NOT VALID keeps any older row that would
--    break a rule from stopping the upgrade; every new or changed row is checked. VALIDATE then checks old rows
--    too when they all fit.
ALTER TABLE marks ADD CONSTRAINT marks_part_a_total_range CHECK (part_a_total BETWEEN 0 AND 20) NOT VALID;
ALTER TABLE marks ADD CONSTRAINT marks_part_bc_total_range CHECK (part_bc_total BETWEEN 0 AND 100) NOT VALID;
-- One value per Part A question (10) and per Part B + C subdivision (q11-16 x a/b x i-iii = 36). A row of another
-- length once broke the Mark Entry roster; older such rows are padded to the right length first.
UPDATE marks SET part_a = part_a || array_fill(0::numeric, ARRAY[10 - coalesce(array_length(part_a, 1), 0)])
WHERE coalesce(array_length(part_a, 1), 0) < 10;
UPDATE marks SET part_bc = part_bc || array_fill(0::numeric, ARRAY[36 - coalesce(array_length(part_bc, 1), 0)])
WHERE coalesce(array_length(part_bc, 1), 0) < 36;
ALTER TABLE marks ADD CONSTRAINT marks_array_lengths
    CHECK (array_length(part_a, 1) = 10 AND array_length(part_bc, 1) = 36) NOT VALID;
ALTER TABLE result_records ADD CONSTRAINT result_records_total_range CHECK (total BETWEEN 0 AND 100) NOT VALID;
ALTER TABLE result_records ADD CONSTRAINT result_records_grade_points_range
    CHECK (grade_points BETWEEN 0 AND 10) NOT VALID;
ALTER TABLE result_records ADD CONSTRAINT result_records_parts_range
    CHECK (part_a_total BETWEEN 0 AND 20 AND part_bc_total BETWEEN 0 AND 100) NOT VALID;

DO $$
DECLARE c RECORD;
BEGIN
    FOR c IN SELECT conrelid::regclass AS tbl, conname FROM pg_constraint
             WHERE conname IN ('marks_part_a_total_range', 'marks_part_bc_total_range', 'marks_array_lengths',
                               'result_records_total_range',
                               'result_records_grade_points_range', 'result_records_parts_range') LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %s VALIDATE CONSTRAINT %I', c.tbl, c.conname);
        EXCEPTION WHEN check_violation THEN
            RAISE NOTICE 'Older rows break %; the rule applies to new rows only', c.conname;
        END;
    END LOOP;
END $$;
