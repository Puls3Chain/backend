# 2. PostgreSQL for relational data

Date: 2025-05-14

## Status

Accepted

## Context

The platform handles tips and transactions which require high relational integrity and ACID compliance. We need a reliable database system to manage these records.

## Decision

We chose PostgreSQL over MongoDB.

PostgreSQL is a powerful, open-source object-relational database system that provides strong consistency, complex queries, and robust relational integrity.

## Consequences

### Positive
- Ensures relational integrity for tips, users, and transactions.
- Provides ACID compliance for financial-related data.
- Excellent support for complex queries and indexing.
- Mature ecosystem and widespread developer familiarity.

### Negative
- Schema migrations are required for changes.
- Scaling horizontally can be more complex than with some NoSQL databases.
