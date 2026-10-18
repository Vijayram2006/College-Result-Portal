-- Data validation after an import, a restore or a migration: record counts and a checksum per table.
-- Run on the source and on the target and compare the two outputs (they must be identical).
--   psql "<database URL>" -f tools/verify-counts.sql
SELECT 'students' AS tbl, count(*) AS rows, md5(string_agg(reg_no || '|' || name || '|' || coalesce(dob::text, '') || '|' || dept_key || '|' || semester, ',' ORDER BY reg_no)) AS checksum FROM students
UNION ALL
SELECT 'subjects', count(*), md5(string_agg(dept_key || '|' || semester || '|' || code || '|' || title || '|' || credits, ',' ORDER BY dept_key, semester, code)) FROM subjects
UNION ALL
SELECT 'marks', count(*), md5(string_agg(dept_key || '|' || semester || '|' || subject_code || '|' || reg_no || '|' || assessment_type || '|' || grand_total, ',' ORDER BY dept_key, semester, subject_code, reg_no, assessment_type)) FROM marks
UNION ALL
SELECT 'result_records', count(*), md5(string_agg(batch_id || '|' || reg_no || '|' || total || '|' || grade, ',' ORDER BY batch_id, reg_no)) FROM result_records
UNION ALL
SELECT 'result_batches', count(*), md5(string_agg(id || '|' || status, ',' ORDER BY id)) FROM result_batches
UNION ALL
SELECT 'users', count(*), md5(string_agg(username || '|' || role, ',' ORDER BY username)) FROM users
UNION ALL
SELECT 'audit_logs', count(*), md5(string_agg(id::text, ',' ORDER BY id)) FROM audit_logs
ORDER BY tbl;
