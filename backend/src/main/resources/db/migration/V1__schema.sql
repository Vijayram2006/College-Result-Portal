-- KVELL Result Portal schema
-- Flow: admin uploads student data -> creates subjects -> enters question-wise marks -> commits a subject batch,
-- which publishes it to the student and HOD portals.

CREATE TABLE departments (
    dept_key    VARCHAR(10)  PRIMARY KEY,
    name        VARCHAR(120) NOT NULL
);

-- Fixed list used by every admin screen; names match the Subjects page.
INSERT INTO departments (dept_key, name) VALUES
    ('aids', 'Artificial Intelligence & Data Science'),
    ('cse',  'Computer Science & Engineering'),
    ('ece',  'Electronics & Communication Engineering'),
    ('it',   'Information Technology'),
    ('eee',  'Electrical & Electronics Engineering'),
    ('mech', 'Mechanical Engineering');

CREATE TABLE students (
    reg_no         VARCHAR(30)  PRIMARY KEY,
    name           VARCHAR(120) NOT NULL,
    dob            DATE         NOT NULL,  -- students sign in with register number + date of birth
    dept_key       VARCHAR(10)  NOT NULL REFERENCES departments (dept_key),
    category       VARCHAR(10)  NOT NULL CHECK (category IN ('regular', 'lateral')),
    year_label     VARCHAR(20)  NOT NULL,
    semester       SMALLINT     NOT NULL CHECK (semester BETWEEN 1 AND 8),
    academic_year  VARCHAR(20)  NOT NULL,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_students_dept ON students (dept_key, semester);

CREATE TABLE users (
    id             BIGSERIAL    PRIMARY KEY,
    username       VARCHAR(60)  NOT NULL UNIQUE,
    password_hash  VARCHAR(100) NOT NULL,
    role           VARCHAR(10)  NOT NULL CHECK (role IN ('ADMIN', 'HOD', 'STUDENT')),
    display_name   VARCHAR(120) NOT NULL,
    dept_key       VARCHAR(10)  REFERENCES departments (dept_key),
    reg_no         VARCHAR(30)  REFERENCES students (reg_no) ON DELETE CASCADE,
    enabled        BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE subjects (
    id             BIGSERIAL    PRIMARY KEY,
    code           VARCHAR(20)  NOT NULL,
    title          VARCHAR(160) NOT NULL,
    category       VARCHAR(30)  NOT NULL,
    credits        SMALLINT     NOT NULL CHECK (credits BETWEEN 0 AND 20),
    dept_key       VARCHAR(10)  NOT NULL REFERENCES departments (dept_key),
    semester       SMALLINT     NOT NULL CHECK (semester BETWEEN 1 AND 8),
    academic_year  VARCHAR(20)  NOT NULL,
    faculty        VARCHAR(120) NOT NULL,
    status         VARCHAR(20)  NOT NULL CHECK (status IN ('COE FINALIZED', 'PENDING APPROVAL')),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (dept_key, semester, code)
);

-- One answer-script evaluation per student per subject; re-entering marks replaces it.
CREATE TABLE marks (
    id                    BIGSERIAL    PRIMARY KEY,
    dept_key              VARCHAR(10)  NOT NULL REFERENCES departments (dept_key),
    semester              SMALLINT     NOT NULL CHECK (semester BETWEEN 1 AND 8),
    subject_code          VARCHAR(20)  NOT NULL,
    subject_title         VARCHAR(160) NOT NULL,
    reg_no                VARCHAR(30)  NOT NULL REFERENCES students (reg_no) ON DELETE CASCADE,
    assessment_type       VARCHAR(20)  NOT NULL,
    part_a                NUMERIC(4,1)[] NOT NULL,  -- questions 1-10
    part_bc               NUMERIC(4,1)[] NOT NULL,  -- q11..16 x (a,b) x (i,ii,iii), 36 values
    part_a_total          NUMERIC(5,1) NOT NULL,
    part_bc_total         NUMERIC(5,1) NOT NULL,
    grand_total           SMALLINT     NOT NULL CHECK (grand_total BETWEEN 0 AND 100),
    grade                 VARCHAR(2)   NOT NULL,
    passed                BOOLEAN      NOT NULL,
    examiner_name         VARCHAR(120) NOT NULL,
    examiner_designation  VARCHAR(120) NOT NULL,
    entered_by            VARCHAR(60)  NOT NULL,
    entered_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (dept_key, semester, subject_code, reg_no)
);

-- A committed subject: a snapshot of its marks that students and the HOD can see once PUBLISHED.
CREATE TABLE result_batches (
    id               VARCHAR(60)  PRIMARY KEY,
    title            VARCHAR(200) NOT NULL,
    dept_key         VARCHAR(10)  NOT NULL REFERENCES departments (dept_key),
    semester         SMALLINT     NOT NULL CHECK (semester BETWEEN 1 AND 8),
    academic_year    VARCHAR(20)  NOT NULL,
    exam_month_year  VARCHAR(30)  NOT NULL,
    subject_code     VARCHAR(20)  NOT NULL,
    subject_title    VARCHAR(160) NOT NULL,
    status           VARCHAR(10)  NOT NULL CHECK (status IN ('DRAFT', 'PUBLISHED')),
    uploaded_by      VARCHAR(200) NOT NULL,
    uploaded_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    published_by     VARCHAR(120),
    published_at     TIMESTAMPTZ
);

CREATE TABLE result_records (
    id             BIGSERIAL    PRIMARY KEY,
    batch_id       VARCHAR(60)  NOT NULL REFERENCES result_batches (id) ON DELETE CASCADE,
    reg_no         VARCHAR(30)  NOT NULL REFERENCES students (reg_no) ON DELETE CASCADE,
    credits        SMALLINT     NOT NULL,
    part_a_total   NUMERIC(5,1) NOT NULL,
    part_bc_total  NUMERIC(5,1) NOT NULL,
    total          SMALLINT     NOT NULL CHECK (total BETWEEN 0 AND 100),
    grade          VARCHAR(2)   NOT NULL,
    grade_points   SMALLINT     NOT NULL,
    passed         BOOLEAN      NOT NULL,
    UNIQUE (batch_id, reg_no)
);
CREATE INDEX idx_records_reg ON result_records (reg_no);

CREATE TABLE auth_tokens (
    token_hash  CHAR(64)    PRIMARY KEY,
    user_id     BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ NOT NULL
);

CREATE TABLE audit_logs (
    id           BIGSERIAL    PRIMARY KEY,
    actor        VARCHAR(60)  NOT NULL,
    actor_name   VARCHAR(120) NOT NULL,
    action       VARCHAR(40)  NOT NULL,
    target       VARCHAR(200) NOT NULL,
    description  TEXT         NOT NULL,
    ip_address   VARCHAR(64),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);
