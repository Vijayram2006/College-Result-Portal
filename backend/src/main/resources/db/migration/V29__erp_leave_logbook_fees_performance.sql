-- KVELL ERP, team components: class in-charge, leave approval, logbook & subject completion, fees (Accounts) and
-- faculty performance. Defaults for the open questions (leave types and balances, edit window, measure weights) are
-- seeded here and can be changed from the screens.

-- ---------------------------------------------------------------- Accounts role (signs in to the officers panel)
ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'HOD', 'STUDENT', 'FACULTY',
    'DEAN', 'ADMISSION', 'ACCOUNTS'));
-- Accounts staff enter concessions and refunds; the Accounts head approves them (maker-checker)
ALTER TABLE users ADD COLUMN accounts_head BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE notifications DROP CONSTRAINT notifications_audience_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_audience_check
    CHECK (audience IN ('COE', 'HOD', 'FACULTY', 'STUDENT', 'DEAN', 'ACCOUNTS'));

-- Students belong to a section of their class; parents get fee messages
ALTER TABLE students ADD COLUMN section VARCHAR(5) NOT NULL DEFAULT 'A';
ALTER TABLE students ADD COLUMN parent_phone VARCHAR(15);

-- Small settings (edit window, reminder days, ...)
CREATE TABLE erp_settings (
    key         VARCHAR(60)  PRIMARY KEY,
    value       VARCHAR(200) NOT NULL,
    updated_by  VARCHAR(160) NOT NULL DEFAULT 'system',
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
INSERT INTO erp_settings (key, value) VALUES
    ('logbook.edit_days', '3'),          -- days a logbook entry can be edited before it locks
    ('logbook.missed_days', '2'),        -- working days without an entry before the reminder
    ('fees.test_gateway', 'true');       -- local testing: a simulated gateway confirms payments

-- ---------------------------------------------------------------- class in-charge (an assignment, not a role)
CREATE TABLE class_incharge (
    id              BIGSERIAL    PRIMARY KEY,
    faculty_user_id BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    dept_key        VARCHAR(10)  NOT NULL REFERENCES departments (dept_key),
    batch           VARCHAR(10),
    semester        SMALLINT     NOT NULL CHECK (semester BETWEEN 1 AND 8),
    section         VARCHAR(5)   NOT NULL,
    academic_year   VARCHAR(20)  NOT NULL,
    from_date       DATE         NOT NULL DEFAULT current_date,
    to_date         DATE,                       -- NULL = currently in-charge
    temporary       BOOLEAN      NOT NULL DEFAULT FALSE, -- stands in while the in-charge is on leave
    assigned_by     VARCHAR(160) NOT NULL,
    assigned_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CHECK (to_date IS NULL OR to_date >= from_date)
);
-- One regular in-charge per class at a time (old rows keep a to_date, so history stays)
CREATE UNIQUE INDEX uq_class_incharge_current ON class_incharge (dept_key, semester, section, academic_year)
    WHERE to_date IS NULL AND NOT temporary;
CREATE INDEX idx_class_incharge_faculty ON class_incharge (faculty_user_id);

-- ---------------------------------------------------------------- leave approval
CREATE TABLE leave_types (
    code             VARCHAR(10)  PRIMARY KEY,
    name             VARCHAR(60)  NOT NULL,
    applies_to       VARCHAR(10)  NOT NULL CHECK (applies_to IN ('STUDENT', 'STAFF', 'BOTH')),
    yearly_days      NUMERIC(4, 1),             -- NULL = no yearly limit
    needs_attachment BOOLEAN      NOT NULL DEFAULT FALSE,
    active           BOOLEAN      NOT NULL DEFAULT TRUE
);
INSERT INTO leave_types (code, name, applies_to, yearly_days, needs_attachment) VALUES
    ('CL', 'Casual leave', 'STAFF', 12, FALSE),
    ('ML', 'Medical leave', 'STAFF', 10, TRUE),
    ('OD', 'On duty', 'BOTH', NULL, FALSE),
    ('SL', 'Sick leave', 'STUDENT', NULL, FALSE),
    ('PL', 'Personal leave', 'STUDENT', NULL, FALSE);

CREATE TABLE leave_balances (
    user_id        BIGINT        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    leave_code     VARCHAR(10)   NOT NULL REFERENCES leave_types (code),
    academic_year  VARCHAR(20)   NOT NULL,
    allowed        NUMERIC(4, 1) NOT NULL,
    used           NUMERIC(4, 1) NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, leave_code, academic_year)
);

