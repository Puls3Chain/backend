# Operations Guide — StellarTip Backend

Practical reference for on-call responders and incident owners.

---

## Table of Contents

1. [On-Call Rotation](#on-call-rotation)
2. [Incident Ownership](#incident-ownership)
3. [Runbooks](#runbooks)
4. [Postmortem Process](#postmortem-process)
5. [Escalation Guidance](#escalation-guidance)

---

## On-Call Rotation

- Rotate on-call responsibility on a **weekly cadence**
- The current on-call owner is responsible for acknowledging incidents within **15 minutes** during business hours and **30 minutes** outside business hours
- Handoffs happen at the start of each week — the outgoing on-call owner should brief the incoming owner on any ongoing issues or watch items
- Keep the on-call schedule visible to the whole team (shared calendar, team wiki, or Slack channel topic)

> **No formal tool is required.** A simple spreadsheet or calendar event is enough until the team grows.

---

## Incident Ownership

When an incident is declared:

1. **One person becomes the incident owner.** This is usually the on-call responder who first acknowledges the alert.
2. The incident owner is responsible for:
   - Driving diagnosis and mitigation (not necessarily doing it solo)
   - Communicating status to the team at regular intervals (every 15–30 minutes during active incidents)
   - Declaring when the incident is resolved
   - Opening a postmortem within **48 hours** of resolution (for P1/P2 incidents)
3. If the incident owner needs help, they escalate — they do not silently hand off responsibility

**Severity levels (for reference):**

| Level | Description | Example |
|---|---|---|
| P1 | Complete service outage or data loss | Database down, all requests failing |
| P2 | Major feature unavailable, workaround exists | Stellar Horizon unreachable, tips failing |
| P3 | Minor degradation, most users unaffected | Single non-critical endpoint erroring |

---

## Runbooks

Runbooks are located in `docs/runbooks/`. Use them during incidents to follow consistent, validated procedures.

| Scenario | Runbook |
|---|---|
| PostgreSQL is down or unreachable | [database-down.md](runbooks/database-down.md) |
| Stellar Horizon is unreachable | [stellar-horizon-unreachable.md](runbooks/stellar-horizon-unreachable.md) |
| High error rate across endpoints | [high-error-rate.md](runbooks/high-error-rate.md) |
| Auth / JWT failures | [auth-issues.md](runbooks/auth-issues.md) |
| Rolling back a bad deployment | [deployment-rollback.md](runbooks/deployment-rollback.md) |

**Quick health checks** (run these first during any incident):

```bash
curl -s https://<your-host>/health         # liveness
curl -s https://<your-host>/health/ready   # database
curl -s https://<your-host>/health/remote  # Stellar Horizon
```

---

## Postmortem Process

Write a postmortem for every **P1** incident and any **P2** that involved a significant rollback or customer-visible impact.

**Steps:**

1. Copy `docs/postmortems/TEMPLATE.md` to `docs/postmortems/YYYY-MM-DD-<short-title>.md`
2. Fill in all sections within **48 hours** of incident resolution
3. Share the draft in the team channel for feedback
4. Finalize and mark `Status: Final` within one week
5. Track action items to completion — assign owners and due dates

**Blameless culture:** Postmortems are about systems and processes, not individuals. The goal is to prevent recurrence, not to assign fault.

---

## Escalation Guidance

### When to escalate

- You have been diagnosing for more than **20 minutes** without identifying the root cause
- The incident is P1 and you are working alone
- The fix requires access or permissions you do not have
- The incident affects a third party (e.g., Stellar Network outage) and you need to communicate externally

### How to escalate

1. Post in the team incident channel with:
   - Current status and what you have tried
   - Specific help needed
   - Any relevant log snippets or health-check output
2. Directly message the next person in the on-call rotation or a senior team member
3. For Stellar network issues, check the official status at <https://status.stellar.org> — no internal escalation will resolve an upstream outage

### External resources

| Resource | URL |
|---|---|
| Stellar Network Status | <https://status.stellar.org> |
| Horizon Testnet | <https://horizon-testnet.stellar.org> |
| Stellar Developer Docs | <https://developers.stellar.org> |
| PostgreSQL Documentation | <https://www.postgresql.org/docs/> |

---

*Last updated: 2026-06-19*
