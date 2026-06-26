# StellarTip API — Performance Baseline

Load and performance testing for the StellarTip Backend API using [k6](https://k6.io/).

## Thresholds

| Metric | Threshold |
|--------|-----------|
| p95 response time | < 200ms |
| Error rate | < 1% |

## Load Envelope

| Script | Endpoint | Target RPS | Duration | Pattern |
|--------|----------|-----------|----------|---------|
| `health-smoke.js` | `GET /health` | 1000 RPS | 30s | Constant |
| `profile-reads.js` | `GET /profiles/:username` | 200 RPS | 5 min | Ramp up → sustain → ramp down |
| `auth-rate-limit.js` | `POST /auth/login` | ~15 req/VU | 2 min | Per-VU (rate-limit verification) |
| `tip-creation.js` | `POST /tips` | 50 RPS | 5 min | Ramp up → sustain → ramp down |

## Scripts

All scripts live under `test/load/`.

### `health-smoke.js`

Verifies the liveness endpoint sustains **1000 RPS** for 30 seconds with p95 < 200ms.

### `profile-reads.js`

Simulates read traffic on creator profiles at **200 RPS** for 5 minutes.  
Ramp-up: 0 → 200 RPS over 30s. Ramp-down: 200 → 0 RPS over 30s.

### `auth-rate-limit.js`

Confirms auth endpoints enforce the **10 req/min** per-IP throttle (`AuthThrottle` decorator).  
Each VU sends 15 requests (exceeding the 10 req/min limit), and the test asserts that HTTP 429 responses are observed.

### `tip-creation.js`

Burst test for tip creation at **50 RPS** for 5 minutes.  
Ramp-up: 0 → 50 RPS over 30s. Ramp-down: 50 → 0 RPS over 30s.

## Running Locally

Requires [k6](https://k6.io/docs/get-started/installation/) or Docker.

```bash
# With k6 installed
k6 run test/load/health-smoke.js

# With Docker
docker run --rm -i grafana/k6 run - < test/load/health-smoke.js

# Override base URL
k6 run --env BASE_URL=http://localhost:3000 test/load/profile-reads.js

# Save JSON output for trend tracking
k6 run --out json=results.json test/load/tip-creation.js
```

## CI

The `load-test` GitHub Actions workflow (`.github/workflows/load-test.yml`) runs all scripts against a fresh test stack on every push to `main` that modifies load test files, and on `workflow_dispatch`.

Results are stored as a `k6-load-test-results` artifact (retained 30 days) for trend tracking.
