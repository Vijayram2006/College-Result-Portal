-- Internal marks: quiz, activity, assignment and attendance per student and subject, combined with the IAT-1 and
-- IAT-2 answer-script totals (from marks) into the end-semester internal mark.
-- The formula is not fixed yet, so each college's COE keeps it as a setting (internal_schemes.config): component
-- maxima and weights, how the two IATs combine, the hours per subject and the attendance slabs.

CREATE TABLE internal_schemes (
    college_key          VARCHAR(20)  PRIMARY KEY CHECK (college_key IN ('engineering', 'nursing', 'pharmacy')),
    config               JSONB        NOT NULL,
    confirmed            BOOLEAN      NOT NULL DEFAULT false,
    visible_to_students  BOOLEAN      NOT NULL DEFAULT true,
    updated_by           VARCHAR(120) NOT NULL,
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- One value per student, subject and component. attendance = hours attended in the subject (out of the scheme's
-- hours per subject, 45 by default).
CREATE TABLE internal_marks (
    id            BIGSERIAL    PRIMARY KEY,
    dept_key      VARCHAR(10)  NOT NULL REFERENCES departments (dept_key),
    semester      SMALLINT     NOT NULL CHECK (semester BETWEEN 1 AND 8),
    subject_code  VARCHAR(20)  NOT NULL,
    reg_no        VARCHAR(30)  NOT NULL REFERENCES students (reg_no) ON DELETE CASCADE,
    component     VARCHAR(20)  NOT NULL CHECK (component IN ('quiz', 'activity', 'assignment', 'attendance')),
    value         NUMERIC(5,1) NOT NULL CHECK (value >= 0),
    updated_by    VARCHAR(120) NOT NULL,
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (dept_key, semester, subject_code, reg_no, component)
);
CREATE INDEX idx_internal_marks_subject ON internal_marks (dept_key, semester, subject_code);

-- Every change (old -> new; NULL new = cleared), so students, HODs and the COE can see who changed what and when.
CREATE TABLE internal_mark_history (
    id            BIGSERIAL    PRIMARY KEY,
    dept_key      VARCHAR(10)  NOT NULL,
    semester      SMALLINT     NOT NULL,
    subject_code  VARCHAR(20)  NOT NULL,
    reg_no        VARCHAR(30)  NOT NULL REFERENCES students (reg_no) ON DELETE CASCADE,
    component     VARCHAR(20)  NOT NULL,
    old_value     NUMERIC(5,1),
    new_value     NUMERIC(5,1),
    changed_by    VARCHAR(120) NOT NULL,
    changed_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_internal_history_student ON internal_mark_history (reg_no, subject_code);
