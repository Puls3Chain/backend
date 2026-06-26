# Security headers

The API configures baseline browser security headers during bootstrap in
`src/config/security.config.ts`.

## Helmet policy

`helmet()` is configured with:

- Content Security Policy limited to `self`, with inline scripts and styles kept
  only so the Swagger UI at `/api/docs` can render correctly.
- HSTS with `max-age=31536000`, `includeSubDomains`, and `preload`.
- `X-Content-Type-Options: nosniff`.
- `X-XSS-Protection: 0` through Helmet's `xssFilter` middleware.
- `Referrer-Policy: strict-origin-when-cross-origin`.
- `X-Frame-Options: DENY`.
- `X-Permitted-Cross-Domain-Policies: none`.
- `Permissions-Policy: geolocation=(), camera=(), microphone=()`.

If Swagger UI is moved behind a CDN or external asset host, add only the exact
host needed to the relevant CSP directive.

## CORS

Set `CORS_ORIGIN` to control browser origins:

```bash
CORS_ORIGIN=https://app.stellartip.dev
```

Multiple origins are comma-separated:

```bash
CORS_ORIGIN=https://app.stellartip.dev,https://admin.stellartip.dev
```

`CORS_ORIGIN=*` is allowed for local or public read-only deployments, but the
API refuses credentialed CORS in that mode. Specific origins enable credentials.

Avoid using wildcard CORS for production sessions, dashboards, or any route that
depends on cookies or authorization headers.

## Input sanitization policy

All freeform user-generated text fields (bio, display names, tip messages) are
sanitized via `src/shared/sanitization/text-sanitizer.ts` using
[sanitize-html](https://github.com/apostrophecms/sanitize-html) with an empty
allowlist so output is always plain text. This prevents stored XSS attacks where
one user's input could execute in other users' browsers.

Rules enforced on every text field:

- All HTML tags and attributes stripped (`allowedTags: []`, `allowedAttributes: {}`)
- Control characters removed (`\x00–\x08`, `\x0B`, `\x0C`, `\x0E–\x1F`, `\x7F`)
- Tab (`\t`) and newline (`\n`) are preserved
- Unicode normalized to NFC before storage
- Per-field length limits: bio ≤ 500 chars, displayName ≤ 60 chars, tip message ≤ 280 chars

URL fields (avatarUrl, social links) are validated via `@IsUrl` with
`protocols: ['https']` to reject `javascript:`, `data:`, and `vbscript:` schemes.

## Dependency vulnerability management

### Scanning pipeline

| Stage                          | Tool                                       | Threshold | Trigger                                                 |
| ------------------------------ | ------------------------------------------ | --------- | ------------------------------------------------------- |
| PR / push to `main`            | `npm audit` (prod deps only)               | high +    | `.github/workflows/security-audit.yml` → `npm-audit`    |
| PR / push to `main`            | CodeQL (`security-and-quality` query pack) | —         | `.github/workflows/security-audit.yml` → `codeql`       |
| PR / push to `main` (opt-in)   | Snyk CLI (`snyk test` + `snyk code test`)  | high +    | `.github/workflows/security-audit.yml` → `snyk-test`    |
| After merge to `main` (opt-in) | Snyk monitor (drift baseline)              | —         | `.github/workflows/security-audit.yml` → `snyk-monitor` |
| Weekly cron                    | `npm audit` (full dep tree)                | high +    | `.github/workflows/security-drift.yml`                  |

The PR-time `npm-audit` job omits devDependencies because most devDeps are
not loaded at runtime. The weekly drift job audits the full tree.

CodeQL results appear under the repository **Security** tab and on every
PR via the **Files Changed → Code scanning alerts** view.

### Merge policy

- **Critical / high**: blocks the merge. The `npm-audit` (or `snyk-test`)
  job fails the workflow and the PR cannot be merged until the dependency
  is bumped or a documented suppression is added (see below). Both of those
  changes must themselves pass the same gate for every other package.
- **Medium**: tracked in the weekly drift report. Acknowledged in the
  follow-up issue opened by `security-drift.yml`.
- **Low / info**: ignored at gate-level. Surfaced in the Snyk dashboard
  for awareness.

### Response SLA

| Severity | Mitigation target |
| -------- | ----------------- |
| Critical | ≤ 24 hours        |
| High     | ≤ 7 days          |
| Medium   | ≤ 30 days         |
| Low      | Best-effort       |

### Suppression policy (`.snyk`)

A documented suppression is the **only** way to merge a known-vulnerable
dependency. Each entry must include:

- **`reason`** — explain why the vulnerability cannot affect this project
  (e.g. used only by a dev-only code path, not loaded at runtime,
  confidentiality impact exhausted by sanitization, etc.).
- **`expires`** — ISO 8601 date, no more than 90 days out. Suppressions
  expire by design to bound technical debt and force re-review.
- **`created`** — ISO 8601 date when the entry was authored.

The schema lives in `.snyk`. The file currently declares `ignore: {}` and
`patch: {}` explicitly to make the all-active default auditable in code
review.

### Local reproduction

```bash
# High+ check, omitting dev deps (mirrors the CI gate)
npm audit --audit-level=high --omit=dev
# Same, but also audits devDependencies (mirrors the weekly drift job)
npm audit --audit-level=high
```

### Weekly drift job

`.github/workflows/security-drift.yml` runs every **Monday at 01:00 UTC**
and also on `workflow_dispatch`.

- The `drift-detect` job runs `npm audit --audit-level=high` against the
  full dep tree and uploads the raw JSON as a workflow artifact (90-day
  retention).
- The `drift-issue` job opens (or keeps) a single `security,weekly-drift`
  labelled issue describing the drift and closes any previous one when the
  next run is clean.
