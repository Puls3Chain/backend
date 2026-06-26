# Operations Guide

This document outlines standard operating procedures and infrastructure configurations for the StellarTip Backend.

## Public Status Page Setup (Better Uptime)

We use [Better Uptime](https://betteruptime.com) (free tier) to provide a public-facing status page for API health transparency. This helps users and integrators monitor our uptime and receive automated incident notifications.

### 1. Account & Status Page Initialization
1. Sign up or log into [Better Uptime](https://betteruptime.com).
2. Navigate to **Status Pages** and create a new status page.
3. Configure the custom domain to `status.stellartip.com`.
   - *Note: You will need to add a CNAME record in our DNS provider pointing `status` to `statuspage.betteruptime.com`.*

### 2. Configuring Monitors
Create the following monitors pointing to our production API to check component health:

| Monitor Name               | Endpoint URL               | Method | Check Interval | Timeout |
|----------------------------|----------------------------|--------|----------------|---------|
| Liveness (API Core)        | `https://api.stellartip.com/health` | GET    | 5 seconds      | 30s     |
| Readiness (Database)       | `https://api.stellartip.com/health/ready` | GET    | 60 seconds     | 30s     |
| Remote (Stellar Horizon)   | `https://api.stellartip.com/health/remote`| GET    | 5 minutes      | 30s     |

### 3. Setting Up Components
On your Status Page settings, add the following components to be displayed publicly:
- **API** (Tied to the Liveness monitor)
- **Database** (Tied to the Readiness monitor)
- **Stellar Horizon** (Tied to the Remote monitor)
- **Auth** (Manually updated or tied to a future specific synthetic monitor)
- **Notifications** (Manually updated or tied to a future specific synthetic monitor)

### 4. Incident Automation
To ensure incidents are reported accurately without false positives:
1. Go to **Monitors** -> Select a monitor -> **Edit**.
2. Under "Advanced settings" or "Alerting rules", configure the rule:
   - **Auto-open incident:** Trigger when there are **2+ consecutive failures**.
3. Apply this rule to all three configured monitors.

### 5. Subscriptions
Ensure that the subscription feature is enabled on the status page so users can opt-in to notifications:
- Enable **Email** subscriptions.
- Enable **RSS** feed.

*With these settings, any failure detected by the health endpoints will automatically update the public status page and notify subscribed users, significantly reducing support load during incidents.*
