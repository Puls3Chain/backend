# Contract Integration

This backend verifies tips against the Soroban contract that owns the on-chain tip ledger. Horizon remains the transaction transport and audit layer, but the contract is treated as the source of truth for the actual tip record.

## Runtime Flow

1. `POST /tips/:id/verify-onchain` loads the tip from Postgres.
2. The tip's creator wallet and chronological index are derived from the creator's tip history.
3. `StellarService.verifyPayment()` confirms the Horizon transaction hash.
4. `StellarService.verifyTipOnContract()` reads the on-chain tip data through Soroban RPC.
5. The backend compares sender, receiver, amount, and timestamp.
6. Mismatches create a `discrepancy_detected` notification for the creator.

## Environment Variables

- `STELLAR_SOROBAN_URL` points to the Soroban RPC endpoint.
- `STELLAR_CONTRACT_ID` points to the deployed StellarTip contract ID for the active network.
- `REDIS_URL` enables 60-second verification result caching.

## Contract ABI

The documented ABI lives in `src/stellar/contract/abi.json` and describes the read-only contract surface used by the backend:

- `get_balance(creatorAddress)`
- `get_tip(creatorAddress, tipIndex)`
- `get_tip_count(creatorAddress)`

The ABI file is documentation-first. The runtime verifies against the live contract deployed to the configured Soroban RPC network.

## Caching

Verification results are cached for 60 seconds. When `REDIS_URL` is configured, Redis is used. Otherwise, the service falls back to a local in-memory cache so local development still works.

## Notes

- Horizon is still used to validate the submitted transaction hash.
- Soroban RPC is used to validate the contract's canonical tip record.
- If the two sources disagree, the discrepancy notification is emitted and the cached verification result is reused for the TTL window.
