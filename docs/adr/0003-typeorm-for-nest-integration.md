# 3. TypeORM for NestJS integration

Date: 2025-05-14

## Status

Accepted

## Context

We need an Object-Relational Mapper (ORM) to interact with our PostgreSQL database. The project is built using TypeScript and NestJS.

## Decision

We chose TypeORM over Prisma.

TypeORM is a TypeScript-first ORM that integrates natively with NestJS through `@nestjs/typeorm`. It supports the Data Mapper and ActiveRecord patterns, fitting well with NestJS's architectural style.

## Consequences

### Positive
- Native and mature integration with NestJS.
- Excellent TypeScript support and decorators.
- Support for multiple database systems if needed in the future.
- Large community and extensive documentation.

### Negative
- Some complex queries might be harder to express than in raw SQL.
- Performance overhead compared to raw SQL or more lightweight libraries.
- Some might find its API more verbose compared to Prisma.
