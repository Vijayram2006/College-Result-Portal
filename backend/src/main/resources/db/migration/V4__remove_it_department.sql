-- The college has no Information Technology department. Remove it (and its HOD login) unless anything uses it.
DELETE FROM users
WHERE dept_key = 'it' AND role = 'HOD'
  AND NOT EXISTS (SELECT 1 FROM students WHERE dept_key = 'it')
  AND NOT EXISTS (SELECT 1 FROM subjects WHERE dept_key = 'it');

DELETE FROM departments
WHERE dept_key = 'it'
  AND NOT EXISTS (SELECT 1 FROM students WHERE dept_key = 'it')
  AND NOT EXISTS (SELECT 1 FROM subjects WHERE dept_key = 'it')
  AND NOT EXISTS (SELECT 1 FROM marks WHERE dept_key = 'it')
  AND NOT EXISTS (SELECT 1 FROM result_batches WHERE dept_key = 'it')
  AND NOT EXISTS (SELECT 1 FROM users WHERE dept_key = 'it');
