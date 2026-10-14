-- Super Admin (overall university COE): a role above the college COEs, portal gateways and locks stored on the
-- server, officer account details, and student revaluation requests.

ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'HOD', 'STUDENT', 'FACULTY'));
-- 13 characters: SUPER_ADMIN is longer than the original VARCHAR(10)
ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(13);

ALTER TABLE users ADD COLUMN email VARCHAR(160);
-- DEPUTY_COE marks a deputy controller (an ADMIN account with the same rights as the college COE)
ALTER TABLE users ADD COLUMN officer_title VARCHAR(20) CHECK (officer_title IS NULL OR officer_title = 'DEPUTY_COE');
ALTER TABLE users ADD COLUMN last_login_at TIMESTAMPTZ;

-- One row: the whole gateway / lock configuration as JSON (shape of the admin panel's SystemConfig)
CREATE TABLE system_config (
    id          SMALLINT     PRIMARY KEY CHECK (id = 1),
    config      JSONB        NOT NULL,
    updated_by  VARCHAR(200) NOT NULL,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE revaluation_requests (
    id               BIGSERIAL    PRIMARY KEY,
    ref_id           VARCHAR(40)  NOT NULL UNIQUE,
    reg_no           VARCHAR(30)  NOT NULL REFERENCES students (reg_no) ON DELETE CASCADE,
    dept_key         VARCHAR(10)  NOT NULL REFERENCES departments (dept_key),
    semester         SMALLINT     NOT NULL CHECK (semester BETWEEN 1 AND 8),
    assessment_type  VARCHAR(20)  NOT NULL,
    subject_codes    TEXT         NOT NULL,
    fee_per_course   INTEGER      NOT NULL CHECK (fee_per_course >= 0),
    total_fee        INTEGER      NOT NULL CHECK (total_fee >= 0),
    status           VARCHAR(12)  NOT NULL DEFAULT 'SUBMITTED'
                     CHECK (status IN ('SUBMITTED', 'IN_REVIEW', 'COMPLETED', 'REJECTED')),
    note             VARCHAR(500),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by       VARCHAR(200),
    updated_at       TIMESTAMPTZ
);
CREATE INDEX idx_revaluation_dept ON revaluation_requests (dept_key, created_at DESC);
CREATE INDEX idx_revaluation_reg ON revaluation_requests (reg_no);
