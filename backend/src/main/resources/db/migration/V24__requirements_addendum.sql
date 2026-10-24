-- Requirements addendum EES-ADD-REQ-v1.4.

-- REQ-10: Artificial Intelligence and Data Science is ADS everywhere (drop-downs, reports, exports).
UPDATE departments SET code = 'ADS' WHERE dept_key = 'aids';

-- REQ-04: the evaluator's remarks per question ("q1".."q16") and overall, shown to the student after publication.
ALTER TABLE marks ADD COLUMN remarks JSONB NOT NULL DEFAULT '{}';

-- REQ-15: results held back from publication (WH1 malpractice, WH2 fee dues, WH3 attendance shortage; extensible).
CREATE TABLE withhold_codes (
    code        VARCHAR(10)  PRIMARY KEY,
    description VARCHAR(120) NOT NULL
);
INSERT INTO withhold_codes (code, description) VALUES
    ('WH1', 'Malpractice'), ('WH2', 'Fee dues'), ('WH3', 'Attendance shortage');

CREATE TABLE result_withholds (
    reg_no          VARCHAR(30)  NOT NULL REFERENCES students (reg_no) ON DELETE CASCADE,
    semester        SMALLINT     NOT NULL CHECK (semester BETWEEN 1 AND 8),
    assessment_type VARCHAR(20)  NOT NULL,
    code            VARCHAR(10)  NOT NULL REFERENCES withhold_codes (code),
    reason          VARCHAR(300),
    set_by          VARCHAR(120) NOT NULL,
    set_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    PRIMARY KEY (reg_no, semester, assessment_type)
);

-- REQ-02/18: the CO attainment threshold of a subject (default 50% of marks).
CREATE TABLE co_thresholds (
    dept_key     VARCHAR(10)  NOT NULL REFERENCES departments (dept_key),
    semester     SMALLINT     NOT NULL,
    subject_code VARCHAR(20)  NOT NULL,
    threshold    NUMERIC(5,2) NOT NULL CHECK (threshold > 0 AND threshold <= 100),
    updated_by   VARCHAR(120) NOT NULL,
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    PRIMARY KEY (dept_key, semester, subject_code)
);

-- REQ-06/07/08/09: examination hall allotment by the COE, cascaded COE -> HOD -> faculty -> students.
CREATE TABLE hall_plans (
    id                BIGSERIAL    PRIMARY KEY,
    college_key       VARCHAR(20)  NOT NULL,
    title             VARCHAR(160) NOT NULL,
    semester          SMALLINT     NOT NULL CHECK (semester BETWEEN 1 AND 8),
    assessment_type   VARCHAR(20)  NOT NULL,
    exam_date         DATE         NOT NULL,
    session           VARCHAR(2)   NOT NULL CHECK (session IN ('FN', 'AN')),
    start_time        TIME         NOT NULL,
    duration_minutes  INTEGER      NOT NULL DEFAULT 180 CHECK (duration_minutes BETWEEN 30 AND 360),
    reporting_minutes INTEGER      NOT NULL DEFAULT 30 CHECK (reporting_minutes BETWEEN 0 AND 120),
    status            VARCHAR(10)  NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED')),
    seal              VARCHAR(64),
    created_by        VARCHAR(120) NOT NULL,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    published_by      VARCHAR(120),
    published_at      TIMESTAMPTZ
);

CREATE TABLE hall_plan_seats (
    plan_id  BIGINT      NOT NULL REFERENCES hall_plans (id) ON DELETE CASCADE,
    hall     VARCHAR(40) NOT NULL,
    bench    VARCHAR(10) NOT NULL,
    reg_no   VARCHAR(30) NOT NULL REFERENCES students (reg_no) ON DELETE CASCADE,
    dept_key VARCHAR(10) NOT NULL,
    PRIMARY KEY (plan_id, reg_no),
    UNIQUE (plan_id, hall, bench)
);

-- Each department's step in the cascade: the HOD validates, then the faculty publish to the students.
CREATE TABLE hall_plan_depts (
    plan_id              BIGINT       NOT NULL REFERENCES hall_plans (id) ON DELETE CASCADE,
    dept_key             VARCHAR(10)  NOT NULL,
    hod_validated_by     VARCHAR(120),
    hod_validated_at     TIMESTAMPTZ,
    faculty_published_by VARCHAR(120),
    faculty_published_at TIMESTAMPTZ,
    PRIMARY KEY (plan_id, dept_key)
);

-- REQ-09: extra time the COE grants a hall after a disruption (minutes, added to the 180-minute window).
CREATE TABLE hall_extensions (
    plan_id       BIGINT       NOT NULL REFERENCES hall_plans (id) ON DELETE CASCADE,
    hall          VARCHAR(40)  NOT NULL,
    extra_minutes INTEGER      NOT NULL CHECK (extra_minutes BETWEEN 0 AND 120),
    reason        VARCHAR(300) NOT NULL,
    set_by        VARCHAR(120) NOT NULL,
    set_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    PRIMARY KEY (plan_id, hall)
);
