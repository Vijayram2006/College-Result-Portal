-- Faculty master (Faculty Detail, requirements Draft 1 section 6): entered by each college's COE, view-only for the
-- Chief COE. Tabs: Basic Details, Employment History, Course Offered. (Deputation / Other Details are not built yet.)
-- Repeating rows (qualifications, employment, courses) are stored as JSON arrays; photo and signature as images.
CREATE TABLE faculty_master (
    id                       BIGSERIAL    PRIMARY KEY,
    college_key              VARCHAR(20)  NOT NULL CHECK (college_key IN ('engineering', 'nursing', 'pharmacy')),
    dept_key                 VARCHAR(10)  NOT NULL REFERENCES departments (dept_key),
    title                    VARCHAR(5)   NOT NULL CHECK (title IN ('Dr.', 'Mr.', 'Ms.')),
    name                     VARCHAR(120) NOT NULL,
    relation_name            VARCHAR(120),
    gender                   VARCHAR(10)  NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
    dob                      DATE         NOT NULL,
    designation              VARCHAR(80)  NOT NULL,
    joined_service_on        DATE         NOT NULL,
    joined_post_on           DATE         NOT NULL,
    aadhaar                  VARCHAR(12)  UNIQUE,
    comm_address             JSONB        NOT NULL DEFAULT '{}',
    perm_address             JSONB        NOT NULL DEFAULT '{}',
    residential_phone        VARCHAR(20),
    mobile                   VARCHAR(15)  NOT NULL,
    email                    VARCHAR(120),
    qualifications           JSONB        NOT NULL DEFAULT '[]',
    employment               JSONB        NOT NULL DEFAULT '[]',
    courses                  JSONB        NOT NULL DEFAULT '[]',
    photo                    BYTEA,
    photo_type               VARCHAR(20),
    signature                BYTEA,
    signature_type           VARCHAR(20),
    created_by               VARCHAR(120) NOT NULL,
    created_at               TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by               VARCHAR(120) NOT NULL,
    updated_at               TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_faculty_master_college ON faculty_master (college_key, dept_key);
