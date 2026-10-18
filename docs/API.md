# API

- **Description:** [`docs/openapi.json`](openapi.json) (OpenAPI 3, 77 endpoints). Open it in https://editor.swagger.io
  or any OpenAPI viewer. TypeScript types generated from it: [`shared/api-types.ts`](../shared/api-types.ts).
- **Base path:** `/api/v1`. The old unversioned `/api/...` paths still answer, with a `Deprecation: true` header and a
  `Link` to the `/api/v1` path; they will be removed in a later release after both frontends use v1 (they do now).
- **Auth:** `Authorization: Bearer <token>` from `POST /api/v1/auth/login`. COE accounts send `otp` (authenticator
  code) too; after failed attempts the response asks for a picture challenge (`captchaRequired`).
- **Errors:** JSON `{"error": "<message safe to show>"}` plus optional fields (`otpRequired`, `captchaRequired`,
  `mfaSetupRequired`, `passwordChangeRequired`, `errors` for row-level upload errors). Never stack traces.
- **Lists:** every list endpoint accepts `?page=0&size=50` (max 500 per page) and returns `X-Total-Count`; without
  them at most 5,000 rows are returned.
- **Request ids:** every response has `X-Request-Id` (also in the server log and the audit log).

## Rules for changing the API

1. Add, never rename or remove, response fields while either frontend may still read them.
2. A breaking change gets a new version (`/api/v2/...`) next to v1.
3. After changing an endpoint, regenerate the description and types, and commit them with the change:

```bash
# backend running with API_DOCS_ENABLED=true on port 8080
curl -s http://127.0.0.1:8080/v3/api-docs | python -c "import sys,json; d=json.load(sys.stdin); \
  d['servers']=[{'url':'https://kvell-result-api.onrender.com','description':'Hosted demo'}]; \
  json.dump(d, open('docs/openapi.json','w'), indent=2, sort_keys=True)"
npx openapi-typescript@7.4.4 docs/openapi.json -o shared/api-types.ts
```

CI fails when `docs/openapi.json` does not match the code.
