-- Paper-correction allotments are made by the COE (they replace the shared kvell_paper_correction_assignments
-- document, which any staff role could overwrite). One row per evaluator of a subject's assessment: the evaluator
-- corrects the answer scripts at positions first_script..last_script of the subject's evaluation order (dummy
-- numbers, sorted), so the bundles of one subject never overlap.
CREATE TABLE paper_allotments (
    id               BIGSERIAL    PRIMARY KEY,
    dept_key         VARCHAR(10)  NOT NULL REFERENCES departments (dept_key),
    semester         SMALLINT     NOT NULL CHECK (semester BETWEEN 1 AND 8),
    subject_code     VARCHAR(20)  NOT NULL,
    assessment_type  VARCHAR(20)  NOT NULL CHECK (assessment_type IN ('IAT-1', 'IAT-2', 'End Semester')),
    evaluator_id     BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    first_script     INTEGER      NOT NULL CHECK (first_script >= 1),
    last_script      INTEGER      NOT NULL,
    allotted_by      VARCHAR(160) NOT NULL,
    allotted_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CHECK (last_script >= first_script),
    UNIQUE (dept_key, semester, subject_code, assessment_type, evaluator_id)
);
CREATE INDEX idx_paper_allotments_evaluator ON paper_allotments (evaluator_id);

-- A notification can be addressed to one user (an evaluator's allotment) instead of everyone of its audience
ALTER TABLE notifications ADD COLUMN user_id BIGINT REFERENCES users (id) ON DELETE CASCADE;

-- The old shared allotment documents are no longer used
DELETE FROM workflow_documents WHERE doc_key IN ('kvell_paper_correction_assignments', 'kvell_faculty_evaluated_scripts');
