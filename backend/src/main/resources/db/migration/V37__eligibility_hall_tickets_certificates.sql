-- Exam eligibility: below the attendance requirement a student may be condoned on paying a fine; the COE sets the
-- fine for each attendance band and records the receipt.
CREATE TABLE eligibility_fine_slabs (
    id           BIGSERIAL     PRIMARY KEY,
    college_key  VARCHAR(20)   NOT NULL,
    min_pct      NUMERIC(5, 2) NOT NULL CHECK (min_pct >= 0),
    max_pct      NUMERIC(5, 2) NOT NULL CHECK (max_pct <= 100),
    fine_amount  NUMERIC(10, 2) NOT NULL CHECK (fine_amount >= 0),
    CHECK (min_pct < max_pct)
);
INSERT INTO eligibility_fine_slabs (college_key, min_pct, max_pct, fine_amount)
SELECT c, v.min_pct, v.max_pct, v.fine FROM (VALUES ('engineering'), ('nursing'), ('pharmacy')) AS k (c)
CROSS JOIN (VALUES (70.00, 75.00, 500.00), (65.00, 70.00, 1000.00)) AS v (min_pct, max_pct, fine);

CREATE TABLE eligibility_fine_payments (
    id           BIGSERIAL     PRIMARY KEY,
    reg_no       VARCHAR(30)   NOT NULL REFERENCES students (reg_no) ON DELETE CASCADE,
    semester     SMALLINT      NOT NULL,
    amount       NUMERIC(10, 2) NOT NULL,
    receipt_no   VARCHAR(40)   NOT NULL,
    recorded_by  VARCHAR(120)  NOT NULL,
    paid_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    UNIQUE (reg_no, semester)
);

-- Certificate requests: the student applies, the HOD approves (or rejects) and forwards it to the Administrative Office
CREATE TABLE certificate_requests (
    id                BIGSERIAL     PRIMARY KEY,
    reg_no            VARCHAR(30)   NOT NULL REFERENCES students (reg_no) ON DELETE CASCADE,
    certificate_type  VARCHAR(30)   NOT NULL CHECK (certificate_type IN ('BONAFIDE', 'MARKSHEET_10', 'MARKSHEET_12', 'TRANSFER_CERTIFICATE')),
    purpose           VARCHAR(500),
    status            VARCHAR(20)   NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'HOD_APPROVED', 'REJECTED_BY_HOD', 'FORWARDED_TO_AO')),
    hod_remarks       VARCHAR(500),
    hod_action_by     VARCHAR(120),
    hod_action_at     TIMESTAMPTZ,
    forwarded_by      VARCHAR(120),
    forwarded_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_certificate_requests_student ON certificate_requests (reg_no);

-- Hall tickets. A template (layout, exam title, centre, notes, signatures, logo) is kept per cohort (academic year,
-- batch, department, year, semester); fixing it saves a version. Tickets are generated from the fixed template,
-- reviewed by the COE, then published to the students.
CREATE TABLE hall_ticket_templates (
    id             BIGSERIAL     PRIMARY KEY,
    college_key    VARCHAR(20)   NOT NULL,
    academic_year  VARCHAR(20)   NOT NULL,
    batch          VARCHAR(20)   NOT NULL,
    template_name  VARCHAR(80)   NOT NULL,
    dept_key       VARCHAR(10)   NOT NULL DEFAULT '',
    year_label     VARCHAR(20)   NOT NULL DEFAULT '',
    semester       SMALLINT      NOT NULL DEFAULT 0,
    body           JSONB         NOT NULL,
    status         VARCHAR(10)   NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'FIXED')),
    version        INTEGER       NOT NULL DEFAULT 0,
    fixed_by       VARCHAR(120),
    fixed_at       TIMESTAMPTZ,
    updated_by     VARCHAR(120),
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    UNIQUE (college_key, academic_year, batch, dept_key, year_label, semester, template_name)
);

CREATE TABLE hall_ticket_template_versions (
    id              BIGSERIAL     PRIMARY KEY,
    template_id     BIGINT        NOT NULL REFERENCES hall_ticket_templates (id) ON DELETE CASCADE,
    version_number  INTEGER       NOT NULL,
    body            JSONB         NOT NULL,
    source          VARCHAR(40),
    fixed_by        VARCHAR(120),
    fixed_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    UNIQUE (template_id, version_number)
);

CREATE TABLE hall_tickets (
    id                BIGSERIAL     PRIMARY KEY,
    college_key       VARCHAR(20)   NOT NULL,
    reg_no            VARCHAR(30)   NOT NULL REFERENCES students (reg_no) ON DELETE CASCADE,
    academic_year     VARCHAR(20)   NOT NULL,
    batch             VARCHAR(20)   NOT NULL,
    dept_key          VARCHAR(10)   NOT NULL REFERENCES departments (dept_key),
    year_label        VARCHAR(20)   NOT NULL DEFAULT '',
    semester          SMALLINT      NOT NULL,
    hall_ticket_no    VARCHAR(40)   NOT NULL UNIQUE,
    template_id       BIGINT        REFERENCES hall_ticket_templates (id) ON DELETE SET NULL,
    template_version  INTEGER       NOT NULL,
    exam_title        VARCHAR(200)  NOT NULL,
    exam_centre       VARCHAR(200)  NOT NULL,
    papers            JSONB         NOT NULL DEFAULT '[]',
    status            VARCHAR(20)   NOT NULL DEFAULT 'GENERATED'
        CHECK (status IN ('GENERATED', 'PUBLISHED', 'BLOCKED_FEES', 'SUPERSEDED', 'WITHDRAWN')),
    published_by      VARCHAR(120),
    published_at      TIMESTAMPTZ,
    withdrawn_by      VARCHAR(120),
    withdrawn_at      TIMESTAMPTZ,
    withdraw_reason   VARCHAR(500),
    restored_by       VARCHAR(120),
    restored_at       TIMESTAMPTZ,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    UNIQUE (reg_no, academic_year, batch, semester)
);
CREATE INDEX idx_hall_tickets_cohort ON hall_tickets (college_key, academic_year, batch, dept_key, semester);

CREATE TABLE hall_ticket_reviews (
    college_key       VARCHAR(20)   NOT NULL,
    academic_year     VARCHAR(20)   NOT NULL,
    batch             VARCHAR(20)   NOT NULL,
    dept_key          VARCHAR(10)   NOT NULL,
    semester          SMALLINT      NOT NULL,
    template_version  INTEGER       NOT NULL,
    reviewed_by       VARCHAR(120)  NOT NULL,
    reviewed_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
    PRIMARY KEY (college_key, academic_year, batch, dept_key, semester)
);

CREATE TABLE hall_ticket_queries (
    id              BIGSERIAL     PRIMARY KEY,
    hall_ticket_id  BIGINT        NOT NULL REFERENCES hall_tickets (id) ON DELETE CASCADE,
    reg_no          VARCHAR(30)   NOT NULL REFERENCES students (reg_no) ON DELETE CASCADE,
    message         VARCHAR(500)  NOT NULL,
    status          VARCHAR(10)   NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESOLVED')),
    coe_response    VARCHAR(1000),
    responded_by    VARCHAR(120),
    responded_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);
