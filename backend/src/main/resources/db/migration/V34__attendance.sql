-- Attendance: the subject faculty mark each class period; at the end of the month they submit the month's register,
-- the HOD approves it and the Associate Dean approves it (then the students see it).
CREATE TABLE attendance_batches (
    batch_id         VARCHAR(80)  PRIMARY KEY,        -- ATT-<dept>-<sem>-<subject>-<yyyy>-<mm>
    dept_key         VARCHAR(10)  NOT NULL REFERENCES departments (dept_key),
    semester         SMALLINT     NOT NULL CHECK (semester BETWEEN 1 AND 8),
    subject_code     VARCHAR(20)  NOT NULL,
    year             SMALLINT     NOT NULL,
    month            SMALLINT     NOT NULL CHECK (month BETWEEN 1 AND 12),
    faculty_user_id  BIGINT       REFERENCES users (id) ON DELETE SET NULL,
    faculty_name     VARCHAR(120) NOT NULL,
    status           VARCHAR(20)  NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'SUBMITTED_TO_HOD', 'HOD_APPROVED', 'ADEAN_APPROVED', 'REJECTED_BY_HOD', 'REJECTED_BY_ADEAN')),
    submitted_at     TIMESTAMPTZ,
    hod_name         VARCHAR(120),
    hod_action_at    TIMESTAMPTZ,
    hod_remarks      VARCHAR(500),
    adean_name       VARCHAR(120),
    adean_action_at  TIMESTAMPTZ,
    adean_remarks    VARCHAR(500),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (dept_key, semester, subject_code, year, month)
);
CREATE INDEX idx_attendance_batches_status ON attendance_batches (status, dept_key);

CREATE TABLE attendance_records (
    id               BIGSERIAL    PRIMARY KEY,
    batch_id         VARCHAR(80)  NOT NULL REFERENCES attendance_batches (batch_id) ON DELETE CASCADE,
    reg_no           VARCHAR(30)  NOT NULL REFERENCES students (reg_no) ON DELETE CASCADE,
    attendance_date  DATE         NOT NULL,
    session_slot     VARCHAR(60)  NOT NULL,
    status           VARCHAR(10)  NOT NULL CHECK (status IN ('PRESENT', 'ABSENT', 'ON_DUTY')),
    remark           VARCHAR(200),
    marked_by        VARCHAR(120) NOT NULL,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (batch_id, attendance_date, session_slot, reg_no)
);
CREATE INDEX idx_attendance_records_student ON attendance_records (reg_no, status);

INSERT INTO erp_settings (key, value) VALUES
    ('attendance.eligible_pct', '75'),     -- at or above: eligible for the end-semester exam
    ('attendance.condonation_pct', '65')   -- at or above (below eligible): eligible after condonation
ON CONFLICT (key) DO NOTHING;
