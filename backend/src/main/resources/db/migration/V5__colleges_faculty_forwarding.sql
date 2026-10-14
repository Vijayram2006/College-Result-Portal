-- Three colleges share the portal; each Controller of Examinations (COE) sees only its own college's data.
ALTER TABLE departments
    ADD COLUMN college_key VARCHAR(20) NOT NULL DEFAULT 'engineering'
        CHECK (college_key IN ('engineering', 'nursing', 'pharmacy')),
    ADD COLUMN code        VARCHAR(20),
    ADD COLUMN head_name   VARCHAR(120),
    ADD COLUMN status      VARCHAR(10) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE'));
UPDATE departments SET code = upper(dept_key) WHERE code IS NULL;

-- COE logins carry their college; HOD / faculty / student logins get it from their department.
ALTER TABLE users ADD COLUMN college_key VARCHAR(20)
    CHECK (college_key IS NULL OR college_key IN ('engineering', 'nursing', 'pharmacy'));
UPDATE users SET college_key = 'engineering' WHERE role = 'ADMIN';

-- Faculty sign in to the main portal to enter marks and forward them to the COE.
ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('ADMIN', 'HOD', 'STUDENT', 'FACULTY'));

-- VALIDATED = forwarded by faculty, awaiting the COE. The COE publishes a whole department at once.
ALTER TABLE result_batches DROP CONSTRAINT result_batches_status_check;
ALTER TABLE result_batches ADD CONSTRAINT result_batches_status_check
    CHECK (status IN ('DRAFT', 'VALIDATED', 'PUBLISHED'));
ALTER TABLE result_batches
    ADD COLUMN forwarded_by VARCHAR(200),
    ADD COLUMN forwarded_at TIMESTAMPTZ;
-- Batches published before forwarding existed count as forwarded when they were committed.
UPDATE result_batches SET forwarded_by = uploaded_by, forwarded_at = uploaded_at WHERE forwarded_at IS NULL;
-- An unpublished batch used to go back to DRAFT; it now stays forwarded (awaiting the COE).
UPDATE result_batches SET status = 'VALIDATED' WHERE status = 'DRAFT';

ALTER TABLE audit_logs ADD COLUMN college_key VARCHAR(20) NOT NULL DEFAULT 'engineering';
