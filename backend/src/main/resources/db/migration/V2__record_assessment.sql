-- Which assessment (IAT-1, IAT-2, End Semester) a published mark came from; Analytics filters on it.
ALTER TABLE result_records ADD COLUMN assessment_type VARCHAR(20) NOT NULL DEFAULT 'End Semester';
UPDATE result_records r SET assessment_type = m.assessment_type
FROM result_batches b, marks m
WHERE b.id = r.batch_id AND m.dept_key = b.dept_key AND m.semester = b.semester
  AND m.subject_code = b.subject_code AND m.reg_no = r.reg_no;
