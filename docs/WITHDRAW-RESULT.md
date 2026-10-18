# Withdrawing and correcting a wrongly published result

Target: the wrong result is hidden within **15 minutes** of being reported.

1. **Withdraw.** COE panel > Results > **Publish Results** > choose the department, semester and assessment >
   **Withdraw results**. Type the reason (it goes into the audit log), e.g. "CS26C02T marks entered for the wrong
   student". Students and the HOD stop seeing those results at once (the cache is cleared); the marks are kept, and
   the subjects show "Withdrawn - can be published again". Students get a notification that the results are under
   review.
2. **Correct.** COE panel > **Mark Entry** (or the faculty in their portal) fixes the marks. Every change is recorded
   with the old and new value. If two people edit the same script, the second save is refused instead of overwriting.
3. **Forward again.** Faculty forward the corrected subject (or the COE verifies it).
4. **Publish again.** Publish Results > **Publish all results**. The publication replaces the earlier one.
5. **Record.** Audit Logs show WITHDREW_DEPARTMENT_RESULTS (with the reason and old/new state), the mark changes and
   the new publication. Tell the affected students through the announcement or the department.

If the portal itself is wrong (not the data): the Chief COE can close the student portal (Super Admin Control >
gateways) while it is fixed, or the release owner rolls back (docs/RUNBOOK.md).
