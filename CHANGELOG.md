# Changelog

## Unreleased — production hardening (18 Oct 2026)

**Security**
- Two-step sign-in (authenticator app + recovery codes) required for COE and Chief COE accounts; Chief COE can reset
  an officer's; COE sessions end after 30 idle minutes.
- Picture CAPTCHA after failed sign-ins; the real visitor address is used behind Cloudflare (lockouts no longer hit
  everyone behind a shared edge address); per-visitor request rate limits.
- Content-Security-Policy and Permissions-Policy on both sites; strict CSP on the API.
- Audit log is append-only in the database and records old and new values; retention job.
- Least-privilege database user for the application; migrations use the owner.

**Results**
- New *Withdrawn* state with a required reason; withdrawing replaces "unpublish".
- Mark entry refuses to overwrite someone else's newer save; database checks on mark totals; wrong-length mark rows
  are repaired on upgrade (fixes the Mark Entry crash for FUY subject 1).
- Student uploads show a preview and are saved only after confirmation.

**Reliability and performance**
- `/api/v1` with a published OpenAPI contract and shared TypeScript types.
- Results cache with invalidation; paging on every list; request ids in logs; graceful shutdown; compression;
  `/readyz` health check.
- COE panel pages load on demand (first download 1.6 MB → about 310 KB).

**Operations**
- CI (tests on PostgreSQL, security smoke test, API contract, builds, audits, licences), deploy from `main`, nightly
  encrypted backups, uptime monitor with outage issues.
- Error pages (404, error boundary), status, maintenance, privacy and terms pages; footer with disclaimer and support.
- Accessibility fixes (WCAG 2.1 AA on the main pages).
- Documentation: manuals, runbook, recovery plan, UAT and go-live plans.

## 17 Oct 2026
- Student Data lists and clears one class only (department + year + semester + academic year); HOD tabs fit phones.
- Engineering Semester I subjects added to the hosted demo.

## 16 Oct 2026
- Faculty portal banner and fixed sidebar; faculty experience from joining date; show-password buttons.
- Server wake-up banner; college-format student sheets.
