#!/usr/bin/env bash
# scripts/backup.sh — PostgreSQL backup with AES-256 encryption and S3 upload
# Usage: ./scripts/backup.sh
# Env: DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME,
#      BACKUP_ENCRYPTION_KEY, S3_BUCKET, S3_PREFIX (optional), BACKUP_DIR (optional)
set -euo pipefail

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USERNAME="${DB_USERNAME:-postgres}"
DB_NAME="${DB_NAME:-stellartip}"
BACKUP_DIR="${BACKUP_DIR:-/tmp/stellartip-backups}"
S3_PREFIX="${S3_PREFIX:-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP="$(date -u '+%Y-%m-%d-%H%M')"
DUMP_FILE="${BACKUP_DIR}/stellartip-${TIMESTAMP}.dump"
ENC_FILE="${DUMP_FILE}.enc"

: "${BACKUP_ENCRYPTION_KEY:?BACKUP_ENCRYPTION_KEY must be set}"
: "${S3_BUCKET:?S3_BUCKET must be set}"

mkdir -p "${BACKUP_DIR}"

echo "[backup] Starting pg_dump for ${DB_NAME} at ${TIMESTAMP}"
PGPASSWORD="${DB_PASSWORD:-}" pg_dump \
  --host="${DB_HOST}" \
  --port="${DB_PORT}" \
  --username="${DB_USERNAME}" \
  --format=custom \
  --jobs=4 \
  --file="${DUMP_FILE}" \
  "${DB_NAME}"

echo "[backup] Encrypting with AES-256"
openssl enc -aes-256-cbc -pbkdf2 -iter 100000 \
  -pass "pass:${BACKUP_ENCRYPTION_KEY}" \
  -in "${DUMP_FILE}" -out "${ENC_FILE}"
rm -f "${DUMP_FILE}"

echo "[backup] Uploading to s3://${S3_BUCKET}/${S3_PREFIX}/stellartip-${TIMESTAMP}.dump.enc"
aws s3 cp "${ENC_FILE}" \
  "s3://${S3_BUCKET}/${S3_PREFIX}/stellartip-${TIMESTAMP}.dump.enc" \
  --storage-class STANDARD_IA

echo "[backup] Removing local encrypted file"
rm -f "${ENC_FILE}"

echo "[backup] Pruning S3 objects older than ${RETENTION_DAYS} days"
CUTOFF="$(date -u -d "${RETENTION_DAYS} days ago" '+%Y-%m-%dT%H:%M:%SZ')"
aws s3api list-objects-v2 \
  --bucket "${S3_BUCKET}" \
  --prefix "${S3_PREFIX}/" \
  --query "Contents[?LastModified<='${CUTOFF}'].Key" \
  --output text | tr '\t' '\n' | while read -r key; do
    [ -z "${key}" ] && continue
    echo "[backup] Deleting old object: ${key}"
    aws s3api delete-object --bucket "${S3_BUCKET}" --key "${key}"
done

echo "[backup] Done — stellartip-${TIMESTAMP}.dump.enc"
