-- Exam fees are collected separately for each end-semester examination (not in the yearly fee structure): an EXAM
-- fee structure targets one department and semester for one exam session (e.g. "Nov/Dec 2026") and carries only
-- EXAM-category heads. The yearly (ANNUAL) structure keeps one per department, year of study and academic year.
ALTER TABLE fee_structures ADD COLUMN kind VARCHAR(10) NOT NULL DEFAULT 'ANNUAL' CHECK (kind IN ('ANNUAL', 'EXAM'));
ALTER TABLE fee_structures ADD COLUMN semester SMALLINT CHECK (semester BETWEEN 1 AND 10);
ALTER TABLE fee_structures ADD COLUMN exam_session VARCHAR(60);
ALTER TABLE fee_structures ADD CONSTRAINT fee_structures_exam_fields
    CHECK (kind = 'ANNUAL' OR (semester IS NOT NULL AND exam_session IS NOT NULL));

ALTER TABLE fee_structures DROP CONSTRAINT fee_structures_dept_key_study_year_academic_year_key;
CREATE UNIQUE INDEX uq_fee_structures_annual ON fee_structures (dept_key, study_year, academic_year) WHERE kind = 'ANNUAL';
CREATE UNIQUE INDEX uq_fee_structures_exam ON fee_structures (dept_key, semester, exam_session) WHERE kind = 'EXAM';
