-- The Chief COE (Super Admin) signs in as COE instead of SATHISH. The account itself (password, profile, sessions)
-- is kept; only the username changes. Audit entries keep the username that was used at the time.
UPDATE users SET username = 'COE'
WHERE username = 'SATHISH' AND role = 'SUPER_ADMIN'
  AND NOT EXISTS (SELECT 1 FROM users WHERE username = 'COE');
