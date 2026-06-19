# 5. NestJS as the primary framework

Date: 2025-05-14

## Status

Accepted

## Context

We need a backend framework to build our API.

## Decision

We chose NestJS over Express.

NestJS provides an opinionated structure, built-in Dependency Injection (DI), and excellent TypeScript support out of the box. It is built on top of Express (by default) but adds a layer of abstraction that promotes modularity and maintainability.

## Consequences

### Positive
- Consistent and opinionated project structure.
- Built-in support for Dependency Injection and modularity.
- Strong TypeScript integration.
- Large ecosystem of official and community modules.
- Easier to scale for larger teams and complex codebases.

### Negative
- Steeper learning curve compared to Express.
- More boilerplate code for simple features.
- Heavier framework compared to minimal alternatives.
