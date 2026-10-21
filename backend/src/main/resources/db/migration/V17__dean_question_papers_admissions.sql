-- Associate Dean / Dean and admission officer accounts, question papers with their approval chain, the optional
-- HOD / Associate Dean approval of marks before publication, and admission applicants with their documents.

-- 1. Roles: DEAN (title ASSOCIATE_DEAN or DEAN) and ADMISSION, each for one college
ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'HOD', 'STUDENT', 'FACULTY', 'DEAN', 'ADMISSION'));
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_officer_title_check;
ALTER TABLE users ADD CONSTRAINT users_officer_title_check
    CHECK (officer_title IS NULL OR officer_title IN ('DEPUTY_COE', 'ASSOCIATE_DEAN', 'DEAN'));

-- 2. Question papers: Faculty -> HOD -> Associate Dean -> COE -> Chief COE (release), with returns
CREATE TABLE question_papers (
    id                BIGSERIAL    PRIMARY KEY,
    college_key       VARCHAR(20)  NOT NULL,
    dept_key          VARCHAR(10)  NOT NULL REFERENCES departments (dept_key),
    subject_code      VARCHAR(20)  NOT NULL,
    subject_title     VARCHAR(160) NOT NULL,
    semester          SMALLINT     NOT NULL CHECK (semester BETWEEN 1 AND 8),
    academic_year     VARCHAR(20)  NOT NULL,
    regulation        VARCHAR(20)  NOT NULL,
    exam_type         VARCHAR(30)  NOT NULL,
    set_label         VARCHAR(10)  NOT NULL,
    status            VARCHAR(30)  NOT NULL CHECK (status IN ('PENDING_HOD_REVIEW', 'PENDING_AD_REVIEW',
                          'PENDING_COE_REVIEW', 'PENDING_CHIEF_COE', 'CHIEF_COE_APPROVED', 'RETURNED_TO_FACULTY',
                          'RETURNED_TO_HOD', 'RETURNED_TO_AD', 'RETURNED_TO_COE')),
    stage             SMALLINT     NOT NULL CHECK (stage BETWEEN 1 AND 5),
    -- paper content as the screens use it: marks, duration, Bloom's distribution, course outcomes, parts A/B/C,
    -- HOD declaration (JSON, validated for size by the application)
    content           JSONB        NOT NULL DEFAULT '{}'::jsonb,
    -- one signature per stage (who, when, remarks), replaced as the paper moves
    trail             JSONB        NOT NULL DEFAULT '[]'::jsonb,
    faculty_username  VARCHAR(60)  NOT NULL,
    faculty_name      VARCHAR(160) NOT NULL,
    coe_reference_no  VARCHAR(40),
    chief_seal_no     VARCHAR(40),
    remarks           VARCHAR(500),
    pdf               BYTEA,
    pdf_name          VARCHAR(200),
    pdf_size          INTEGER,
    version           INTEGER      NOT NULL DEFAULT 1,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_question_papers_scope ON question_papers (college_key, dept_key, status);

-- 3. Marks: optional HOD and Associate Dean approval of a forwarded subject before the COE may publish it
ALTER TABLE result_batches
    ADD COLUMN hod_approved_by  VARCHAR(160),
    ADD COLUMN hod_approved_at  TIMESTAMPTZ,
    ADD COLUMN ad_approved_by   VARCHAR(160),
    ADD COLUMN ad_approved_at   TIMESTAMPTZ,
    ADD COLUMN returned_by      VARCHAR(160),
    ADD COLUMN returned_at      TIMESTAMPTZ,
    ADD COLUMN return_reason    VARCHAR(300);

-- 4. Admissions: applicants (personal data on the server only) and their scanned documents
CREATE TABLE admission_applicants (
    id               BIGSERIAL    PRIMARY KEY,
    college_key      VARCHAR(20)  NOT NULL,
    application_no   VARCHAR(40)  NOT NULL UNIQUE,
    reg_no           VARCHAR(30)  UNIQUE,
    full_name        VARCHAR(160) NOT NULL,
    dob              DATE,
    dept_code        VARCHAR(10)  NOT NULL,
    dept_name        VARCHAR(160) NOT NULL,
    degree_level     VARCHAR(10)  NOT NULL,
    admission_year   SMALLINT     NOT NULL,
    quota            VARCHAR(30)  NOT NULL,
    status           VARCHAR(30)  NOT NULL CHECK (status IN ('DRAFT', 'PENDING_VERIFICATION', 'DOCS_VERIFIED',
                         'ADMITTED', 'REJECTED')),
    aadhaar          VARCHAR(12),
    -- every other field of the application form (contact, parents, address, 10th / 12th marks, verification flags)
    details          JSONB        NOT NULL DEFAULT '{}'::jsonb,
    created_by       VARCHAR(60)  NOT NULL,
    version          INTEGER      NOT NULL DEFAULT 1,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    admitted_at      TIMESTAMPTZ
);
CREATE INDEX idx_admission_applicants_college ON admission_applicants (college_key, status);

CREATE TABLE admission_documents (
    applicant_id  BIGINT       NOT NULL REFERENCES admission_applicants (id) ON DELETE CASCADE,
    kind          VARCHAR(20)  NOT NULL CHECK (kind IN ('AADHAAR', 'TENTH', 'TWELFTH')),
    file          BYTEA        NOT NULL,
    file_name     VARCHAR(200) NOT NULL,
    file_type     VARCHAR(60)  NOT NULL,
    file_size     INTEGER      NOT NULL,
    uploaded_by   VARCHAR(60)  NOT NULL,
    uploaded_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    PRIMARY KEY (applicant_id, kind)
);

-- 5. Notifications for the Associate Dean / Dean of a college
ALTER TABLE notifications DROP CONSTRAINT notifications_audience_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_audience_check
    CHECK (audience IN ('COE', 'HOD', 'FACULTY', 'STUDENT', 'DEAN'));
