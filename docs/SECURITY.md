# Security

## Controls in place

| Area | Control |
|---|---|
| Transport | HTTPS everywhere, HTTP → HTTPS redirect, HSTS (preload) on both frontends and the API |
| Headers | Content-Security-Policy (frontends: scripts only from the site itself; API: `default-src 'none'`), X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, COOP |
| Passwords | BCrypt; at least 10 characters with letters and digits, not containing the username; starting passwords must be changed at first sign-in |
| Two-step sign-in | Required for every COE and the Chief COE (authenticator app, RFC 6238); codes cannot be reused; 8 one-time recovery codes; the Chief COE can reset another officer's |
| Sessions | Random tokens stored only as SHA-256 hashes; 8 h maximum; COE sessions end after 30 idle minutes, others after 2 h; ended on sign-out and on password change |
| Sign-in abuse | Lockout per account+address, per account and per address; picture CAPTCHA after failed attempts; real visitor address from `CF-Connecting-IP` behind Cloudflare |
| Request limits | 120 public / 600 signed-in requests per visitor per minute; 15 MB uploads; paging and a 5,000-row cap on lists |
| Authorisation | Role checked on the server for every route group; a student's register number comes from the session; colleges and departments isolated on the server |
| Input | Every request validated; all SQL parameterised; uploads validated row by row and saved all-or-nothing after a preview |
| Errors | Generic messages only; stack traces never returned; browser errors reported to the server log without personal data |
| Audit | Append-only audit log (database trigger) with old/new values and request ids |
| Database | App user can only read/write rows (no DDL, no audit edits); migrations use the owner; TLS to the database |
| Dependencies | `npm audit` / `pnpm audit` (production) and a licence check in CI; base images pinned by digest |

## Test results (test copy, 17-18 Oct 2026)

- Security smoke test (CI): 48/48: no-session, forged token, role boundaries, cross-student access, injection, headers.
- Earlier full pentest of all 93 endpoints: 592 checks, 0 failures (≈830 SQL injection attempts).
- CSP: both production builds load every page with no violations.
- Accessibility (axe, WCAG 2.1 AA) on the main pages: 0 violations.
- Load: 300 simultaneous users on result day, 44,036 requests, 0 failures, 95th percentile 9.8 ms (results) and
  2.3 ms (public summary) on one backend instance.

## Known limits (accepted for now, with a plan)

- **Student sign-in uses register number + date of birth**, which others may know. Mitigated by lockouts, CAPTCHA and
  rate limits; the fix is a student PIN or OTP to the registered phone (needs the college's phone list).
- **Tokens are kept in the browser's localStorage** because the frontends and API are on different sites. With a
  college domain they move to httpOnly, Secure, SameSite cookies.
- **CAPTCHA, rate limits and the cache are in memory of one instance.** With two or more instances they move to Redis.
- **Old local demo passwords are in the public Git history** (local stack only, 127.0.0.1): rotate them.

## Reporting a vulnerability

E-mail the COE office; do not open a public issue. Fixes are released through the normal CI and deploy process.
