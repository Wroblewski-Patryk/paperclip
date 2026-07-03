# 2026-05-27 LUC-279 Windows Test Runner Spawn Fix

## Scope

- Issue: `LUC-279` (`Fix Windows test runner spawnSync pnpm ENOENT for runtime regression suites`)
- Goal: prevent Windows agent harness runs from failing before Vitest starts because `pnpm` cannot be spawned directly.

## Changes Applied

1. Updated `scripts/run-vitest-stable.mjs` to invoke `pnpm` through the shell on Windows.
2. Updated `server/src/__tests__/workspace-runtime.test.ts` helper calls to use the same Windows shell execution path for `pnpm`.

## Verification

Command:

```sh
node scripts/run-vitest-stable.mjs --mode serialized --shard-count 100 --shard-index 0
```

Observed result:

- `server/src/__tests__/access-routes-permissions-upgrade.test.ts` ran through the stable runner.
- 1 test file passed.
- 2 tests passed.
- No `spawn pnpm ENOENT` startup failure occurred.

## Residual Risk

This verifies the stable runner can spawn `pnpm` in the Windows harness on one serialized shard. A full `pnpm test:run` remains broader release evidence and should be run before claiming full repository regression closure.
