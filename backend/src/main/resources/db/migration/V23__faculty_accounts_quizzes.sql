-- Faculty accounts created by the Associate Dean: each faculty member signs in with their own staff ID (instead of a
-- shared FAC<DEPT> login), belongs to one department and handles the subjects the Dean assigns.
ALTER TABLE faculty_master
    ADD COLUMN staff_id    VARCHAR(30) UNIQUE,
    ADD COLUMN user_id     BIGINT REFERENCES users (id) ON DELETE SET NULL,
    ADD COLUMN verified_by VARCHAR(120),
    ADD COLUMN verified_at TIMESTAMPTZ;

CREATE TABLE faculty_subjects (
    user_id      BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    dept_key     VARCHAR(10) NOT NULL REFERENCES departments (dept_key),
    semester     SMALLINT    NOT NULL CHECK (semester BETWEEN 1 AND 8),
    subject_code VARCHAR(20) NOT NULL,
    PRIMARY KEY (user_id, dept_key, semester, subject_code)
);
CREATE INDEX idx_faculty_subjects_subject ON faculty_subjects (dept_key, semester, subject_code);

-- Online quizzes: the subject's faculty writes multiple-choice questions and opens the quiz to the students for a
-- period; each student's score fills the CO sheet's quiz column automatically.
CREATE TABLE quizzes (
    id           BIGSERIAL    PRIMARY KEY,
    dept_key     VARCHAR(10)  NOT NULL REFERENCES departments (dept_key),
    semester     SMALLINT     NOT NULL CHECK (semester BETWEEN 1 AND 8),
    subject_code VARCHAR(20)  NOT NULL,
    cycle        VARCHAR(10)  NOT NULL CHECK (cycle IN ('IAT-1', 'IAT-2')),
    title        VARCHAR(160) NOT NULL,
    -- [{ "q": text, "options": [4 texts], "answer": index, "co": "CO1" }]
    questions    JSONB        NOT NULL,
    opens_at     TIMESTAMPTZ  NOT NULL,
    closes_at    TIMESTAMPTZ  NOT NULL CHECK (closes_at > opens_at),
    created_by   VARCHAR(120) NOT NULL,
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (dept_key, semester, subject_code, cycle)
);

CREATE TABLE quiz_attempts (
    quiz_id      BIGINT       NOT NULL REFERENCES quizzes (id) ON DELETE CASCADE,
    reg_no       VARCHAR(30)  NOT NULL REFERENCES students (reg_no) ON DELETE CASCADE,
    answers      JSONB        NOT NULL,
    score        INTEGER      NOT NULL,
    total        INTEGER      NOT NULL,
    submitted_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    PRIMARY KEY (quiz_id, reg_no)
);
