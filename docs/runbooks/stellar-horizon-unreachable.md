# Runbook: Stellar Horizon Unreachable

> **Severity:** P2 — Tip submission and balance queries affected; auth and profiles continue working  
> **Affects:** `/tips` endpoints, any feature that reads Stellar account balances

---

## Symptoms

- `GET /health/remote` returns `503 Service Unavailable`
- Tip submissions return `500` or timeout errors
- Logs contain: `NetworkError`, `connection refused`, `ECONNREFUSED`, or `horizon` fetch failures
- Balance and transaction queries fail; non-Stellar endpoints (`/auth`, `/profiles`) remain healthy

---

## Diagnosis

### 1. Confirm the remote health endpoint

```bash
curl -s https://<your-host>/health/remote | jq .
```

Healthy response:
```json
{ "status": "ok", "stellar": "reachable" }
```

An unhealthy response will show `"status": "error"` with a Stellar-related message.

### 2. Check Stellar Horizon directly

Probe the configured Horizon instance:

```bash
# Replace with your STELLAR_NODE_URL value
curl -s $STELLAR_NODE_URL | jq '.horizon_version // .'
```

Check official Stellar status pages:
- **Mainnet / Testnet status:** <https://status.stellar.org>
- **Horizon testnet:** <https://horizon-testnet.stellar.org>
- **Horizon mainnet:** <https://horizon.stellar.org>

### 3. Verify environment configuration

```bash
printenv | grep STELLAR
```

Confirm `STELLAR_NODE_URL` is set and correct for the target environment (`TESTNET` vs production).

### 4. Check network/firewall from the API host

```bash
curl -v $STELLAR_NODE_URL --max-time 10
```

If this times out from the API host but succeeds from your workstation, a firewall or egress rule is blocking outbound traffic to Horizon.

---

## Mitigation

### Fail open to cached data

If your application caches Stellar responses (e.g., last-known balances):

1. Verify the cache layer is populated and returning data
2. Ensure tip submissions are queued/held rather than silently dropped
3. Surface a user-facing degraded-mode message if applicable (this is a UI concern — no backend change required)

> **Note:** The current backend does not include a built-in cache fallback. Tip submissions will return errors until Horizon is reachable. Do not attempt silent data fabrication.

### Alert the team

1. Post in the team incident channel with:
   - Time of detection
   - `/health/remote` output
   - Direct Horizon probe result
   - Link to Stellar status page
2. Assign an incident owner (see [OPERATIONS.md](../OPERATIONS.md#incident-ownership))

### If Horizon is degraded upstream (Stellar outage)

- No immediate action is available on the backend — this is an external dependency
- Monitor <https://status.stellar.org> for updates
- Set a reminder to re-check every 15 minutes
- Communicate status to stakeholders

### If Horizon is reachable but the API cannot reach it (network issue)

1. Verify the API container/host has outbound internet access
2. Check DNS resolution for the Horizon hostname
3. Review any egress firewall rules or cloud security groups

### Recovery validation steps

Run these in order to confirm Horizon is reachable again:

```bash
# 1. Direct probe
curl -s $STELLAR_NODE_URL | jq '.horizon_version'

# 2. Remote health endpoint
curl -s https://<your-host>/health/remote | jq .
# Expect: { "status": "ok" }

# 3. Submit a test tip (testnet only, if applicable)
```

Once `/health/remote` returns `200 OK`, the incident is resolved. Post a recovery notice in the incident channel.

---

## Prevention

- Monitor `/health/remote` with an uptime check (every 60 s is sufficient)
- Subscribe to <https://status.stellar.org> for outage notifications
- Consider using the official Stellar Foundation Horizon instances as a fallback URL if self-hosting
- Document the fallback Horizon URL in `.env.example` so it is easy to switch

---

*See also:* [OPERATIONS.md](../OPERATIONS.md) | [high-error-rate.md](high-error-rate.md) | [database-down.md](database-down.md)
