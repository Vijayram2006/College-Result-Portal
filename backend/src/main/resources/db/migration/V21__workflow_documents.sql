-- Shared documents of the examination workflow screens (exam timetable, Dean's notifications, paper-correction
-- allotments and evaluations, three-tier revaluation records), one JSON document per college and key.
CREATE TABLE workflow_documents (
    college_key  VARCHAR(20)  NOT NULL,
    doc_key      VARCHAR(80)  NOT NULL,
    data         JSONB        NOT NULL,
    version      INTEGER      NOT NULL DEFAULT 1,
    updated_by   VARCHAR(160) NOT NULL,
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    PRIMARY KEY (college_key, doc_key)
);
