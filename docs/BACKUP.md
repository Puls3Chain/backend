# Database Backup & Restore Runbook

This document describes the backup strategy, recovery procedures, and SLA targets for the StellarTip production database.

## Recovery Targets

| Target                         | Value          | Notes                                                                      |
| ------------------------------ | -------------- | -------------------------------------------------------------------------- |
| RPO (Recovery Point Objective) | **1 hour**     | Maximum data loss window; met by daily full backups + 15-min WAL archiving |
| RTO (Recovery Time Objective)  | **15 minutes** | Time to restore service after declaring an incident                        |

## Backup Schedule

| Type                                      | Frequency        | Time       | Retention |
| ----------------------------------------- | ---------------- | ---------- | --------- |
| Full snapshot (`pg_dump --format=custom`) | Daily            | 02:00 UTC  | 30 days   |
| WAL archiving (`archive_command`)         | Every 15 minutes | Continuous | 7 days    |

### Cron (production server)

```cron
0 2 * * * /opt/stellartip/scripts/backup.sh >> /var/log/stellartip-backup.log 2>&1
```

## Required Environment Variables

| Variable                | Description                                       |
| ----------------------- | ------------------------------------------------- |
| `DB_HOST`               | PostgreSQL host                                   |
| `DB_PORT`               | PostgreSQL port (default `5432`)                  |
| `DB_USERNAME`           | Database user                                     |
| `DB_PASSWORD`           | Database password                                 |
| `DB_NAME`               | Database name                                     |
| `BACKUP_ENCRYPTION_KEY` | AES-256 passphrase for encrypting backups at rest |
| `S3_BUCKET`             | S3 bucket for offsite storage                     |
| `S3_PREFIX`             | Object key prefix (default `backups`)             |
| `RETENTION_DAYS`        | Days to keep S3 objects (default `30`)            |

> Store `BACKUP_ENCRYPTION_KEY` in AWS Secrets Manager or equivalent. Never commit it to the repository.

## Backup Script (`scripts/backup.sh`)

1. Runs `pg_dump --format=custom --jobs=4` (compressed, parallel-capable).
2. Encrypts the dump with AES-256-CBC (PBKDF2, 100 000 iterations) via `openssl enc`.
3. Uploads to `s3://$S3_BUCKET/$S3_PREFIX/stellartip-YYYY-MM-DD-HHMM.dump.enc` using `STANDARD_IA` storage class.
4. Deletes the local plaintext and encrypted files.
5. Prunes S3 objects older than `RETENTION_DAYS` (default 30 days).

```bash
# Manual run
export DB_HOST=... DB_USERNAME=... DB_PASSWORD=... DB_NAME=...
export BACKUP_ENCRYPTION_KEY=... S3_BUCKET=stellartip-backups
./scripts/backup.sh
```

## Restore Script (`scripts/restore.sh`)

Accepts a local file path or an `s3://` URI, plus an optional target database name.

```bash
# From S3
./scripts/restore.sh s3://stellartip-backups/backups/stellartip-2026-06-20-0200.dump.enc stellartip_restored

# From local file
./scripts/restore.sh /tmp/stellartip-2026-06-20-0200.dump.enc
```

Steps performed:

1. Downloads from S3 (if URI given) to a temp directory.
2. Decrypts with `openssl enc -d`.
3. Drops and recreates the target database.
4. Runs `pg_restore --jobs=4 --no-owner --no-privileges`.
5. Cleans up temp files via trap.

## Test-Restore Script (`scripts/test-restore.sh`)

Verifies a backup is restorable and contains data. Run quarterly (also automated in CI).

```bash
# Use latest S3 backup automatically
./scripts/test-restore.sh

# Specify a backup explicitly
./scripts/test-restore.sh s3://stellartip-backups/backups/stellartip-2026-06-20-0200.dump.enc
```

Steps:

1. Resolves the latest S3 backup if no argument is given.
2. Calls `restore.sh` into a temporary `stellartip_restore_test` database.
3. Queries row counts for every table in the `public` schema.
4. Warns on empty tables.
5. Drops the test database.
6. Exits 0 on success, non-zero on any failure.

## WAL Archiving Setup

Add to `postgresql.conf`:

```ini
wal_level = replica
archive_mode = on
archive_command = 'aws s3 cp %p s3://${S3_BUCKET}/wal/%f'
archive_timeout = 900   # 15 minutes
```

## Disaster Recovery Procedure

1. **Declare incident** — notify on-call, open incident channel.
2. **Identify target restore point** — latest snapshot or specific timestamp.
3. **Provision or clear target DB** — restore.sh handles DROP + CREATE automatically.
4. **Run restore**:
   ```bash
   ./scripts/restore.sh s3://stellartip-backups/backups/<filename>.dump.enc
   ```
5. **Verify** — run `test-restore.sh` or spot-check row counts manually.
6. **Update connection strings** if restoring to a new host.
7. **Replay WAL** (if finer point-in-time recovery needed) using `pg_waldump` / PITR.
8. **Resume traffic** — update load balancer / DNS.
9. **Post-incident review** — document timeline and root cause within 48 hours.

## S3 Bucket Policy (Recommended)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyPublicAccess",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::stellartip-backups/*",
      "Condition": {
        "StringNotEquals": { "aws:PrincipalAccount": "<account-id>" }
      }
    }
  ]
}
```

Enable S3 Versioning and Object Lock (compliance mode, 30-day retention) on the bucket.

## Testing Checklist (Quarterly)

- [ ] CI `disaster-recovery-test` job passed (automated)
- [ ] Encryption key accessible from production secrets store
- [ ] S3 retention policy active (objects > 30 days deleted)
- [ ] RTO drill: restore completed within 15 minutes
- [ ] WAL archiving lag < 15 minutes
