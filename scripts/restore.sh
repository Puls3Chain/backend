#!/usr/bin/env bash
# scripts/restore.sh — Decrypt and restore a PostgreSQL backup
# Usage: ./scripts/restore.sh <backup-file-or-s3-uri> [target-db]
# Env: DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, BACKUP_ENCRYPTION_KEY
set -euo pipefail

BACKUP_SRC="${1:?Usage: $0 <backup-file-or-s3-uri> [target-db]}"
TARGET_DB="${2:-${DB_NAME:-stellartip}}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USERNAME="${DB_USERNAME:-postgres}"
WORK_DIR="$(mktemp -d)"
ENC_FILE="${WORK_DIR}/backup.dump.enc"
DUMP_FILE="${WORK_DIR}/backup.dump"

: "${BACKUP_ENCRYPTION_KEY:?BACKUP_ENCRYPTION_KEY must be set}"

cleanup() { rm -rf "${WORK_DIR}"; }
trap cleanup EXIT

# Download from S3 if URI provided
if [[ "${BACKUP_SRC}" == s3://* ]]; then
  echo "[restore] Downloading ${BACKUP_SRC}"
  aws s3 cp "${BACKUP_SRC}" "${ENC_FILE}"
else
  cp "${BACKUP_SRC}" "${ENC_FILE}"
fi

echo "[restore] Decrypting backup"
openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 \
  -pass "pass:${BACKUP_ENCRYPTION_KEY}" \
  -in "${ENC_FILE}" -out "${DUMP_FILE}"

echo "[restore] Dropping and recreating database: ${TARGET_DB}"
PGPASSWORD="${DB_PASSWORD:-}" psql \
  --host="${DB_HOST}" --port="${DB_PORT}" --username="${DB_USERNAME}" \
  --dbname=postgres -c "DROP DATABASE IF EXISTS \"${TARGET_DB}\";"
PGPASSWORD="${DB_PASSWORD:-}" psql \
  --host="${DB_HOST}" --port="${DB_PORT}" --username="${DB_USERNAME}" \
  --dbname=postgres -c "CREATE DATABASE \"${TARGET_DB}\";"

echo "[restore] Restoring into ${TARGET_DB}"
PGPASSWORD="${DB_PASSWORD:-}" pg_restore \
  --host="${DB_HOST}" --port="${DB_PORT}" --username="${DB_USERNAME}" \
  --dbname="${TARGET_DB}" --jobs=4 --no-owner --no-privileges \
  "${DUMP_FILE}"

echo "[restore] Done — ${TARGET_DB} restored from $(basename "${BACKUP_SRC}")"
