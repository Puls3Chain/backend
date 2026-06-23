#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

pass=0
fail=0

check() {
  local description="$1"
  shift
  if "$@"; then
    echo "PASS: $description"
    pass=$((pass + 1))
  else
    echo "FAIL: $description"
    fail=$((fail + 1))
  fi
}

check "release.yml exists" test -f .github/workflows/release.yml
check "release-please.yml exists" test -f .github/workflows/release-please.yml
check "release-please config exists" test -f release-please-config.json
check "release-please manifest exists" test -f .release-please-manifest.json
check "CHANGELOG.md exists" test -f CHANGELOG.md
check "commitlint config exists" test -f commitlint.config.js
check "husky commit-msg hook exists" test -x .husky/commit-msg
check "docker entrypoint exists" test -x scripts/docker-entrypoint.sh
check "initial migration exists" test -f src/migrations/1740000000000-InitialSchema.ts
check "data source exists" test -f src/config/data-source.ts
check "CONTRIBUTING documents releases" grep -q "## Releases" CONTRIBUTING.md
check "README has release badge" grep -q "github/v/release" README.md
check "README has downloads badge" grep -q "github/downloads" README.md
check "release.yml triggers on v* tags" grep -q "tags:" .github/workflows/release.yml && grep -q "'v\\*'" .github/workflows/release.yml
check "release.yml tags GHCR image with version" grep -Eq 'IMAGE_NAME.*:v|stellartip/backend:v' .github/workflows/release.yml
check "release.yml tags GHCR image with latest" grep -Eq 'IMAGE_NAME.*:latest|stellartip/backend:latest' .github/workflows/release.yml
check "release.yml verifies migrations" grep -q "migration:run" .github/workflows/release.yml
check "package.json has migration:run script" node -e "const p=require('./package.json'); process.exit(p.scripts['migration:run']?0:1)"
check "release-please config includes feat section" node -e "const c=require('./release-please-config.json'); process.exit(c.packages['.']['changelog-sections'].some(s=>s.type==='feat')?0:1)"
check "dist data-source compiled" test -f dist/config/data-source.js
check "dist migration compiled" test -f dist/migrations/1740000000000-InitialSchema.js
check "commitlint accepts conventional commit" bash -c 'echo "feat: test release setup" | npx --no commitlint >/dev/null'
check "commitlint rejects invalid commit" bash -c '! echo "bad commit message" | npx --no commitlint >/dev/null 2>&1'

echo
echo "Verification complete: $pass passed, $fail failed"
test "$fail" -eq 0
