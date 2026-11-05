-- Removes the data of tools/demo-erp-seed.sql.
BEGIN;
DELETE FROM logbook_entries WHERE faculty_id IN (SELECT id FROM users WHERE username IN ('FACCSE', 'FACAIDS')) AND created_at = (entry_date + time '16:30') AT TIME ZONE 'Asia/Kolkata';
DELETE FROM users WHERE username IN ('CSE_LAKSHMIPRIYA', 'CSE_ARUNKUMAR', 'CSE_MEENAKSHI', 'CSE_VIGNESH', 'CSE_KAVITHA', 'AIDS_SANTHOSH', 'AIDS_DIVYA', 'AIDS_RAMESH', 'AIDS_PRIYADHARSHINI', 'AIDS_ANBARASI');
DELETE FROM syllabus_units WHERE dept_key = 'cse' AND semester = 1 AND subject_code IN ('CS26C02T', 'CS26N01I', 'CY26C01I', 'MA26C01T', 'UC26C01T');
DELETE FROM syllabus_units WHERE dept_key = 'aids' AND semester = 1 AND subject_code IN ('CS26C02T', 'CS26N01I', 'CY26C01I', 'MA26C01T', 'UC26C01T');
COMMIT;
