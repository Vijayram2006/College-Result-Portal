-- Leave approval in two steps, hourly permission and the Dean.
--   Faculty leave: HOD recommends and forwards -> Associate Dean approves.
--   HOD leave:     Associate Dean recommends and forwards -> Dean approves.
--   Student leave: class in-charge (one step, unchanged).
-- approver_role is the step the request is waiting at (or was decided at). 'DEAN' used to mean the Associate Dean.
ALTER TABLE leave_requests DROP CONSTRAINT leave_requests_approver_role_check;
UPDATE leave_requests SET approver_role = 'ASSOCIATE_DEAN' WHERE approver_role = 'DEAN';
ALTER TABLE leave_requests ADD CONSTRAINT leave_requests_approver_role_check
    CHECK (approver_role IN ('CLASS_INCHARGE', 'HOD', 'ASSOCIATE_DEAN', 'DEAN'));

-- The first step (recommended and forwarded)
ALTER TABLE leave_requests ADD COLUMN forwarded_by VARCHAR(160);
ALTER TABLE leave_requests ADD COLUMN forwarded_role VARCHAR(20);
ALTER TABLE leave_requests ADD COLUMN forwarded_at TIMESTAMPTZ;
ALTER TABLE leave_requests ADD COLUMN forward_remarks VARCHAR(500);

-- Hourly permission: one date, a time range, at most a few hours (days = 0)
ALTER TABLE leave_requests ADD COLUMN from_time TIME;
ALTER TABLE leave_requests ADD COLUMN to_time TIME;
ALTER TABLE leave_requests ADD COLUMN hours NUMERIC(3, 1);
ALTER TABLE leave_requests ADD CONSTRAINT leave_requests_permission_check
    CHECK ((from_time IS NULL AND to_time IS NULL AND hours IS NULL)
        OR (from_time IS NOT NULL AND to_time IS NOT NULL AND to_time > from_time AND hours > 0 AND from_date = to_date));

INSERT INTO leave_types (code, name, applies_to, yearly_days, needs_attachment)
VALUES ('PERM', 'Permission (hours)', 'STAFF', NULL, FALSE)
ON CONFLICT (code) DO NOTHING;
INSERT INTO erp_settings (key, value) VALUES
    ('leave.permission_max_hours', '2'),   -- longest permission in hours
    ('leave.permission_per_month', '2')    -- permissions per calendar month
ON CONFLICT (key) DO NOTHING;
