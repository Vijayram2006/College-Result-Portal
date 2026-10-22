-- Students absent for an assessment of a subject: no answer script, no marks to enter. Faculty mark entry leaves them
-- out and publication does not wait for their marks.
CREATE TABLE script_absences (
    dept_key         VARCHAR(10)  NOT NULL,
    semester         SMALLINT     NOT NULL,
    subject_code     VARCHAR(20)  NOT NULL,
    reg_no           VARCHAR(30)  NOT NULL REFERENCES students (reg_no) ON DELETE CASCADE ON UPDATE CASCADE,
    assessment_type  VARCHAR(20)  NOT NULL,
    marked_by        VARCHAR(160) NOT NULL,
    marked_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    PRIMARY KEY (dept_key, semester, subject_code, reg_no, assessment_type)
);
