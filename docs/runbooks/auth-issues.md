# Runbook: Auth Issues

> **Severity:** P1 — All authenticated endpoints are inaccessible  
> **Affects:** Login, token refresh, and every protected route

---

## Symptoms

- All authenticated requests return `401 Unauthorized`
- Login endpoint (`POST /auth/login`) returns `401` or `500`
- Token refresh fails with `401` or `403`
- Logs contain: `JsonWebTokenError`, `TokenExpiredError`, `invalid signature`, or `jwt malformed`
- New user registrations succeed but subsequent requests are rejected

---

## Diagnosis

### 1. Verify JWT secret configuration

The most common cause of a sudden auth failure is a missing or rotated `JWT_SECRET`.

```bash
# Confirm the variable is set in the running process
printenv | grep JWT
```

Expected variables (see `.env.example`):
```
JWT_SECRET=<non-empty string>
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION_DAYS=30
```

If `JWT_SECRET` is empty or has changed since the last deployment, all previously issued tokens will be invalid.

### 2. Verify token issuance

Test the login flow to confirm the API can still issue tokens:

```bash
curl -s -X POST https://<your-host>/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<test-user@example.com>","password":"<password>"}' | jq .
```

- If this returns a `200` with tokens → issuance is working; the problem is in verification or a stale client token
- If this returns `401` or `500` → issuance is broken; check `JWT_SECRET` and database connectivity

### 3. Verify token verification path

Use a freshly issued access token against a protected endpoint:

```bash
ACCESS_TOKEN="<paste token from step 2>"

curl -s https://<your-host>/profiles/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

- `200` → verification is working; the original caller has a stale/expired token
- `401` → verification is broken despite correct token; check `JWT_SECRET` consistency

### 4. Inspect clock skew

JWT validation is time-sensitive. If the API host clock is significantly skewed:

```bash
# Check the API host system time
date -u

# Compare to a trusted time source
curl -s https://worldtimeapi.org/api/timezone/Etc/UTC | jq '.utc_datetime'
```

A skew of more than 60 seconds can cause valid tokens to appear expired or not-yet-valid. Sync the system clock with NTP if skewed.

### 5. Check for recent secret rotation

- Review recent environment variable changes in your deployment platform
- Check if `JWT_SECRET` was changed without a coordinated token invalidation plan
- If rotated unexpectedly, all existing sessions will be invalid — users will need to log in again

---

## Mitigation

### JWT_SECRET is missing or incorrect

1. Set the correct `JWT_SECRET` in the deployment environment
2. Redeploy the API (or restart the container) to pick up the new value:
   ```bash
   docker compose up -d api
   ```
3. Inform users that they will need to log in again (all previous tokens are invalid)

### JWT_SECRET was rotated intentionally

1. Confirm the new secret is deployed to all API instances
2. Announce to users that a re-login is required
3. No further action needed — this is the expected behavior after rotation

### Clock skew detected

1. Synchronize the host clock:
   ```bash
   sudo timedatectl set-ntp true
   # or
   sudo ntpdate pool.ntp.org
   ```
2. Restart the API to ensure it picks up the corrected time
3. Verify tokens are now accepted

### Database unavailable (causing auth 500s)

Auth depends on the database to look up users and store refresh tokens. If the database is down, auth will fail even if the JWT secret is correct.

→ Follow [database-down.md](database-down.md) first, then re-test auth.

---

## Recovery validation

```bash
# 1. Issue a new token
curl -s -X POST https://<your-host>/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<test-user>","password":"<password>"}' | jq .access_token

# 2. Use the token on a protected endpoint
curl -s https://<your-host>/profiles/me \
  -H "Authorization: Bearer <token>" | jq .

# 3. Confirm health is clean
curl -s https://<your-host>/health/ready | jq .
```

All three steps must succeed before the incident is resolved.

---

## Prevention

- Store `JWT_SECRET` in a secrets manager (not in `.env` files committed to source control)
- Use long, randomly generated secrets (≥ 32 characters of entropy)
- Coordinate any planned secret rotation with the team so all instances are updated atomically
- Ensure API host clocks are synchronized via NTP in all environments
- Monitor auth endpoint error rates — a sudden spike in `401`s is an early signal

---

*See also:* [OPERATIONS.md](../OPERATIONS.md) | [high-error-rate.md](high-error-rate.md) | [database-down.md](database-down.md)
