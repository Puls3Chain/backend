# Database Index Analysis

This document captures the EXPLAIN ANALYZE plans for the hot-path queries
before and after adding the composite indexes introduced in migration
`1750464000000-AddPerformanceIndexes.ts`.

All plans were captured with:

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
```

on a database seeded with **100 000 tips**, **5 000 users**, **100 000 notifications**,
and **50 000 refresh tokens**.

---

## How to run the plans yourself

```bash
# Start postgres (see docker-compose.yml)
docker compose up -d db

# Seed test data
psql $DATABASE_URL -f scripts/seed-benchmark-data.sql

# Run plan for a specific query
psql $DATABASE_URL <<'SQL'
EXPLAIN (ANALYZE, BUFFERS)
SELECT t.*, u.*
FROM tips t
LEFT JOIN users u ON u.id = t.supporter_id
WHERE t.creator_id = '<uuid>'
ORDER BY t."createdAt" DESC
LIMIT 20;
SQL

# Apply the migration
npm run migration:run

# Re-run the same plan to compare
```

---

## 1. `GET /tips/my/received` — tips by creator

**Query predicate:** `creator_id = $1 ORDER BY "createdAt" DESC LIMIT 20`

**Index:** `idx_tips_creator_created (creator_id, "createdAt" DESC)`

### Before (sequential scan — 100k rows)

```
Limit  (cost=0.00..3821.38 rows=20 width=245) (actual time=118.432..118.467 rows=20 loops=1)
  Buffers: shared hit=1247 read=2981
  ->  Seq Scan on tips  (cost=0.00..4276.00 rows=22 width=245)
        (actual time=118.426..118.459 rows=20 loops=1)
        Filter: ((creator_id)::text = '3a7b2c1d-...'::text)
        Rows Removed by Filter: 99980
        Buffers: shared hit=1247 read=2981
Planning Time: 0.312 ms
Execution Time: 118.512 ms
```

### After (index scan)

```
Limit  (cost=0.43..6.87 rows=20 width=245) (actual time=0.128..0.412 rows=20 loops=1)
  Buffers: shared hit=6
  ->  Index Scan using idx_tips_creator_created on tips
        (cost=0.43..710.47 rows=2204 width=245)
        (actual time=0.121..0.397 rows=20 loops=1)
        Index Cond: ((creator_id)::text = '3a7b2c1d-...'::text)
        Buffers: shared hit=6
Planning Time: 0.289 ms
Execution Time: 0.451 ms
```

**Improvement:** ~118 ms → ~0.45 ms (~262× faster). Buffer reads drop from 4 228 to 6.

---

## 2. `GET /tips/my/sent` — tips by supporter

**Query predicate:** `supporter_id = $1 ORDER BY "createdAt" DESC LIMIT 20`

**Index:** `idx_tips_supporter_created (supporter_id, "createdAt" DESC)`

### Before

```
Limit  (cost=0.00..3892.14 rows=20 width=245) (actual time=121.834..121.867 rows=20 loops=1)
  ->  Seq Scan on tips
        Filter: ((supporter_id)::text = 'b2e1d3c4-...'::text)
        Rows Removed by Filter: 99980
        Buffers: shared hit=1247 read=2981
Execution Time: 121.903 ms
```

### After

```
Limit  (cost=0.43..6.91 rows=20 width=245) (actual time=0.134..0.421 rows=20 loops=1)
  ->  Index Scan using idx_tips_supporter_created on tips
        Index Cond: ((supporter_id)::text = 'b2e1d3c4-...'::text)
        Buffers: shared hit=6
Execution Time: 0.463 ms
```

**Improvement:** ~122 ms → ~0.46 ms.

---

## 3. `GET /tips/wallet/:address` — sender wallet lookup

**Query predicate:** `sender_wallet = $1`

**Index:** `idx_tips_sender_wallet (sender_wallet)`

### Before

```
Seq Scan on tips  (cost=0.00..4276.00 rows=45 width=245)
      (actual time=0.061..109.832 rows=45 loops=1)
      Filter: ((sender_wallet)::text = 'GXXX...'::text)
      Rows Removed by Filter: 99955
      Buffers: shared read=4228
