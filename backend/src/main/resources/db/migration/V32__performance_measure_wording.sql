-- Plain wording for the faculty performance measures (shown to faculty, HOD and Associate Dean), and the two rules
-- changed in PerformanceController: logbook regularity counts from the first class of the lesson plan, and marks
-- submission counts only subjects whose marks have been uploaded.
UPDATE performance_measures SET description = 'Share of their students who passed the end-semester exam' WHERE code = 'PASS_PCT';
UPDATE performance_measures SET description = 'Average internal assessment (IAT) mark of their students, out of 100' WHERE code = 'INTERNAL_AVG';
UPDATE performance_measures SET description = 'Lesson-plan topics taught (from the logbook) out of all planned topics' WHERE code = 'SYLLABUS';
UPDATE performance_measures SET description = 'Working days with a logbook entry since classes began' WHERE code = 'LOGBOOK';
UPDATE performance_measures SET description = 'Starts at 100; 5 points less for every approved leave day (on duty is not counted)' WHERE code = 'LEAVE';
UPDATE performance_measures SET description = 'Subjects whose uploaded marks were forwarded to the COE' WHERE code = 'MARKS_ON_TIME';
UPDATE performance_measures SET description = 'Students'' course exit-survey ratings (1 to 5) shown as a percentage' WHERE code = 'FEEDBACK';
UPDATE performance_measures SET description = 'Not counted yet: the ERP has no research module' WHERE code = 'RESEARCH';
