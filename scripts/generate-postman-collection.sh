#!/usr/bin/env bash
# scripts/generate-postman-collection.sh
#
# Regenerate a baseline Postman collection from the live OpenAPI spec served
# by the NestJS app at /api/docs-json. The output is written to a *scratch*
# path so reviewers can diff it against the hand-curated, test-bearing
# collection in `postman/StellarTip.postman_collection.json`.
#
# This script intentionally does NOT overwrite the checked-in collection.
# The hand-curated collection carries request descriptions, example bodies,
# and pm.test assertions that the OpenAPI spec does not provide — auto-merge
# would drop every one of them.
#
# Usage:
#   scripts/generate-postman-collection.sh                       # http://localhost:3000
#   scripts/generate-postman-collection.sh https://api.stellartip.dev
#   BASE_URL=http://localhost:3000 scripts/generate-postman-collection.sh
#
# Environment overrides:
#   BASE_URL         Origin serving /api/docs-json (default: http://localhost:3000)
#   OUTPUT_PATH      Destination for the generated collection JSON
#                    (default: postman/tmp/StellarTip.generated.postman_collection.json)
#
# Exit codes:
#   0 success
#   1 generic failure
#   2 invalid CLI argument
#   3 network or OpenAPI spec unparseable
#   4 generated artifact failed to parse

set -euo pipefail

BASE_URL="${1:-${BASE_URL:-http://localhost:3000}}"
SPEC_URL="${BASE_URL%/}/api/docs-json"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
OUTPUT_PATH="${OUTPUT_PATH:-${REPO_ROOT}/postman/tmp/StellarTip.generated.postman_collection.json}"

if [[ ! "${BASE_URL}" =~ ^https?:// ]]; then
  echo "[generate-postman] BASE_URL must start with http(s):// — got: ${BASE_URL}" >&2
  exit 2
fi

# Resolve the converter CLI. `npx --no-install` honours the locally
# installed devDep from package.json without falling back to a global copy,
# and works whether or not `node_modules/.bin` is on PATH.
if command -v openapi2postmanv2 >/dev/null 2>&1; then
  CONVERTER=(openapi2postmanv2)
elif [ -x "${REPO_ROOT}/node_modules/.bin/openapi2postmanv2" ]; then
  CONVERTER=("${REPO_ROOT}/node_modules/.bin/openapi2postmanv2")
else
  CONVERTER=(npx --no-install openapi2postmanv2)
fi

mkdir -p "$(dirname "${OUTPUT_PATH}")"

echo "[generate-postman] Fetching OpenAPI spec from ${SPEC_URL}"
if ! spec_json="$(curl --fail --silent --show-error --max-time 30 "${SPEC_URL}")"; then
  echo "[generate-postman] Failed to download ${SPEC_URL}. Is the API running on ${BASE_URL}?" >&2
  exit 3
fi

# Persist the raw spec for debugging — convert happens from this file so
# any HTTP drift between the curl and the converter is impossible.
spec_path="${OUTPUT_PATH%.json}.openapi.json"
printf '%s' "${spec_json}" > "${spec_path}"

echo "[generate-postman] Converting spec → Postman v2.1 collection"
# `-p` enables pretty-print; `-O` writes directly to disk.
"${CONVERTER[@]}" -s "${spec_path}" -o "${OUTPUT_PATH}" -p -O

if ! node -e "JSON.parse(require('fs').readFileSync('${OUTPUT_PATH}', 'utf8'))" >/dev/null 2>&1; then
  echo "[generate-postman] Generated artifact at ${OUTPUT_PATH} is not valid JSON" >&2
  exit 4
fi

echo "[generate-postman] Wrote generated collection to ${OUTPUT_PATH}"
echo "[generate-postman] Compare against the hand-curated collection with:"
echo "  diff -u ${REPO_ROOT}/postman/StellarTip.postman_collection.json ${OUTPUT_PATH}"