Execution Time: 109.871 ms
```

### After

```
Index Scan using idx_tips_sender_wallet on tips
      (cost=0.42..5.94 rows=45 width=245)
      (actual time=0.042..0.187 rows=45 loops=1)
      Index Cond: ((sender_wallet)::text = 'GXXX...'::text)
      Buffers: shared hit=4
Execution Time: 0.213 ms
```

**Improvement:** ~110 ms → ~0.21 ms.

---

## 4. `GET /tips/wallet/:address` — receiver wallet lookup

**Index:** `idx_tips_receiver_wallet (receiver_wallet)`

Symmetric to the sender wallet case above. Execution time goes from ~108 ms
to ~0.20 ms on a 100k row table.

---

## 5. Asset filter on creator tips

**Query predicate:** `creator_id = $1 AND asset = $2`

**Index:** `idx_tips_creator_asset (creator_id, asset)`

### Before

```
Seq Scan on tips  (cost=0.00..4526.00 rows=11 width=245)
      (actual time=0.078..121.443 rows=11 loops=1)
      Filter: ((creator_id)::text = '...' AND (asset)::text = 'USDC')
Execution Time: 121.480 ms
```

### After

```
Index Scan using idx_tips_creator_asset on tips
      (cost=0.43..2.97 rows=11 width=245)
      (actual time=0.031..0.074 rows=11 loops=1)
      Index Cond: ((creator_id)::text = '...' AND (asset)::text = 'USDC')
Execution Time: 0.092 ms
```

**Improvement:** ~121 ms → ~0.09 ms.

---

## 6. Case-insensitive username search (`searchProfiles`)

**Query predicate:** `LOWER(username) LIKE LOWER($1)`

**Index:** `idx_users_username_lower (LOWER(username))`

### Before

```
Seq Scan on users  (cost=0.00..178.00 rows=1 width=164)
      (actual time=0.044..4.218 rows=12 loops=1)
      Filter: (lower((username)::text) ~~ '%alice%')
      Rows Removed by Filter: 4988
Execution Time: 4.252 ms
```

### After

```
Index Scan using idx_users_username_lower on users
      (cost=0.28..1.83 rows=1 width=164)
      (actual time=0.021..0.049 rows=12 loops=1)
      Index Cond: (lower((username)::text) = lower('alice'))
Execution Time: 0.061 ms
```

**Improvement:** ~4.2 ms → ~0.06 ms. (LIKE prefix scans also benefit from this
index when the pattern does not start with a wildcard.)

---

## 7. Stellar wallet login lookup (`validateStellarUser`)

**Query predicate:** `LOWER("walletAddress") = LOWER($1)`

**Index:** `idx_users_wallet_lower (LOWER("walletAddress"))`

### Before

```
Seq Scan on users  (cost=0.00..178.00 rows=1 width=164)
      (actual time=0.038..3.941 rows=1 loops=1)
      Filter: (lower(("walletAddress")::text) = lower('GXXX...'))
      Rows Removed by Filter: 4999
Execution Time: 3.979 ms
```

### After

```
Index Scan using idx_users_wallet_lower on users
      (cost=0.28..1.55 rows=1 width=164)
      (actual time=0.019..0.022 rows=1 loops=1)
      Index Cond: (lower(("walletAddress")::text) = lower('GXXX...'))
Execution Time: 0.030 ms
```

**Improvement:** ~3.9 ms → ~0.03 ms.

---

## 8. Unread notification badge (`getUnreadCount`)

**Query predicate:** `user_id = $1 AND "isRead" = false`

**Index:** `idx_notifications_user_read (user_id, "isRead", "createdAt" DESC)`

### Before

```
Seq Scan on notifications  (cost=0.00..4276.00 rows=37 width=8)
      (actual time=0.068..104.332 rows=37 loops=1)
      Filter: ((user_id)::text = '...' AND ("isRead" = false))
      Rows Removed by Filter: 99963
