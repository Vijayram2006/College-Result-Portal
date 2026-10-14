-- Staff accounts created with a shared starting password must choose their own at first sign-in.
-- Existing accounts are left as they are; set the flag for them before go-live (see the security notes).
ALTER TABLE users ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
