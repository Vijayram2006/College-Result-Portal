-- Circulars: the Associate Dean (or Dean) and the COE issue circulars to departments; a COE circular may need the
-- Dean's approval first. Each HOD keeps a circular for the department or forwards it to the faculty and/or students.
CREATE TABLE circulars (
    id                     BIGSERIAL     PRIMARY KEY,
    college_key            VARCHAR(20)   NOT NULL,
    ref_no                 VARCHAR(40)   NOT NULL UNIQUE,
    subject                VARCHAR(300)  NOT NULL,
    message                TEXT          NOT NULL,
    category               VARCHAR(20)   NOT NULL DEFAULT 'ACADEMIC',
    priority               VARCHAR(10)   NOT NULL DEFAULT 'NORMAL',
    status                 VARCHAR(30)   NOT NULL DEFAULT 'PUBLISHED'
        CHECK (status IN ('PUBLISHED', 'PENDING_DEAN_APPROVAL', 'APPROVED_BY_DEAN', 'REJECTED', 'SCHEDULED', 'DRAFT', 'DELETED')),
    target_audiences       JSONB         NOT NULL DEFAULT '["HOD"]',
    requires_dean_approval BOOLEAN       NOT NULL DEFAULT FALSE,
    submission_notes       VARCHAR(1000),
    approval_remarks       VARCHAR(1000),
    approved_by            JSONB,
    approved_at            TIMESTAMPTZ,
    created_by_user_id     BIGINT        REFERENCES users (id) ON DELETE SET NULL,
    created_by_name        VARCHAR(120)  NOT NULL,
    created_by_role        VARCHAR(20)   NOT NULL,
    routing_option         VARCHAR(20)   NOT NULL DEFAULT 'ALL_DEPTS',
    target_department_keys JSONB         NOT NULL DEFAULT '[]',
    target_faculty_ids     JSONB         NOT NULL DEFAULT '[]',
    target_faculty_names   JSONB         NOT NULL DEFAULT '[]',
    hod_actions            JSONB         NOT NULL DEFAULT '{}',
    attachments            JSONB         NOT NULL DEFAULT '[]',
    seen_by_coe            BOOLEAN       NOT NULL DEFAULT FALSE,
    seen_at                TIMESTAMPTZ,
    coe_reply              VARCHAR(2000),
    coe_reply_at           TIMESTAMPTZ,
    scheduled_for          TIMESTAMPTZ,
    deleted_by             JSONB,
    deleted_at             TIMESTAMPTZ,
    created_at             TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_circulars_college ON circulars (college_key, status, created_at DESC);

-- Grievances: a student writes to a faculty member (class in-charge, subject faculty or mentor) or the HOD. The
-- handler approves, rejects or forwards it (faculty -> HOD -> Associate Dean); after 48 hours without action it moves
-- up by itself.
CREATE TABLE grievances (
    id                       BIGSERIAL     PRIMARY KEY,
    ref_id                   VARCHAR(30)   NOT NULL UNIQUE,
    reg_no                   VARCHAR(30)   NOT NULL REFERENCES students (reg_no) ON DELETE CASCADE,
    dept_key                 VARCHAR(10)   NOT NULL REFERENCES departments (dept_key),
    subject                  VARCHAR(200)  NOT NULL,
    description              VARCHAR(4000) NOT NULL,
    attachment               BYTEA,
    attachment_name          VARCHAR(200),
    attachment_type          VARCHAR(100),
    attachment_size          INTEGER,
    sent_to_role             VARCHAR(10)   NOT NULL CHECK (sent_to_role IN ('FACULTY', 'HOD')),
    sent_to_user_id          BIGINT        REFERENCES users (id) ON DELETE SET NULL,
    sent_to_name             VARCHAR(120)  NOT NULL,
    recipient_category       VARCHAR(20),
    current_handler_role     VARCHAR(10)   NOT NULL CHECK (current_handler_role IN ('FACULTY', 'HOD', 'DEAN')),
    current_handler_user_id  BIGINT        REFERENCES users (id) ON DELETE SET NULL,
    current_handler_name     VARCHAR(120)  NOT NULL,
    status                   VARCHAR(10)   NOT NULL DEFAULT 'WAITING' CHECK (status IN ('WAITING', 'APPROVED', 'REJECTED')),
    handler_received_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    auto_forwarded           BOOLEAN       NOT NULL DEFAULT FALSE,
    reached_hod              BOOLEAN       NOT NULL DEFAULT FALSE,
    reached_dean             BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
    resolved_at              TIMESTAMPTZ
);
CREATE INDEX idx_grievances_dept ON grievances (dept_key, status);
CREATE INDEX idx_grievances_student ON grievances (reg_no);

CREATE TABLE grievance_remarks (
    id            BIGSERIAL     PRIMARY KEY,
    grievance_id  BIGINT        NOT NULL REFERENCES grievances (id) ON DELETE CASCADE,
    by_name       VARCHAR(120)  NOT NULL,
    role          VARCHAR(20)   NOT NULL,
    text          VARCHAR(2000) NOT NULL,
    at            TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_grievance_remarks ON grievance_remarks (grievance_id, at);
