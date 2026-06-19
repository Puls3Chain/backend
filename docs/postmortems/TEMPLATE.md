# Postmortem: [Incident Title]

> **Date:** YYYY-MM-DD  
> **Author(s):** <!-- Name(s) of postmortem writer(s) -->  
> **Incident Owner:** <!-- Person who led incident response -->  
> **Severity:** <!-- P1 / P2 / P3 -->  
> **Status:** <!-- Draft / In Review / Final -->

---

## Summary

<!-- 2–4 sentences. What happened, what was impacted, and how it was resolved.
Example: "On YYYY-MM-DD, the StellarTip API became unable to process tip submissions for approximately X hours due to a misconfigured environment variable introduced in a recent deployment. The issue was identified via the /health/ready endpoint and resolved by redeploying the previous commit." -->

---

## Impact

| | |
|---|---|
| **Duration** | HH:MM (start time → end time, UTC) |
| **Users affected** | e.g., All authenticated users / Tip senders only |
| **Endpoints affected** | e.g., `POST /tips`, `GET /health/ready` |
| **Error rate** | e.g., ~100% of tip submissions failed |
| **Data loss** | None / Describe if any |

---

## Timeline

All times in UTC.

| Time | Event |
|---|---|
| HH:MM | Issue first observed (by whom / how) |
| HH:MM | Incident declared / team notified |
| HH:MM | Diagnosis started |
| HH:MM | Root cause identified |
| HH:MM | Mitigation applied |
| HH:MM | Service restored |
| HH:MM | Incident resolved and communicated |

---

## Root Cause

<!-- Describe the technical root cause clearly and without blame.
What specific condition caused the incident?
Example: "The JWT_SECRET environment variable was omitted from the production deployment configuration during a secrets rotation, causing all token verifications to fail." -->

### Contributing factors

<!-- Any conditions that made the incident worse or harder to detect:
- No automated alert on 401 error rate
- Secret rotation procedure was undocumented
- etc. -->

---

## What Went Well

<!-- Things that worked as expected or that helped limit the impact.
- The /health/ready endpoint surfaced the problem immediately
- The on-call responder was reachable within 5 minutes
- Rollback procedure was documented and followed successfully -->

- 

---

## What Went Wrong

<!-- Honest assessment of failures in process, tooling, or communication.
- No alert existed for a spike in 401 responses
- Secret rotation was not documented, leading to a missed step
- The rollback took longer than expected because the previous image tag was unknown -->

- 

---

## Action Items

| Action | Owner | Due Date | Status |
|---|---|---|---|
| <!-- Specific improvement --> | <!-- Name --> | <!-- YYYY-MM-DD --> | Open |
| | | | |
| | | | |

> Action items should be concrete and testable (e.g., "Add a `/health/ready` uptime check with a 30-second interval" rather than "Improve monitoring").

---

## References

<!-- Links to relevant artifacts:
- Incident channel thread
- Relevant commit / PR
- Runbook used: [runbook-name.md](../runbooks/runbook-name.md)
- Log snippets or dashboards (screenshots preferred) -->

-
