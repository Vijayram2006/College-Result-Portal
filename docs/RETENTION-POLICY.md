# Retention policy

Draft for approval by the university.

| Data | Kept | Removed by |
|---|---|---|
| Students, marks, published results, scanned answer scripts | As long as the university must keep academic records (normally the student's study period + the statutory period) | COE, per semester, after export (see Archive) |
| Audit log | 7 years (`AUDIT_RETENTION_YEARS`) | Nightly retention job (02:30 IST); the only process allowed to delete audit entries |
| Notifications | 1 year (`NOTIFICATION_RETENTION_DAYS`) | Nightly retention job |
| Sign-in sessions | Until they expire (8 h maximum, 30 min idle for COEs) | Nightly retention job and at each sign-in |
| Database backups | 30 days (nightly artifacts) plus the pre-release backups kept by the COE office | GitHub artifact expiry |
| Browser error reports and server logs | 30 days (hosting log retention) | Hosting provider |

## Archive of old semesters

At the end of each academic year the COE exports every published result (COE panel > Published Results > download)
and the audit log (Audit Logs > export), stores them with the official records, and may then delete the oldest
semesters' working data (Student Data > delete target data). The audit log keeps the record of the deletion.

## Personal data

Only register number, name, date of birth, department, year, semester, admission category and marks are held for
students; name and contact details for staff. A person's request to see or correct their data goes to the COE office
(see the privacy policy).
