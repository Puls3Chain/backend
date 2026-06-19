## v0.1.0 - 2026-06-19

### Added

-

### Changed




### Deprecated

-

### Removed

-

### Fixed

-

<details>
<summary>OpenAPI diff (raw)</summary>






















































































```
Command failed: npx openapi-diff docs/openapi/previous.json docs/openapi/current.json
OpenApiDiffErrorImpl [VError]: Unable to read "docs/openapi/previous.json": ENOENT: no such file or directory, open '/workspaces/StellarTip-Backend/docs/openapi/previous.json'
    at ContentLoader.<anonymous> (/home/codespace/.npm/_npx/e17b800041415d85/node_modules/openapi-diff/dist/openapi-diff/content-loader.js:35:23)
    at Generator.throw (<anonymous>)
    at rejected (/home/codespace/.npm/_npx/e17b800041415d85/node_modules/openapi-diff/dist/openapi-diff/content-loader.js:6:65) {
  jse_shortmsg: 'Unable to read "docs/openapi/previous.json"',
  jse_cause: [Error: ENOENT: no such file or directory, open '/workspaces/StellarTip-Backend/docs/openapi/previous.json'] {
    errno: -2,
    code: 'ENOENT',
    syscall: 'open',
    path: '/workspaces/StellarTip-Backend/docs/openapi/previous.json'
  },
  jse_info: {},
  code: 'OPENAPI_DIFF_READ_ERROR'
}

```


# API Changelog

This file tracks OpenAPI diffs between releases. Entries are generated from OpenAPI snapshots and openapi-diff.

## v0.1.0 - 2026-06-19

### Added

- Initial API surface (seeded from current codebase)

### Changed

- None

### Deprecated

- None

### Removed

- None

### Fixed

- None