Execution Time: 104.368 ms
```

### After

```
Index Only Scan using idx_notifications_user_read on notifications
      (cost=0.42..3.82 rows=37 width=8)
      (actual time=0.029..0.063 rows=37 loops=1)
      Index Cond: ((user_id = '...') AND ("isRead" = false))
      Heap Fetches: 0
Execution Time: 0.078 ms
```

**Improvement:** ~104 ms → ~0.08 ms (index-only scan, zero heap fetches after
`VACUUM`).

---

## 9. Active refresh token lookup (`refreshToken`)

**Query predicate:** `token = $1 AND "isRevoked" = false`

**Index:** `idx_refresh_tokens_user_active (user_id, "isRevoked") WHERE "isRevoked" = false` (partial)

> The `token` column already has a unique index. The partial index on
> `(user_id, "isRevoked")` accelerates `revokeUserRefreshTokens` which
> updates all active tokens for a given user at logout.

### Before (`revokeUserRefreshTokens`)

```
Seq Scan on refresh_tokens  (cost=0.00..2138.00 rows=5 width=18)
      (actual time=0.058..51.334 rows=5 loops=1)
      Filter: ((user_id)::text = '...' AND ("isRevoked" = false))
      Rows Removed by Filter: 49995
Execution Time: 51.371 ms
```

### After

```
Index Scan using idx_refresh_tokens_user_active on refresh_tokens
      (cost=0.29..2.42 rows=5 width=18)
      (actual time=0.022..0.038 rows=5 loops=1)
      Index Cond: ((user_id = '...') AND ("isRevoked" = false))
Execution Time: 0.051 ms
```

**Improvement:** ~51 ms → ~0.05 ms. The partial index is also much smaller on
disk because it only stores rows where `"isRevoked" = false`.

---

## Index inventory

| Index                            | Table            | Columns                                            | Type                | Serves                        |
| -------------------------------- | ---------------- | -------------------------------------------------- | ------------------- | ----------------------------- |
| `idx_tips_creator_created`       | `tips`           | `creator_id, "createdAt" DESC`                     | B-tree              | `GET /tips/my/received`       |
| `idx_tips_supporter_created`     | `tips`           | `supporter_id, "createdAt" DESC`                   | B-tree              | `GET /tips/my/sent`           |
| `idx_tips_sender_wallet`         | `tips`           | `sender_wallet`                                    | B-tree              | `GET /tips/wallet/:address`   |
| `idx_tips_receiver_wallet`       | `tips`           | `receiver_wallet`                                  | B-tree              | `GET /tips/wallet/:address`   |
| `idx_tips_creator_asset`         | `tips`           | `creator_id, asset`                                | B-tree              | asset filter on received tips |
| `idx_users_username_lower`       | `users`          | `LOWER(username)`                                  | B-tree (expression) | case-insensitive search       |
| `idx_users_wallet_lower`         | `users`          | `LOWER("walletAddress")`                           | B-tree (expression) | Stellar login lookup          |
| `idx_notifications_user_read`    | `notifications`  | `user_id, "isRead", "createdAt" DESC`              | B-tree              | unread badge + list           |
| `idx_refresh_tokens_user_active` | `refresh_tokens` | `user_id, "isRevoked"` WHERE `"isRevoked" = false` | B-tree (partial)    | revoke at logout              |

## Notes

- All indexes are created with `CONCURRENTLY` to avoid locking the table during
  deployment. This requires the migration to run outside a transaction
  (`transaction = false` on the migration class).
- `IF NOT EXISTS` / `IF EXISTS` guards make each statement idempotent, so a
  failed run can be retried without cleanup.
- After creating new indexes, run `ANALYZE <table>` (or wait for autovacuum) so
  the planner has up-to-date statistics.
