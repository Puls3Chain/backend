#!/usr/bin/env bash
# scripts/test-restore.sh — Restore latest backup to a fresh DB and verify row counts
# Usage: ./scripts/test-restore.sh [s3-uri]
# Env: DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, BACKUP_ENCRYPTION_KEY, S3_BUCKET, S3_PREFIX
set -euo pipefail

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USERNAME="${DB_USERNAME:-postgres}"
S3_PREFIX="${S3_PREFIX:-backups}"
TEST_DB="stellartip_restore_test"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

: "${BACKUP_ENCRYPTION_KEY:?BACKUP_ENCRYPTION_KEY must be set}"

# Resolve backup source: explicit arg or latest from S3
if [ -n "${1:-}" ]; then
  BACKUP_SRC="${1}"
else
  : "${S3_BUCKET:?S3_BUCKET must be set when no backup file is given}"
  echo "[test-restore] Resolving latest backup from s3://${S3_BUCKET}/${S3_PREFIX}/"
  BACKUP_SRC="s3://${S3_BUCKET}/$(aws s3api list-objects-v2 \
    --bucket "${S3_BUCKET}" --prefix "${S3_PREFIX}/" \
    --query 'sort_by(Contents,&LastModified)[-1].Key' \
    --output text)"
fi

echo "[test-restore] Source: ${BACKUP_SRC}"

# Restore into throw-away database
DB_NAME="${TEST_DB}" "${SCRIPT_DIR}/restore.sh" "${BACKUP_SRC}" "${TEST_DB}"

echo "[test-restore] Verifying row counts"
PGPASSWORD="${DB_PASSWORD:-}" psql \
  --host="${DB_HOST}" --port="${DB_PORT}" --username="${DB_USERNAME}" \
  --dbname="${TEST_DB}" --tuples-only --no-align \
  -c "SELECT tablename FROM pg_tables WHERE schemaname='public';" \
  | while read -r table; do
      [ -z "${table}" ] && continue
      count=$(PGPASSWORD="${DB_PASSWORD:-}" psql \
        --host="${DB_HOST}" --port="${DB_PORT}" --username="${DB_USERNAME}" \
        --dbname="${TEST_DB}" --tuples-only --no-align \
        -c "SELECT COUNT(*) FROM \"${table}\";")
      echo "[test-restore]   ${table}: ${count} rows"
      if [ "${count}" -eq 0 ]; then
        echo "[test-restore] WARNING: ${table} is empty — manual review recommended"
      fi
  done

echo "[test-restore] Cleaning up test database"
PGPASSWORD="${DB_PASSWORD:-}" psql \
  --host="${DB_HOST}" --port="${DB_PORT}" --username="${DB_USERNAME}" \
  --dbname=postgres -c "DROP DATABASE IF EXISTS \"${TEST_DB}\";"

echo "[test-restore] PASSED"
