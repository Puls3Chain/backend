# 4. JWT with refresh tokens for authentication

Date: 2025-05-14

## Status

Accepted

## Context

We need a secure way to authenticate users and maintain their sessions.

## Decision

We chose JWT with refresh tokens over traditional session-based authentication.

JWTs allow for stateless authentication, which is easier to scale and works well for APIs. Refresh tokens provide a way to maintain user sessions without requiring frequent re-authentication while keeping access token lifetimes short for security.

## Consequences

### Positive
- Stateless and scalable.
- Works well across different domains and mobile apps.
- Short-lived access tokens improve security.
- Refresh tokens allow for seamless UX by renewing access tokens in the background.

### Negative
- Complexity in managing token rotation and revocation.
- Tokens cannot be easily invalidated before they expire (unless using a blacklist).
- Requires secure storage for refresh tokens (e.g., in the database).
