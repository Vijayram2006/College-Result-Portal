-- Course materials: notes, slides, lab manuals, question banks and references the subject faculty publish unit by
-- unit. One stored file can be shared with several departments (a common first-year subject).
CREATE TABLE course_material_files (
    id            BIGSERIAL     PRIMARY KEY,
    file_name     VARCHAR(200)  NOT NULL,
    content_type  VARCHAR(100)  NOT NULL,
    data          BYTEA         NOT NULL,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TABLE course_materials (
    id               BIGSERIAL     PRIMARY KEY,
    dept_key         VARCHAR(10)   NOT NULL REFERENCES departments (dept_key),
    semester         SMALLINT      NOT NULL CHECK (semester BETWEEN 1 AND 8),
    subject_code     VARCHAR(20)   NOT NULL,
    section          VARCHAR(5)    NOT NULL DEFAULT 'ALL',
    unit_number      SMALLINT      NOT NULL CHECK (unit_number BETWEEN 1 AND 10),
    material_type    VARCHAR(20)   NOT NULL CHECK (material_type IN ('NOTE', 'SLIDES', 'LAB_MANUAL', 'QUESTION_BANK', 'REFERENCE')),
    title            VARCHAR(200)  NOT NULL,
    description      VARCHAR(1000) NOT NULL DEFAULT '',
    file_id          BIGINT        REFERENCES course_material_files (id) ON DELETE SET NULL,
    link_url         VARCHAR(500),
    file_name        VARCHAR(200)  NOT NULL DEFAULT '',
    file_size_kb     INTEGER       NOT NULL DEFAULT 0,
    faculty_user_id  BIGINT        REFERENCES users (id) ON DELETE SET NULL,
    faculty_name     VARCHAR(120)  NOT NULL,
    is_published     BOOLEAN       NOT NULL DEFAULT TRUE,
    download_count   INTEGER       NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_course_materials_class ON course_materials (dept_key, semester, subject_code);

-- Who downloaded which report, in which format (Report Download centre)
CREATE TABLE report_downloads (
    id               BIGSERIAL     PRIMARY KEY,
    user_id          BIGINT        REFERENCES users (id) ON DELETE SET NULL,
    username         VARCHAR(60)   NOT NULL,
    role             VARCHAR(20)   NOT NULL,
    report_type      VARCHAR(60)   NOT NULL,
    file_format      VARCHAR(10)   NOT NULL,
    filters_applied  VARCHAR(500)  NOT NULL DEFAULT '',
    downloaded_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_report_downloads_user ON report_downloads (user_id, downloaded_at DESC);
