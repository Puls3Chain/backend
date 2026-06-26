# Secret scanning

StellarTip uses Gitleaks to block committed credentials before they reach the
main branch.

## CI checks

The `Secret Scan` CI job runs on pushes and pull requests. It performs:

- a full repository scan using `.gitleaks.toml`
- a pull request diff scan when the workflow is triggered by a PR

The job fails when it finds API keys, JWT secrets, private keys, Stellar secret
keys, or other supported credentials.

## Local pre-commit check

Install Gitleaks locally:

```bash
brew install gitleaks
```

or follow the installation guide for your operating system from the Gitleaks
project.

The Husky pre-commit hook runs:

```bash
gitleaks protect --staged --redact --config .gitleaks.toml
```

If Gitleaks is not installed, the hook prints a warning and continues so local
development is not blocked by a missing optional binary. CI remains the
enforced gate.

## Allowed placeholders

`.gitleaks.toml` allowlists only deterministic local placeholders and test
fixtures, including:

- `JWT_SECRET=change-me-to-a-random-secret`
- `JWT_SECRET=test-secret-key`
- `JWT_SECRET=e2e-secret-key`
- `DB_PASSWORD=postgres`
- deterministic test tokens such as `test-access-token`

Do not add production credentials, wallet private keys, or real API tokens to
the allowlist. Replace real secrets with environment variables or GitHub
Actions secrets instead.
