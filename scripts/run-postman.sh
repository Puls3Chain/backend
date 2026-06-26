#!/usr/bin/env bash
# scripts/run-postman.sh — Newman runner for the StellarTip Postman collection
#
# Usage:
#   scripts/run-postman.sh dev
#   scripts/run-postman.sh staging
#   scripts/run-postman.sh prod
#
# Environment overrides:
#   POSTMAN_ENV_FILE    absolute path to an environment JSON (skips resolution)
#   POSTMAN_COLLECTION  absolute path to the collection JSON
#   POSTMAN_REPORT_DIR  output directory (default: postman/reports)
#
# Exits non-zero if any Newman test fails. Designed for CI as well as local runs.

set -euo pipefail

ENVIRONMENT="${1:-dev}"
case "${ENVIRONMENT}" in
  dev|staging|prod) ;;
  *)
    echo "[run-postman] Unknown environment: ${ENVIRONMENT}" >&2
    echo "[run-postman] Expected one of: dev, staging, prod" >&2
    exit 2
    ;;
esac

# --- Node version gate -------------------------------------------------------
# Newman requires Node >= 18 (matches the issue acceptance criteria).
node_minor="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
if [ "${node_minor}" -lt 18 ]; then
  echo "[run-postman] Node 18+ is required to run Newman. Detected major: ${node_minor}" >&2
  exit 3
fi

# --- Path resolution ---------------------------------------------------------
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
COLLECTION="${POSTMAN_COLLECTION:-${REPO_ROOT}/postman/StellarTip.postman_collection.json}"
ENV_FILE="${POSTMAN_ENV_FILE:-${REPO_ROOT}/postman/environments/${ENVIRONMENT}.json}"
REPORT_DIR="${POSTMAN_REPORT_DIR:-${REPO_ROOT}/postman/reports}"

if [ ! -f "${COLLECTION}" ]; then
  echo "[run-postman] Collection not found at: ${COLLECTION}" >&2
  exit 4
fi
if [ ! -f "${ENV_FILE}" ]; then
  echo "[run-postman] Environment file not found at: ${ENV_FILE}" >&2
  exit 4
fi

mkdir -p "${REPORT_DIR}"

# --- Newman invocation -------------------------------------------------------
# Notes:
#  * `--bail` short-circuits at the first failing request — matches the
#    'exits with a non-zero code on failure' acceptance criterion and keeps CI
#    feedback fast.
#  * `--global-delay 200` adds a small wait between requests so we don't trip
#    the @nestjs/throttler on shared dev/staging instances (the CI workflow
#    temporarily raises THROTTLE_LIMIT to 1000 to compensate).
#  * Reporters produce both the human-readable CLI summary AND a JUnit XML so
#    CI runners can render a structured failure table.
#  * `npx --no-install newman` uses the locally installed binary from the
#    `newman` devDep in package.json; it never silently falls back to a
#    globally-installed copy.
echo "[run-postman] Running Newman against ${ENVIRONMENT} (${ENV_FILE})"
npx --no-install newman run "${COLLECTION}" \
  --environment "${ENV_FILE}" \
  --reporters cli,junit \
  --reporter-junit-export "${REPORT_DIR}/newman-${ENVIRONMENT}.xml" \
  --global-delay 200 \
  --bail
