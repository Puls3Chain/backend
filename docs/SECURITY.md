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
