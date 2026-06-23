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