CREATE TABLE leave_requests (
    id               BIGSERIAL     PRIMARY KEY,
    applicant_id     BIGINT        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    applicant_role   VARCHAR(13)   NOT NULL,
    dept_key         VARCHAR(10)   REFERENCES departments (dept_key),
    reg_no           VARCHAR(30)   REFERENCES students (reg_no) ON DELETE CASCADE,
    leave_code       VARCHAR(10)   NOT NULL REFERENCES leave_types (code),
    from_date        DATE          NOT NULL,
    to_date          DATE          NOT NULL,
    half_day         VARCHAR(2)    CHECK (half_day IN ('FN', 'AN')), -- forenoon / afternoon; NULL = full days
    days             NUMERIC(5, 1) NOT NULL,
    reason           VARCHAR(500)  NOT NULL,
    attachment       BYTEA,
    attachment_name  VARCHAR(160),
    attachment_type  VARCHAR(60),
    academic_year    VARCHAR(20)   NOT NULL,
    approver_role    VARCHAR(20)   NOT NULL CHECK (approver_role IN ('CLASS_INCHARGE', 'HOD', 'DEAN')),
    status           VARCHAR(10)   NOT NULL DEFAULT 'PENDING'
                         CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
    decided_by       VARCHAR(160),
    decided_at       TIMESTAMPTZ,
    decision_remarks VARCHAR(500),
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CHECK (to_date >= from_date)
);
CREATE INDEX idx_leave_requests_applicant ON leave_requests (applicant_id, created_at DESC);
CREATE INDEX idx_leave_requests_pending ON leave_requests (approver_role, dept_key) WHERE status = 'PENDING';

