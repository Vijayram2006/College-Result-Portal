-- Masks personal data on a STAGING copy (a Neon branch). NEVER run on production.
-- Keeps register numbers, departments, marks and results (needed to test) but removes who the people are.
\set ON_ERROR_STOP on
DO $$ BEGIN
    IF current_database() NOT ILIKE '%staging%' AND coalesce(current_setting('app.i_am_staging', true), '') <> 'yes' THEN
        RAISE EXCEPTION 'Refusing: run with  SET app.i_am_staging = ''yes'';  on a staging copy only';
    END IF;
END $$;

UPDATE students SET name = 'Student ' || right(reg_no, 4),
                    dob = CASE WHEN dob IS NULL THEN NULL ELSE make_date(2005, 1 + (abs(hashtext(reg_no)) % 12), 1 + (abs(hashtext(reg_no)) % 28)) END;
UPDATE users SET display_name = 'Staff ' || id, email = NULL, phone = NULL WHERE role <> 'STUDENT';
UPDATE users u SET display_name = s.name FROM students s WHERE u.reg_no = s.reg_no;
UPDATE faculty_master SET name = 'Faculty ' || id, mobile = '9000000000', email = NULL, aadhaar = NULL,
                          photo = NULL, signature = NULL;
DELETE FROM auth_tokens;
