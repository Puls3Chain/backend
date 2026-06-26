# Runbook: Database Down

> **Severity:** P1 — Service impacted  
> **Affects:** All API endpoints requiring persistence (tips, profiles, auth)

---

## Symptoms

- `GET /health/ready` returns `503 Service Unavailable`
- API requests return `500` or connection-timeout errors
- Logs contain: `ECONNREFUSED`, `Connection terminated unexpectedly`, or `connect ETIMEDOUT`
- Tip submissions and authentication fail across all clients

---

## Diagnosis

### 1. Confirm the health endpoint

```bash
curl -s https://<your-host>/health/ready | jq .
```

Expected healthy response:
```json
{ "status": "ok", "database": "connected" }
```

Unhealthy response will have `"status": "error"` and a database error message.

### 2. Check the database container / service

**Docker Compose (local/dev):**
```bash
docker compose ps db
docker compose logs db --tail=50
```

**Managed PostgreSQL (cloud):**
- Check the database dashboard in your cloud provider console
- Verify the instance status is `Available` / `Running`
- Look for recent maintenance windows, failovers, or storage alerts

### 3. Verify connectivity from the API host

```bash
# Replace with your actual DB_HOST and DB_PORT values
psql -h $DB_HOST -p $DB_PORT -U $DB_USERNAME -d $DB_NAME -c "SELECT 1;"
```

Or using `pg_isready`:
```bash
pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USERNAME
```

### 4. Check environment configuration

```bash
# Confirm the API process has the correct DB_* variables set
printenv | grep DB_
```

Verify against `.env.example` for required keys: `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`.

---

## Mitigation

### Option A — Restart the database container (dev/local)

```bash
docker compose restart db
# Wait for healthcheck to pass
docker compose ps db
```

### Option B — Restart the API to re-establish the connection pool

Once the database is reachable again:

```bash
docker compose restart api
# Or, for managed deployments, trigger a new deployment via GitHub Actions
```

### Option C — Verify replication / failover (multi-AZ / managed)

1. Check whether the primary instance failed over to a replica:
   - **AWS RDS:** Confirm the current writer endpoint in the RDS console
   - **Other providers:** Check the cluster topology dashboard
2. If failover occurred, verify `DB_HOST` in the application environment points to the current writer
3. Update the environment variable and restart the API service if necessary

### Recovery validation steps

Run these in order to confirm the database is healthy:

```bash
# 1. Direct connectivity
pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USERNAME

# 2. Application health endpoint
curl -s https://<your-host>/health/ready | jq .
# Expect: { "status": "ok" }

# 3. Basic write/read smoke test (optional, dev only)
psql -h $DB_HOST -U $DB_USERNAME -d $DB_NAME \
  -c "SELECT COUNT(*) FROM users;"
```

Once `/health/ready` returns `200 OK`, the incident is resolved.

---

## Prevention

- Monitor `/health/ready` with an uptime check (e.g., every 30 s)
- Set database CPU, storage, and connection-count alerts in your cloud provider
- Ensure the `pgdata` volume (or managed disk) has sufficient capacity headroom
- Keep PostgreSQL credentials rotated and stored in a secrets manager; never commit real credentials
- Test failover recovery procedures quarterly in a non-production environment

---

*See also:* [OPERATIONS.md](../OPERATIONS.md) | [high-error-rate.md](high-error-rate.md)
