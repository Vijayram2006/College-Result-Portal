-- Question papers: the COE's approval is final (Faculty -> HOD -> Associate Dean -> COE). The Chief COE no longer
-- approves or releases papers; they only monitor them.

ALTER TABLE question_papers DROP CONSTRAINT question_papers_status_check;
ALTER TABLE question_papers DROP CONSTRAINT question_papers_stage_check;

-- Papers waiting for the Chief COE had already been approved by the COE: they are now approved, and the Chief COE
-- step that was waiting (the trail's fifth entry) is dropped. Papers the Chief COE already released stay approved and
-- keep their full history and seal number.
UPDATE question_papers SET status = 'COE_APPROVED', stage = 4, trail = trail - 4, version = version + 1, updated_at = now()
WHERE status = 'PENDING_CHIEF_COE';
UPDATE question_papers SET status = 'COE_APPROVED', stage = 4, version = version + 1, updated_at = now()
WHERE status = 'CHIEF_COE_APPROVED';

ALTER TABLE question_papers ADD CONSTRAINT question_papers_status_check CHECK (status IN ('PENDING_HOD_REVIEW',
    'PENDING_AD_REVIEW', 'PENDING_COE_REVIEW', 'COE_APPROVED', 'RETURNED_TO_FACULTY', 'RETURNED_TO_HOD',
    'RETURNED_TO_AD', 'RETURNED_TO_COE'));
ALTER TABLE question_papers ADD CONSTRAINT question_papers_stage_check CHECK (stage BETWEEN 1 AND 4);
