-- Staff edit their own profile (name, email from V10, phone, designation); usernames and roles stay fixed
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
ALTER TABLE users ADD COLUMN designation VARCHAR(80);
