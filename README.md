# StellarTip Backend API

The NestJS backend for [StellarTip](https://stellartip.com) — a decentralized micro-tipping platform for creators on the Stellar ecosystem.

[![CI](https://github.com/StellarTips/StellarTip-Backend/actions/workflows/ci.yml/badge.svg)](https://github.com/StellarTips/StellarTip-Backend/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/StellarTips/StellarTip-Backend)](https://github.com/StellarTips/StellarTip-Backend/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/StellarTips/StellarTip-Backend/total)](https://github.com/StellarTips/StellarTip-Backend/releases)

## Overview

This API powers creator profiles, tip transactions, and Stellar blockchain interactions.

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL
- **ORM**: TypeORM
- **Auth**: JWT + Stellar wallet (Freighter)
- **Blockchain**: Stellar (via Horizon SDK)
- **Logging**: Winston (structured JSON)
- **Docs**: Swagger / OpenAPI

## Features

### Auth

- Stellar wallet (Freighter) authentication with signature verification
- Email/password authentication with JWT + refresh token rotation
- Wallet nonce signing verification

### Profiles

- Creator profiles with username, display name, bio, and avatar
- Avatar upload with validation (JPEG, PNG, WEBP, max 5MB)
- Social links (Twitter/X, GitHub, YouTube, Website)
- Tip links per creator (stellartip.com/{username})
- Creator analytics dashboard with time-series data
- Profile search

### Tips

- Instant tip recording (XLM/USDC)
- Tip history with filtering, sorting, and pagination
- Transaction verification via Stellar Horizon
- Tip statistics and analytics

### Notifications

- In-app notifications for tip receipts
- Unread count badge support
- Mark as read functionality

### Stellar

- Balance checking (XLM + USDC)
- Transaction verification via Horizon
- Account info lookup

### DevOps

- Docker & Docker Compose for local development
- Health check endpoints (liveness, readiness, remote)
- Rate limiting with configurable thresholds
- GitHub Actions CI/CD pipeline
- Structured JSON logging with sensitive data redaction

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- PostgreSQL (local or Docker)

### Installation

```bash
# Clone the repository
git clone https://github.com/StellarTips/StellarTip-Backend.git
cd StellarTip-Backend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run start:dev

# Open API docs
open http://localhost:3000/api/docs
```

### Docker

```bash
docker compose up -d
```

### Seed Data

Populate a development or demo database with deterministic realistic data:

```bash
npm run db:seed
```

By default, the seed creates 50 creators, 500 tips across the last 90 days, and 200 notifications. Use `SEED_SCALE` to resize the dataset:

```bash
SEED_SCALE=0.5 npm run db:seed
```

The seed script truncates existing seeded tables before inserting data so repeated runs produce a consistent state. It refuses to run when `NODE_ENV=production`.

## Scripts

| Command                        | Description                                                                               |
| ------------------------------ | ----------------------------------------------------------------------------------------- |
| `npm run start:dev`            | Start development server (watch)                                                          |
| `npm run build`                | Build for production                                                                      |
| `npm run start`                | Start production server                                                                   |
| `npm test`                     | Run unit tests                                                                            |
| `npm run test:e2e`             | Run end-to-end tests                                                                      |
| `npm run test:postman`         | Run the Postman Newman collection (dev env)                                               |
| `npm run test:postman:staging` | Run Newman against the staging environment                                                |
| `npm run test:postman:prod`    | Run Newman against the production environment                                             |
| `npm run postman:generate`     | Regenerate a baseline Postman collection from `/api/docs-json` (writes to `postman/tmp/`) |
| `npm run postman:validate`     | Structural validation of every Postman artifact under `postman/`                          |
| `npm run audit:ci`             | Mirror the CI `npm audit` gate locally                                                    |
| `npm run lint`                 | Lint and auto-fix code                                                                    |
| `npm run db:seed`              | Seed development/demo data                                                                |

## API Endpoints

### Auth

| Method | Path                  | Auth   | Description                  |
| ------ | --------------------- | ------ | ---------------------------- |
| POST   | `/auth/signup`        | Public | Register with email/password |
| POST   | `/auth/login`         | Public | Login with email/password    |
| POST   | `/auth/stellar/login` | Public | Login with Stellar wallet    |
| POST   | `/auth/refresh`       | Public | Refresh access token         |
| GET    | `/auth/nonce`         | Public | Get signing nonce for wallet |
| GET    | `/auth/profile`       | Bearer | Get current user profile     |

### Profiles

| Method | Path                               | Auth   | Description                   |
| ------ | ---------------------------------- | ------ | ----------------------------- |
| GET    | `/profiles/:username`              | Public | Get creator public profile    |
| GET    | `/profiles/:username/tipping-info` | Public | Get creator tipping page data |
| GET    | `/profiles?q=query`                | Public | Search creators               |
| PUT    | `/profiles/me`                     | Bearer | Update own profile            |
| PATCH  | `/profiles/me/social-links`        | Bearer | Update social links           |
| POST   | `/profiles/me/avatar`              | Bearer | Upload avatar (multipart)     |
| GET    | `/profiles/me/analytics`           | Bearer | Creator analytics dashboard   |

### Tips

| Method | Path                    | Auth   | Description                  |
| ------ | ----------------------- | ------ | ---------------------------- |
| POST   | `/tips`                 | Public | Create a new tip             |
| GET    | `/tips/:id`             | Public | Get tip details              |
| GET    | `/tips/my/received`     | Bearer | My received tips (paginated) |
| GET    | `/tips/my/sent`         | Bearer | My sent tips (paginated)     |
| GET    | `/tips/my/stats`        | Bearer | My tip statistics            |
| GET    | `/tips/wallet/:address` | Public | Tips by wallet address       |
| POST   | `/tips/:id/confirm`     | Bearer | Confirm a tip with tx hash   |

### Notifications

| Method | Path                          | Auth   | Description                   |
| ------ | ----------------------------- | ------ | ----------------------------- |
| GET    | `/notifications`              | Bearer | Get notifications (paginated) |
| GET    | `/notifications/unread-count` | Bearer | Get unread count              |
| PATCH  | `/notifications/:id/read`     | Bearer | Mark notification as read     |

### Stellar

| Method | Path                      | Auth   | Description          |
| ------ | ------------------------- | ------ | -------------------- |
| GET    | `/stellar/balance`        | Public | Get wallet balance   |
| GET    | `/stellar/account`        | Public | Get account info     |
| POST   | `/stellar/verify-payment` | Public | Verify a transaction |

### Health

| Method | Path             | Auth   | Description              |
| ------ | ---------------- | ------ | ------------------------ |
| GET    | `/health`        | Public | Liveness check           |
| GET    | `/health/ready`  | Public | Readiness (DB check)     |
| GET    | `/health/remote` | Public | Remote (Stellar Horizon) |

## Analytics Endpoint

`GET /profiles/me/analytics` returns:

- **summary**: total tips received, total amount, average tip, largest tip
- **byAsset**: breakdown by XLM/USDC with counts and amounts
- **timeSeries**: daily breakdown of tips with date, count, and amount
- **topSupporters**: top 5 supporters by total amount

Query Parameters:
| Param | Type | Default | Description |
|---------|--------|---------|------------------------------------------|
| `period`| string | `30d` | Time period: `7d`, `30d`, `90d`, `365d`, `all` |
| `asset` | string | — | Filter by asset: `XLM` or `USDC` |

## Environment Variables

| Variable                      | Description               | Default                               |
| ----------------------------- | ------------------------- | ------------------------------------- |
| `PORT`                        | Server port               | `3000`                                |
| `CORS_ORIGIN`                 | Allowed CORS origin(s)    | `*`                                   |
| `NODE_ENV`                    | Environment               | `development`                         |
| `DB_HOST`                     | Database host             | `localhost`                           |
| `DB_PORT`                     | Database port             | `5432`                                |
| `DB_USERNAME`                 | Database username         | `postgres`                            |
| `DB_PASSWORD`                 | Database password         | `postgres`                            |
| `DB_NAME`                     | Database name             | `stellartip`                          |
| `JWT_SECRET`                  | JWT signing secret        | —                                     |
| `JWT_ACCESS_EXPIRATION`       | Access token TTL          | `15m`                                 |
| `JWT_REFRESH_EXPIRATION_DAYS` | Refresh token TTL         | `30`                                  |
| `STELLAR_NODE_URL`            | Stellar Horizon URL       | `https://horizon-testnet.stellar.org` |
| `STELLAR_NETWORK`             | Stellar network           | `TESTNET`                             |
| `USDC_ISSUER`                 | USDC asset issuer address | —                                     |
| `THROTTLE_TTL`                | Rate limit window (ms)    | `60000`                               |
| `THROTTLE_LIMIT`              | Rate limit max requests   | `100`                                 |

## Status

Check our public status page at [status.stellartip.com](https://status.stellartip.com) for real-time monitoring of API health, database connectivity, and Stellar Horizon availability. You can subscribe to incident updates via email or RSS.

## API Documentation

Interactive Swagger UI is available at `/api/docs` when the server is running.

## API exploration with Postman

A versioned [Postman](https://www.postman.com/) collection lives under
[`postman/`](./postman/):

- `postman/StellarTip.postman_collection.json` — all endpoints grouped by
  controller (Auth, Profiles, Tips, Notifications, Stellar, Health + a
  `Welcome` smoke test).
- `postman/environments/{dev,staging,prod}.json` — one-click environments
  that pre-fill `baseUrl`, the active network and placeholders for the
  bearer tokens.

### Import into Postman

1. **File → Import** the collection JSON.
2. **Environments → Import** one or more of the environment files.
3. Open `Auth → POST /auth/signup` (or `/auth/login`) and click **Send**.
   The collection's auth helper captures the response token into
   `accessToken` so every following request sends `Authorization: Bearer
{{accessToken}}` automatically.

### Running Newman from the CLI

Newman reproduces the collection in a headless runner. Requires Node ≥ 18:

```bash
npm run test:postman            # dev (http://localhost:3000)
npm run test:postman:staging    # api.staging.stellartip.dev
npm run test:postman:prod       # api.stellartip.dev
```

Or directly:

```bash
bash scripts/run-postman.sh dev
```

Each run writes a JUnit report to `postman/reports/newman-<env>.xml`
suitable for CI ingestion.

### Regenerating from the OpenAPI spec

The collection in this repo is hand-curated so that every request ships
with example payloads, schema assertions and a no-server-needed smoke test.
The OpenAPI-→-Postman transformer supplied by Postman Labs is installed as
`openapi-to-postmanv2` (binary `openapi2postmanv2`) so a fresh baseline
can be regenerated on demand:

```bash
# 1. Boot the API so /api/docs-json is reachable.
npm run start:dev

# 2. Generate a *scratch* baseline from the live OpenAPI spec.
BASE_URL=http://localhost:3000 npm run postman:generate

# 3. Diff against the hand-curated collection and migrate any genuinely
#    new endpoints / parameters. NEVER auto-merge — that would lose the
#    pm.test assertions and example bodies.
diff -u postman/StellarTip.postman_collection.json \
        postman/tmp/StellarTip.generated.postman_collection.json
```

`npm run postman:validate` parses every JSON file under `postman/` and
asserts that collections expose an `auth` helper and a top-level `item`
array while environments expose `_postman_variable_scope='environment'` —
it is wired into `lint-staged` so a malformed artifact cannot land via a
"format only" commit.

### Postman in CI

`.github/workflows/postman-tests.yml` boots Postgres + the API and runs
the Newman collection on every push to `main` and on every PR. JUnit XML
is uploaded as a workflow artifact (`newman-junit-report`).

## Security scanning

The dependency vulnerability management policy is documented in
[`docs/SECURITY.md`](./docs/SECURITY.md#dependency-vulnerability-management)
and enforced by:

- `.github/workflows/security-audit.yml` — `npm audit` (prod deps) on every
  PR / push to `main`, plus CodeQL `security-and-quality`. Optional Snyk
  steps run only when `SNYK_TOKEN` is configured at the repository level.
- `.github/workflows/security-drift.yml` — weekly Monday 01:00 UTC cron
  audit of the **full** dep tree. Opens a `security,weekly-drift` issue
  while drift is present and auto-closes it on the next clean run.

Suppressions of individual findings belong in [`./.snyk`](./.snyk) with an
explicit `reason` and `expires` (≤ 90 days out). See `docs/SECURITY.md`
for the full policy and response SLA.

## License

MIT
