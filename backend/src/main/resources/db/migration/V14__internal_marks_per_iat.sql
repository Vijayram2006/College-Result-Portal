-- Quiz, activity and assignment are entered separately for each IAT cycle (quiz1 = with IAT-1, quiz2 = with IAT-2).
-- Values entered before this belonged to no cycle; they are kept as IAT-1 cycle values.
ALTER TABLE internal_marks DROP CONSTRAINT internal_marks_component_check;
UPDATE internal_marks SET component = component || '1' WHERE component IN ('quiz', 'activity', 'assignment');
UPDATE internal_mark_history SET component = component || '1' WHERE component IN ('quiz', 'activity', 'assignment');
ALTER TABLE internal_marks ADD CONSTRAINT internal_marks_component_check CHECK (component IN
    ('quiz1', 'activity1', 'assignment1', 'quiz2', 'activity2', 'assignment2', 'attendance'));

-- The formula's shape changed (one IAT weight + how the two cycles combine); saved provisional formulas start again
-- from the new default.
DELETE FROM internal_schemes;
