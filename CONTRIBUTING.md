# Contributing to StellarTip Backend

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-org/stellartip-backend.git`
3. Install dependencies: `npm install`
4. Copy environment variables: `cp .env.example .env`
5. Start the dev server: `npm run start:dev`

## Commit Messages

This project uses [Conventional Commits](https://www.conventionalcommits.org/) enforced by Commitlint and Husky.

Use one of these types as a prefix:

| Type       | Semver bump | Example                                 |
| ---------- | ----------- | --------------------------------------- |
| `feat`     | minor       | `feat: add creator analytics export`    |
| `fix`      | patch       | `fix: handle expired refresh tokens`    |
| `perf`     | patch       | `perf: cache profile lookups`           |
| `refactor` | patch       | `refactor: simplify tip validation`     |
| `docs`     | none        | `docs: document analytics query params` |
| `chore`    | none        | `chore: bump eslint dependencies`       |

Breaking changes must include `BREAKING CHANGE:` in the commit body or use a `!` after the type (e.g. `feat!: remove legacy auth endpoint`).

## Code Quality

### Linting

This project uses ESLint with TypeScript strict rules and Prettier for code formatting.

- **Check linting**: `npm run lint`
- **Auto-fix issues**: ESLint runs with `--fix` by default via `npm run lint`

### Pre-commit Hook

Linting is run on staged files before commits. Make sure your code passes lint before pushing:

```bash
npm run lint
```

### Rules

- `@typescript-eslint/no-explicit-any`: error — use proper types
- `@typescript-eslint/no-unsafe-argument`: error — ensure type safety
- `@typescript-eslint/no-unused-vars`: error — remove unused variables
- `@typescript-eslint/explicit-function-return-type`: warn — specify return types
- `prettier/prettier`: error — consistent formatting

### TypeScript

Run the TypeScript compiler to check for type errors:

```bash
npx tsc --noEmit
```

## Testing

- **Unit tests**: `npm test`
- **Watch mode**: `npm run test:watch`
- **Coverage**: `npm run test:cov`
- **End-to-end tests**: `npm run test:e2e`

All new features should include unit tests. Aim for >85% coverage on service files.

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Run `npm run lint` and fix any issues
4. Run `npm test` and ensure all tests pass
5. Commit with a [Conventional Commit](#commit-messages) message
6. Push and create a pull request

## Architecture Decision Records (ADRs)

We use ADRs to document important architectural decisions. These records are located in the `docs/adr/` directory.

- **Process**: When making a significant architectural change, propose it via a new ADR.
- **Format**: Follow the [Michael Nygard format](https://thinkrelevance.com/blog/2011/11/15/documenting-architecture-decisions).
- **Immutability**: Once an ADR is accepted, it is immutable. To change a decision, create a new ADR that supersedes the old one.
- **Naming**: Use `NNNN-short-title.md` (e.g., `0008-use-redis-for-caching.md`).

## Releases

Releases are automated with [release-please](https://github.com/googleapis/release-please) and follow [Semantic Versioning](https://semver.org/).

### How it works

1. Merge conventional commits to `main`.
2. **Release Please** opens (or updates) a release PR that bumps `package.json`, updates `CHANGELOG.md`, and prepares the next version.
3. Merging the release PR creates a GitHub release, a `vX.Y.Z` tag, and release notes from the changelog.
4. Pushing the tag triggers the **Release** workflow (`.github/workflows/release.yml`), which:
   - Verifies database migrations against a clean PostgreSQL instance
   - Builds and publishes Docker images to `ghcr.io/stellartip/backend:vX.Y.Z` and `:latest`
5. Production containers run pending migrations automatically on startup via `scripts/docker-entrypoint.sh`.

### Version bumps

| Commit type                         | Version bump |
| ----------------------------------- | ------------ |
| `fix`, `perf`, `refactor` (default) | patch        |
| `feat`                              | minor        |
| `BREAKING CHANGE` or `type!`        | major        |

### Database migrations

Generate a migration after entity changes:

```bash
npm run migration:generate -- src/migrations/DescriptiveName
```

Apply migrations locally:

```bash
npm run migration:run
```

The release workflow runs `migration:run` against a fresh database before publishing images to verify a safe migration path.

## Project Structure

```
src/
├── auth/           # Authentication (JWT, Stellar wallet, guards)
├── config/         # Database and app configuration
├── entities/       # TypeORM entities (User, Tip, Notification, RefreshToken)
├── health/         # Health check endpoints
├── notifications/  # In-app notification system
├── profiles/       # Creator profile management
├── stellar/        # Stellar blockchain interaction
├── tips/           # Tip transactions and history
├── app.module.ts   # Root application module
└── main.ts         # Application entrypoint
```

## Dependency Management

Dependabot is currently **disabled** for this repository. The `.github/dependabot.yml` configuration and the auto-merge workflow have been removed, so automated PRs for npm and GitHub Actions updates are no longer generated.

To update dependencies manually:

- **Local audit**: run `npm outdated` and `npm audit` to see what's behind.
- **Update**: use `npm update <pkg>` for in-range bumps, or `npm install <pkg>@latest` for the latest.
- **Verify**: run `npm run lint`, `npx tsc --noEmit`, and `npm test` before committing.
- **Commit message**: use the `deps:` prefix (e.g. `deps: bump @nestjs/common from 11.0.1 to 11.1.0`) for consistency with prior history.

If you want to re-enable Dependabot in the future, add a new `.github/dependabot.yml` config and recreate the `.github/workflows/dependabot-auto-merge.yml` workflow from git history.

## License

MIT
