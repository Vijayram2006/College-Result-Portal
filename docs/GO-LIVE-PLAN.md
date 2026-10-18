# Go-live plan

## Before the day

- [ ] UAT signed off (docs/UAT-PLAN.md).
- [ ] Paid hosting (no sleeping server), ideally in an India region; college domains with SSL
      (`results.` / `coe.` / `api.`) and DNS TTL lowered to 300 s a day before the switch.
- [ ] Least-privilege database user in place (docs/sql/least-privilege-roles.sql); `CLIENT_IP_HEADER` set.
- [ ] Demo data removed and real data loaded (docs/sql/production-cutover.sql), counts and checksums checked
      (tools/verify-counts.sql).
- [ ] Every COE account set up with two-step sign-in; approved access list signed (private hosting folder).
- [ ] Repository secrets for deploy, backup and uptime workflows added; a backup restored successfully this week.
- [ ] Uptime alerts reach a phone (UptimeRobot or cron-job.org on `/readyz`, portal and COE panel).
- [ ] Privacy policy, terms and disclaimer approved by the university.
- [ ] **Code freeze:** only fixes for UAT findings. Tag the release: `git tag -a v1.0.0 -m "Go-live" && git push --tags`.

## On the day

| Time | Step | Who |
|---|---|---|
| T-60 min | Announce any maintenance window on the portal banner | Chief COE |
| T-30 min | Backup now (Actions > Nightly database backup > Run workflow) | Release owner |
| T-15 min | Warm up: open `/readyz`, portal and COE panel; check the dashboards | Release owner |
| T-0 | Deploy (merge to `main` or `deploy.yml` > Run workflow) | Release owner |
| T+5 min | **Smoke test** on production: student sign-in, COE sign-in with code, view a result, publish flow on a test department, PDF download, bulk upload preview | Release owner + COE |
| T+5 to T+120 | Watch Render logs, `/readyz`, outage issues | Team on standby |

**Rollback decision:** one named person, the release owner: ______________________. Roll back if the smoke test fails
or 5xx errors persist for 5 minutes (docs/RUNBOOK.md).

## Pilot

First publish **one department** (e.g. CSE Semester I). After a day without problems, publish the rest.

## After one week

Review: errors in the logs, response times, outage issues, user feedback (COE office, HODs, students). Record actions
in the changelog.
