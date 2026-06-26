# Runbook: High Error Rate

> **Severity:** P1–P2 depending on scope  
> **Affects:** Varies — could be isolated to one endpoint or service-wide

---

## Symptoms

- A spike in `4xx` or `5xx` responses observed in logs or monitoring
- Clients reporting widespread request failures or timeouts
- `/health` or `/health/ready` returning non-`200` responses
- Alerting fires on error-rate threshold

---

## Diagnosis

Work through these checks in order to identify the fault domain.

### 1. Inspect health endpoints

```bash
# Basic liveness
curl -s https://<your-host>/health | jq .

# Database readiness
curl -s https://<your-host>/health/ready | jq .

# Stellar Horizon reachability
curl -s https://<your-host>/health/remote | jq .
```

| Endpoint | Unhealthy → Runbook |
|---|---|
| `/health/ready` | [database-down.md](database-down.md) |
| `/health/remote` | [stellar-horizon-unreachable.md](stellar-horizon-unreachable.md) |

If both are healthy, the error is likely in application logic or a recent deployment.

### 2. Review recent deployments

```bash
# Check the most recent commits on the main branch
git log --oneline -10
```

- Was a deployment triggered in the last 30–60 minutes?
- If yes, compare the current commit to the last known-good commit
- Consider a [deployment rollback](deployment-rollback.md) if errors started immediately after deploy

### 3. Inspect application logs

**Docker Compose:**
```bash
docker compose logs api --tail=100 --follow
```

**Cloud / managed logs:**
- Filter for `ERROR` or `WARN` level entries
- Note any stack traces, module names, or specific route patterns appearing repeatedly

Look for patterns:
- Errors concentrated on a specific route (e.g., `/tips`, `/auth`)
- Errors starting at a specific timestamp (correlates with deploy or external event)
- Repeated exceptions from a specific module (e.g., `StellarService`, `AuthService`, `TypeORM`)

### 4. Check Stellar network status

If errors are concentrated in tip-related endpoints:

```bash
curl -s $STELLAR_NODE_URL | jq '.horizon_version // "unreachable"'
```

Check: <https://status.stellar.org>

If Stellar is degraded, see [stellar-horizon-unreachable.md](stellar-horizon-unreachable.md).

### 5. Identify the likely fault domain

Use the table below to route to the appropriate runbook:

| Observation | Likely Fault Domain | Next Step |
|---|---|---|
| `/health/ready` is `503` | Database | [database-down.md](database-down.md) |
| `/health/remote` is `503` | Stellar Horizon | [stellar-horizon-unreachable.md](stellar-horizon-unreachable.md) |
| Auth endpoints failing | JWT / config | [auth-issues.md](auth-issues.md) |
| Errors started after a deploy | Bad deployment | [deployment-rollback.md](deployment-rollback.md) |
| All endpoints failing, health is OK | App crash / OOM | Restart API, check memory |
| Specific route only, no infra signal | Application bug | Assign developer to investigate |

---

## Mitigation

### Restart the API (if crash or OOM suspected)

```bash
docker compose restart api
```

Or trigger a new deployment from GitHub Actions to get a clean container.

### Roll back a bad deployment

If errors correlate with a recent deploy:

→ Follow [deployment-rollback.md](deployment-rollback.md)

### Isolate a broken route

If errors are confined to one endpoint and rollback is not immediately feasible:

1. Document the affected route and error type
2. Consider temporarily rate-limiting or disabling the endpoint (requires code change — coordinate with the team)
3. Assign a developer to investigate the specific module

---

## Prevention

- Monitor `/health`, `/health/ready`, and `/health/remote` with automated uptime checks
- Set alerts on HTTP 5xx rates in your logging/observability stack
- Run the full CI suite (lint, typecheck, unit tests, e2e) on every PR before merging
- Keep deployments small and frequent to reduce the blast radius of any single change

---

*See also:* [OPERATIONS.md](../OPERATIONS.md) | [deployment-rollback.md](deployment-rollback.md) | [database-down.md](database-down.md)
