-- Scanned answer scripts (PDF): one per student, subject and assessment. Stored in the database so backups include them.
CREATE TABLE answer_scripts (
    id               BIGSERIAL    PRIMARY KEY,
    dept_key         VARCHAR(10)  NOT NULL REFERENCES departments (dept_key),
    semester         SMALLINT     NOT NULL CHECK (semester BETWEEN 1 AND 8),
    subject_code     VARCHAR(20)  NOT NULL,
    reg_no           VARCHAR(30)  NOT NULL REFERENCES students (reg_no) ON DELETE CASCADE,
    assessment_type  VARCHAR(20)  NOT NULL CHECK (assessment_type IN ('IAT-1', 'IAT-2', 'End Semester')),
    file_name        VARCHAR(200) NOT NULL,
    size_bytes       INTEGER      NOT NULL,
    content          BYTEA        NOT NULL,
    uploaded_by      VARCHAR(120) NOT NULL,
    uploaded_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (dept_key, semester, subject_code, reg_no, assessment_type)
);
CREATE INDEX idx_answer_scripts_class ON answer_scripts (dept_key, semester, assessment_type);
