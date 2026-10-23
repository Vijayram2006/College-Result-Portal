-- The period in which students may answer the course exit survey of a subject (set by the subject's faculty or HOD).
CREATE TABLE exit_survey_windows (
    dept_key      VARCHAR(10)  NOT NULL,
    semester      SMALLINT     NOT NULL,
    subject_code  VARCHAR(20)  NOT NULL,
    opens_at      TIMESTAMPTZ  NOT NULL,
    closes_at     TIMESTAMPTZ  NOT NULL CHECK (closes_at > opens_at),
    set_by        VARCHAR(160) NOT NULL,
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    PRIMARY KEY (dept_key, semester, subject_code)
);
