# 7. Security and validation defaults

Date: 2025-05-14

## Status

Accepted

## Context

We need to ensure our API is secure and handles request data validation consistently.

## Decision

We chose to use Helmet, Compression, and class-validator as our security and validation defaults.

- **Helmet**: Helps secure the app by setting various HTTP headers.
- **Compression**: Reduces the size of the response body, improving performance.
- **class-validator / class-transformer**: Provides a declarative way to validate and transform request data using decorators on DTOs.

## Consequences

### Positive
- Improved security through standard HTTP headers.
- Better performance with response compression.
- Consistent and robust data validation using NestJS `ValidationPipe`.
- Reduced boilerplate for input validation.

### Negative
- Helmet may require configuration for certain features (like CSP).
- Compression adds some CPU overhead.
- Decorator-based validation can sometimes lead to large DTO files.
