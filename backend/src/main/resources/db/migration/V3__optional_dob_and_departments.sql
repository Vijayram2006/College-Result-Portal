-- Students can be added before their date of birth is known; they can sign in once it is added.
ALTER TABLE students ALTER COLUMN dob DROP NOT NULL;

-- Departments in the college's IAT-I workbook that were missing.
INSERT INTO departments (dept_key, name) VALUES
    ('bme',   'Biomedical Engineering'),
    ('bt',    'Biotechnology'),
    ('civil', 'Civil Engineering'),
    ('ra',    'Robotics & Automation'),
    ('mba',   'Master of Business Administration'),
    ('mca',   'Master of Computer Applications')
ON CONFLICT (dept_key) DO NOTHING;
