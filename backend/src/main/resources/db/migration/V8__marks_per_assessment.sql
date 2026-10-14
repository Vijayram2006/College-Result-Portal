-- IAT-1, IAT-2 and End Semester marks are kept side by side: one answer script per student, subject AND assessment.
-- Existing marks keep their assessment (all were IAT-1 when this ran).
UPDATE marks SET assessment_type = 'IAT-1' WHERE assessment_type NOT IN ('IAT-1', 'IAT-2', 'End Semester');
ALTER TABLE marks DROP CONSTRAINT marks_dept_key_semester_subject_code_reg_no_key;
ALTER TABLE marks ADD CONSTRAINT marks_one_script_per_assessment
    UNIQUE (dept_key, semester, subject_code, reg_no, assessment_type);
ALTER TABLE marks ADD CONSTRAINT marks_assessment_check
    CHECK (assessment_type IN ('IAT-1', 'IAT-2', 'End Semester'));

-- Result batches (forwarded / published subjects) are per assessment too.
ALTER TABLE result_batches ADD COLUMN assessment_type VARCHAR(20) NOT NULL DEFAULT 'IAT-1'
    CHECK (assessment_type IN ('IAT-1', 'IAT-2', 'End Semester'));
UPDATE result_batches b SET assessment_type = r.assessment_type
FROM (SELECT DISTINCT ON (batch_id) batch_id, assessment_type FROM result_records
      WHERE assessment_type IN ('IAT-1', 'IAT-2', 'End Semester') ORDER BY batch_id) r
WHERE r.batch_id = b.id;
CREATE INDEX idx_batches_subject_assessment ON result_batches (dept_key, semester, subject_code, assessment_type);
