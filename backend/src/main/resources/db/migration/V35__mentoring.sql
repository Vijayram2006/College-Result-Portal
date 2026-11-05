-- Mentoring: the HOD allots each student a faculty mentor (by hand or automatically, in batches); the Associate Dean
-- approves the allotment. Mentors record their sessions; students raise concerns, which the mentor answers or
-- escalates to the HOD; a student may ask the HOD for a change of mentor.
CREATE TABLE mentor_allocations (
    id               BIGSERIAL    PRIMARY KEY,
    reg_no           VARCHAR(30)  NOT NULL UNIQUE REFERENCES students (reg_no) ON DELETE CASCADE,
    faculty_user_id  BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    dept_key         VARCHAR(10)  NOT NULL REFERENCES departments (dept_key),
    semester         SMALLINT     NOT NULL,
    academic_year    VARCHAR(20)  NOT NULL,
    status           VARCHAR(30)  NOT NULL DEFAULT 'PENDING_ADEAN_APPROVAL'
        CHECK (status IN ('PENDING_ADEAN_APPROVAL', 'APPROVED', 'REJECTED')),
    batch_id         VARCHAR(40)  NOT NULL,
    assigned_by      VARCHAR(120) NOT NULL,
    adean_remarks    VARCHAR(500),
    reviewed_by      VARCHAR(120),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    approved_at      TIMESTAMPTZ
);
CREATE INDEX idx_mentor_allocations_faculty ON mentor_allocations (faculty_user_id, status);
CREATE INDEX idx_mentor_allocations_batch ON mentor_allocations (batch_id);

CREATE TABLE mentoring_sessions (
    id                 BIGSERIAL    PRIMARY KEY,
    faculty_user_id    BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    reg_no             VARCHAR(30)  NOT NULL REFERENCES students (reg_no) ON DELETE CASCADE,
    session_date       DATE         NOT NULL,
    session_type       VARCHAR(20)  NOT NULL,
    meeting_mode       VARCHAR(20)  NOT NULL,
    topics_discussed   VARCHAR(1000) NOT NULL,
    guidance_notes     VARCHAR(2000) NOT NULL,
    action_items       VARCHAR(1000),
    next_review_date   DATE,
    attendance_status  VARCHAR(20)  NOT NULL DEFAULT 'ATTENDED',
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_mentoring_sessions_student ON mentoring_sessions (reg_no, session_date);

CREATE TABLE mentoring_concerns (
    id                      BIGSERIAL    PRIMARY KEY,
    reg_no                  VARCHAR(30)  NOT NULL REFERENCES students (reg_no) ON DELETE CASCADE,
    faculty_user_id         BIGINT       REFERENCES users (id) ON DELETE SET NULL,
    title                   VARCHAR(200) NOT NULL,
    category                VARCHAR(20)  NOT NULL,
    description             VARCHAR(2000) NOT NULL,
    status                  VARCHAR(20)  NOT NULL DEFAULT 'SUBMITTED'
        CHECK (status IN ('SUBMITTED', 'IN_REVIEW', 'RESOLVED', 'ESCALATED_TO_HOD')),
    mentor_response         VARCHAR(2000),
    hod_remarks             VARCHAR(2000),
    reason                  VARCHAR(200),     -- mentor change requests
    queries_about_mentor    VARCHAR(2000),
    preferred_mentor_notes  VARCHAR(1000),
    escalated_at            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_mentoring_concerns_student ON mentoring_concerns (reg_no);

-- Co-curricular and extra-curricular record of a student (shown on the mentee profile)
CREATE TABLE student_activities (
    id             BIGSERIAL    PRIMARY KEY,
    reg_no         VARCHAR(30)  NOT NULL REFERENCES students (reg_no) ON DELETE CASCADE,
    activity_type  VARCHAR(30)  NOT NULL,
    title          VARCHAR(200) NOT NULL,
    organization   VARCHAR(200) NOT NULL DEFAULT '',
    achievement    VARCHAR(200) NOT NULL DEFAULT '',
    academic_year  VARCHAR(20)  NOT NULL,
    event_date     DATE         NOT NULL
);
CREATE INDEX idx_student_activities_student ON student_activities (reg_no);
