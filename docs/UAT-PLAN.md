# User acceptance testing (UAT)

Run on **staging** (docs/STAGING.md) by COE office staff with realistic, masked data. Each tester ticks Pass/Fail and
notes problems. Go-live needs every Must test passed and the sign-off below.

| # | Who | Test | Must | Pass / Fail | Notes |
|---|---|---|---|---|---|
| 1 | COE | First sign-in: change starting password, set up two-step sign-in, save recovery codes | M | | |
| 2 | COE | Sign in again with password + authenticator code; sign in with a recovery code | M | | |
| 3 | COE | Add a department and the semester's subjects | M | | |
| 4 | COE | Upload the college's real student sheet (Excel); check the preview; save; re-upload the same sheet (updates, no duplicates) | M | | |
| 5 | COE | Upload a sheet with mistakes (missing DOB, duplicate register number, wrong category): errors listed by row, nothing saved | M | | |
| 6 | Faculty | Enter marks for a subject; forward to COE | M | | |
| 7 | Faculty + COE | Two people edit the same student's marks: the second save is refused, not lost silently | S | | |
| 8 | COE | Publish all results of a department; check pass percentage | M | | |
| 9 | Student | Sign in with register number + DOB; see the results; download the PDF grade sheet; on a phone | M | | |
| 10 | Student | Try another student's results (change the address/URL): not possible | M | | |
| 11 | HOD | Department analytics and student results show the published data | M | | |
| 12 | COE | Withdraw the results with a reason; students no longer see them; publish again | M | | |
| 13 | COE | Audit Logs show every step above with before/after values | M | | |
| 14 | Chief COE | Close the student portal; students cannot sign in; open it again | M | | |
| 15 | Chief COE | Reset an officer's two-step sign-in; they set it up again | S | | |
| 16 | COE | Compare 20 published results with marks calculated by hand (grade, grade points, SGPA, pass/fail, arrears) | M | | |
| 17 | All | Use on Chrome, Edge, Firefox and Safari (iPhone) | S | | |
| 18 | Student | Absent / malpractice cases shown as the college requires | S | | |

## Sign-off

| Role | Name | Signature | Date |
|---|---|---|---|
| Controller of Examinations | | | |
| COE office representative | | | |
| Technical lead | | | |
