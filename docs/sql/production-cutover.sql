-- Removes the DEMO data and accounts before real use. Run once, as the owner, after a backup, on the production
-- database, then load the real students and subjects through the COE panel.
-- Keeps: the schema, departments, the Chief COE and the college COE accounts (they must reset their passwords).
\set ON_ERROR_STOP on
BEGIN;
-- Demo students and everything attached to them (marks, results, internal marks follow through the app's deletes)
DELETE FROM result_records;
DELETE FROM result_batches;
DELETE FROM marks;
DELETE FROM internal_marks;
DELETE FROM internal_mark_history;
DELETE FROM answer_scripts;
DELETE FROM revaluation_requests;
DELETE FROM notifications;
DELETE FROM users WHERE role = 'STUDENT';
DELETE FROM students;
-- Demo HOD / faculty logins are recreated per department from the Departments page
DELETE FROM users WHERE role IN ('HOD', 'FACULTY');
-- Officers keep their accounts but must choose a new password and set up two-step sign-in again
UPDATE users SET must_change_password = TRUE, totp_enabled = FALSE, totp_secret = NULL, totp_last_step = NULL,
                 totp_recovery = NULL
WHERE role IN ('ADMIN', 'SUPER_ADMIN');
DELETE FROM auth_tokens;
COMMIT;
-- The audit log is kept (append-only); it records the cut-over through the officers' next actions.