CREATE TABLE leave_actions (
    id          BIGSERIAL    PRIMARY KEY,
    request_id  BIGINT       NOT NULL REFERENCES leave_requests (id) ON DELETE CASCADE,
    action      VARCHAR(20)  NOT NULL,
    actor       VARCHAR(160) NOT NULL,
    remarks     VARCHAR(500),
    at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- A faculty member's approved leave: a substitute suggested for each subject on each leave day
CREATE TABLE class_substitutions (
    id                  BIGSERIAL   PRIMARY KEY,
    request_id          BIGINT      NOT NULL REFERENCES leave_requests (id) ON DELETE CASCADE,
    class_date          DATE        NOT NULL,
    dept_key            VARCHAR(10) NOT NULL,
    semester            SMALLINT    NOT NULL,
    subject_code        VARCHAR(20) NOT NULL,
    substitute_user_id  BIGINT      REFERENCES users (id) ON DELETE SET NULL,
    status              VARCHAR(10) NOT NULL DEFAULT 'SUGGESTED' CHECK (status IN ('SUGGESTED', 'CONFIRMED')),
    UNIQUE (request_id, class_date, subject_code)
);

-- ---------------------------------------------------------------- logbook & subject completion
CREATE TABLE syllabus_units (
    id             BIGSERIAL    PRIMARY KEY,
    dept_key       VARCHAR(10)  NOT NULL REFERENCES departments (dept_key),
    semester       SMALLINT     NOT NULL CHECK (semester BETWEEN 1 AND 8),
    subject_code   VARCHAR(20)  NOT NULL,
    unit_no        SMALLINT     NOT NULL CHECK (unit_no BETWEEN 1 AND 20),
    title          VARCHAR(200) NOT NULL,
    planned_hours  SMALLINT     NOT NULL DEFAULT 9 CHECK (planned_hours BETWEEN 0 AND 200),
    UNIQUE (dept_key, semester, subject_code, unit_no)
);

CREATE TABLE syllabus_topics (
    id            BIGSERIAL    PRIMARY KEY,
    unit_id       BIGINT       NOT NULL REFERENCES syllabus_units (id) ON DELETE CASCADE,
    topic_no      SMALLINT     NOT NULL,
    title         VARCHAR(300) NOT NULL,
    planned_date  DATE,                           -- when the plan says it should be covered
    UNIQUE (unit_id, topic_no)
);

CREATE TABLE logbook_entries (
    id            BIGSERIAL    PRIMARY KEY,
    dept_key      VARCHAR(10)  NOT NULL REFERENCES departments (dept_key),
    semester      SMALLINT     NOT NULL,
    section       VARCHAR(5)   NOT NULL DEFAULT 'A',
    subject_code  VARCHAR(20)  NOT NULL,
    faculty_id    BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    entry_date    DATE         NOT NULL,
    period        SMALLINT     NOT NULL CHECK (period BETWEEN 1 AND 10),
    topic_id      BIGINT       REFERENCES syllabus_topics (id) ON DELETE SET NULL,
    topic_text    VARCHAR(300) NOT NULL,
    method        VARCHAR(40)  NOT NULL,
    remarks       VARCHAR(500),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (dept_key, semester, section, subject_code, entry_date, period)
);
CREATE INDEX idx_logbook_subject ON logbook_entries (dept_key, semester, subject_code, entry_date);
CREATE INDEX idx_logbook_faculty ON logbook_entries (faculty_id, entry_date);

-- Reminders already sent (so each is sent once a day)
CREATE TABLE erp_reminders (
    kind       VARCHAR(30)  NOT NULL,
    ref        VARCHAR(120) NOT NULL,
    sent_on    DATE         NOT NULL DEFAULT current_date,
    PRIMARY KEY (kind, ref, sent_on)
);

-- ---------------------------------------------------------------- fees (Accounts)
CREATE TABLE fee_heads (
    id        BIGSERIAL    PRIMARY KEY,
    code      VARCHAR(20)  NOT NULL UNIQUE,
    name      VARCHAR(120) NOT NULL,
    category  VARCHAR(20)  NOT NULL DEFAULT 'ACADEMIC' CHECK (category IN ('ACADEMIC', 'EXAM', 'BUS', 'HOSTEL', 'OTHER')),
    active    BOOLEAN      NOT NULL DEFAULT TRUE
);
INSERT INTO fee_heads (code, name, category) VALUES
    ('TUITION', 'Tuition fee', 'ACADEMIC'),
    ('EXAM', 'Examination fee', 'EXAM'),
    ('BUS', 'Bus fee', 'BUS');

CREATE TABLE fee_structures (
    id             BIGSERIAL    PRIMARY KEY,
    dept_key       VARCHAR(10)  NOT NULL REFERENCES departments (dept_key),
    study_year     SMALLINT     NOT NULL CHECK (study_year BETWEEN 1 AND 5),
    batch          VARCHAR(10),
    academic_year  VARCHAR(20)  NOT NULL,
    title          VARCHAR(160) NOT NULL,
    due_date       DATE         NOT NULL,
    status         VARCHAR(10)  NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED')),
    created_by     VARCHAR(160) NOT NULL,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    published_at   TIMESTAMPTZ,
    UNIQUE (dept_key, study_year, academic_year)
);

CREATE TABLE fee_structure_items (
    structure_id  BIGINT         NOT NULL REFERENCES fee_structures (id) ON DELETE CASCADE,
    head_id       BIGINT         NOT NULL REFERENCES fee_heads (id),
    amount        NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    PRIMARY KEY (structure_id, head_id)
);

-- What each student owes, per fee head (raised when a structure is published)
CREATE TABLE fee_demands (
    id            BIGSERIAL      PRIMARY KEY,
    reg_no        VARCHAR(30)    NOT NULL REFERENCES students (reg_no) ON DELETE CASCADE,
    structure_id  BIGINT         NOT NULL REFERENCES fee_structures (id) ON DELETE CASCADE,
    head_id       BIGINT         NOT NULL REFERENCES fee_heads (id),
    amount        NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    concession    NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (concession >= 0),
    paid          NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (paid >= 0),
    due_date      DATE           NOT NULL,
    created_at    TIMESTAMPTZ    NOT NULL DEFAULT now(),
    UNIQUE (reg_no, structure_id, head_id),
    CHECK (paid + concession <= amount)
);
CREATE INDEX idx_fee_demands_student ON fee_demands (reg_no);

-- A payment counts only when the gateway confirms it (status PAID, set by the webhook)
CREATE TABLE fee_payments (
    id                  BIGSERIAL      PRIMARY KEY,
    reg_no              VARCHAR(30)    NOT NULL REFERENCES students (reg_no) ON DELETE CASCADE,
    amount              NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    gateway             VARCHAR(20)    NOT NULL,
    gateway_order_id    VARCHAR(80)    NOT NULL UNIQUE,
    gateway_payment_id  VARCHAR(80),
    status              VARCHAR(10)    NOT NULL DEFAULT 'CREATED' CHECK (status IN ('CREATED', 'PAID', 'FAILED')),
    receipt_no          VARCHAR(30)    UNIQUE,
    allocation          JSONB          NOT NULL DEFAULT '[]', -- [{demandId, amount}]
    refunded            NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ    NOT NULL DEFAULT now(),
    paid_at             TIMESTAMPTZ
);
CREATE INDEX idx_fee_payments_student ON fee_payments (reg_no, created_at DESC);

CREATE TABLE fee_concessions (
    id            BIGSERIAL      PRIMARY KEY,
    reg_no        VARCHAR(30)    NOT NULL REFERENCES students (reg_no) ON DELETE CASCADE,
    demand_id     BIGINT         NOT NULL REFERENCES fee_demands (id) ON DELETE CASCADE,
    kind          VARCHAR(12)    NOT NULL DEFAULT 'CONCESSION' CHECK (kind IN ('CONCESSION', 'SCHOLARSHIP')),
    amount        NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    reason        VARCHAR(500)   NOT NULL,
    status        VARCHAR(10)    NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    requested_by  VARCHAR(60)    NOT NULL,
    requested_at  TIMESTAMPTZ    NOT NULL DEFAULT now(),
    decided_by    VARCHAR(60),
    decided_at    TIMESTAMPTZ
);

CREATE TABLE fee_refunds (
    id            BIGSERIAL      PRIMARY KEY,
    reg_no        VARCHAR(30)    NOT NULL REFERENCES students (reg_no) ON DELETE CASCADE,
    payment_id    BIGINT         NOT NULL REFERENCES fee_payments (id),
    amount        NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    reason        VARCHAR(500)   NOT NULL,
    status        VARCHAR(10)    NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    requested_by  VARCHAR(60)    NOT NULL,
    requested_at  TIMESTAMPTZ    NOT NULL DEFAULT now(),
    decided_by    VARCHAR(60),
    decided_at    TIMESTAMPTZ
);

-- Messages for parents (WhatsApp); a sender picks them up once a provider is configured
CREATE TABLE message_outbox (
    id          BIGSERIAL    PRIMARY KEY,
    channel     VARCHAR(10)  NOT NULL CHECK (channel IN ('WHATSAPP', 'SMS')),
    to_phone    VARCHAR(15)  NOT NULL,
    body        VARCHAR(1000) NOT NULL,
    status      VARCHAR(10)  NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED')),
    ref         VARCHAR(60),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    sent_at     TIMESTAMPTZ
);

-- ---------------------------------------------------------------- faculty performance
CREATE TABLE performance_measures (
    code         VARCHAR(20)   PRIMARY KEY,
    name         VARCHAR(80)   NOT NULL,
    description  VARCHAR(300)  NOT NULL,
    weight       NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (weight >= 0),
    sort_order   SMALLINT      NOT NULL,
    updated_by   VARCHAR(160)  NOT NULL DEFAULT 'system',
    updated_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
);
INSERT INTO performance_measures (code, name, description, weight, sort_order) VALUES
    ('PASS_PCT', 'Subject pass %', 'Pass percentage of the End Semester marks of the faculty member''s subjects', 25, 1),
    ('INTERNAL_AVG', 'Internal marks average', 'Average IAT mark (out of 100) of their subjects', 10, 2),
    ('SYLLABUS', 'Syllabus completion %', 'Topics covered in the logbook out of the planned topics', 20, 3),
    ('LOGBOOK', 'Logbook regularity', 'Working days with a logbook entry, out of the working days of the term so far', 15, 4),
    ('LEAVE', 'Leave taken', '100 minus 5 for every approved leave day (on duty not counted)', 10, 5),
    ('MARKS_ON_TIME', 'Marks submitted', 'Subjects whose marks were forwarded to the COE, out of their subjects', 10, 6),
    ('FEEDBACK', 'Student feedback', 'Students'' exit-survey ratings of their subjects, as a percentage of 5', 10, 7),
    ('RESEARCH', 'Research papers', 'No research data in the ERP yet; counted once the research module exists', 0, 8);

-- One scorecard per faculty member and term, calculated by the ERP (nobody types in scores)
CREATE TABLE performance_reviews (
    id             BIGSERIAL     PRIMARY KEY,
    user_id        BIGINT        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    academic_year  VARCHAR(20)   NOT NULL,
    term           VARCHAR(4)    NOT NULL CHECK (term IN ('ODD', 'EVEN')),
    scores         JSONB         NOT NULL DEFAULT '{}',
    total          NUMERIC(5, 1) NOT NULL DEFAULT 0,
    computed_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
    hod_remarks    VARCHAR(1000),
    hod_by         VARCHAR(160),
    hod_at         TIMESTAMPTZ,
    dean_remarks   VARCHAR(1000),
    dean_by        VARCHAR(160),
    dean_at        TIMESTAMPTZ,
    UNIQUE (user_id, academic_year, term)
);
