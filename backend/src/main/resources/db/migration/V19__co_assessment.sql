-- CO assessment (R2026 CO attainment sheets): per-question marks of quizzes, assignments, practicals and activities,
-- and the course exit survey. IAT question marks come from the marks table (answer-script entry).
CREATE TABLE co_course_types (
    dept_key      VARCHAR(10)  NOT NULL REFERENCES departments (dept_key),
    semester      SMALLINT     NOT NULL,
    subject_code  VARCHAR(20)  NOT NULL,
    course_type   VARCHAR(12)  NOT NULL CHECK (course_type IN ('THEORY', 'INTEGRATED')),
    updated_by    VARCHAR(160) NOT NULL,
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    PRIMARY KEY (dept_key, semester, subject_code)
);

CREATE TABLE co_entries (
    dept_key      VARCHAR(10)  NOT NULL,
    semester      SMALLINT     NOT NULL,
    subject_code  VARCHAR(20)  NOT NULL,
    component     VARCHAR(12)  NOT NULL CHECK (component IN ('QUIZ1', 'QUIZ2', 'ASSIGN1', 'ASSIGN2', 'PRACTICAL',
                                                             'ACTIVITY', 'EXIT_SURVEY')),
    reg_no        VARCHAR(30)  NOT NULL REFERENCES students (reg_no) ON DELETE CASCADE ON UPDATE CASCADE,
    -- one value per question / experiment / activity / CO (null = not entered)
    marks         JSONB        NOT NULL,
    updated_by    VARCHAR(160) NOT NULL,
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    PRIMARY KEY (dept_key, semester, subject_code, component, reg_no)
);
CREATE INDEX idx_co_entries_subject ON co_entries (dept_key, semester, subject_code);
