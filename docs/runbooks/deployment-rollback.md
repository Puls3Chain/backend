# Runbook: Deployment Rollback

> **Severity:** Varies — use this runbook when a recent deployment caused a regression  
> **Prerequisite:** Confirm that a recent deployment is the likely cause before rolling back

---

## Symptoms that warrant a rollback

- Errors spiked immediately after a deployment completed
- A specific feature that was working before the deployment is now broken
- `/health/ready` or `/health/remote` degraded after (and not before) the deploy
- A critical bug was shipped and cannot be hot-fixed quickly

---

## Diagnosis

### 1. Identify the last successful deployment

Find the commit that was running before the bad deployment:

```bash
# View recent commits on main
git log --oneline -20

# Find the commit SHA before the current one
git log --oneline -2
```

Note the **previous commit SHA** — this is your rollback target.

### 2. Confirm the deployment is the cause

- Check your monitoring/logs: did errors start at the time of deployment?
- Check `/health/ready` and `/health/remote` — if they are healthy, the issue is in application logic, not infrastructure
- Review the diff between the current and previous commit for the likely culprit:
  ```bash
  git diff <previous-sha> HEAD
  ```

---

## Mitigation

### Option A — Redeploy a previous commit via GitHub Actions (preferred)

The CI workflow (`ci.yml`) runs on pushes to `main`. To roll back:

1. **Revert the bad commit on `main`:**
   ```bash
   git revert HEAD --no-edit
   git push origin main
   ```
   This creates a new revert commit and triggers CI automatically.

2. **Monitor the CI run:**
   - Open the [Actions tab](../../actions) in GitHub
   - Wait for the `CI` workflow to pass (lint → typecheck → test → build)

3. **Deploy** the new `main` using your deployment mechanism once CI passes

### Option B — Force-deploy a specific known-good SHA (emergency only)

Use only if the revert approach is too slow and the incident is critical:

```bash
# Check out the known-good commit on a hotfix branch
git checkout -b hotfix/emergency-rollback <good-sha>
git push origin hotfix/emergency-rollback

# Open a PR from hotfix/emergency-rollback → main and merge immediately
# OR push directly to main if your repo allows it during incidents
```

### Option C — Docker image rollback (if images are tagged by SHA)

If your deployment uses Docker image tags:

```bash
# Pull the previous image tag
docker pull ghcr.io/<org>/stellartip-backend:<previous-sha>

# Restart with the previous image
docker compose up -d --no-build
```

> Update `docker-compose.yml` to pin the image tag first if images are not pinned by default.

---

## Validate rollback success

Run these checks in order after deploying the rollback:

```bash
# 1. Confirm the deployed commit
git log --oneline -1

# 2. Check API liveness
curl -s https://<your-host>/health | jq .

# 3. Check database connectivity
curl -s https://<your-host>/health/ready | jq .

# 4. Check Stellar Horizon connectivity
curl -s https://<your-host>/health/remote | jq .

# 5. Smoke-test auth
curl -s -X POST https://<your-host>/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<test-user>","password":"<password>"}' | jq .access_token
```

All checks must return `200 OK` before declaring the rollback successful.

---

## Communication checklist

Complete these steps during and after the rollback:

- [ ] Post incident start notice in the team channel: time, impact, scope
- [ ] Identify incident owner
- [ ] Post when rollback has been initiated: target commit/image
- [ ] Post when rollback is deployed
- [ ] Post when validation checks pass (incident resolved)
- [ ] Set a reminder to open a postmortem (see [OPERATIONS.md](../OPERATIONS.md#postmortem-process))
- [ ] Create a postmortem using [docs/postmortems/TEMPLATE.md](../postmortems/TEMPLATE.md) within 48 hours

---

## Prevention

- Keep CI gates strict: lint, typecheck, unit tests, and e2e must pass before merge
- Use small, focused PRs to reduce rollback blast radius
- Tag Docker images by commit SHA so any version can be re-deployed
- Review the diff of every deployment before it goes live in production

---

*See also:* [OPERATIONS.md](../OPERATIONS.md) | [high-error-rate.md](high-error-rate.md)
