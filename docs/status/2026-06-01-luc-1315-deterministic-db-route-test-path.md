## LUC-1315: Deterministic DB-backed Route-Test Path

Date: 2026-06-01
Owner: Ops Release Lead

### Decision

Use the existing embedded PostgreSQL route-test harness as the deterministic DB-backed proof path instead of requiring a host-level PostgreSQL instance on `localhost:5432`.

### Environment Contract

- Node + pnpm workspace dependencies installed (`pnpm install`).
- No external Postgres service required.
- Test harness provisions isolated DB runtime through `startEmbeddedPostgresTestDatabase(...)` from `@paperclipai/db`:
  - binds to `127.0.0.1` on an ephemeral non-reserved local port;
  - creates/migrates database automatically (`applyPendingMigrations`);
  - tears down data directory after test cleanup.

Relevant implementation:
- `packages/db/src/test-embedded-postgres.ts`
- `server/src/__tests__/helpers/embedded-postgres.ts`
- `server/src/__tests__/issue-scheduled-retry-routes.test.ts`

### Smoke Command

```bash
pnpm vitest run server/src/__tests__/issue-scheduled-retry-routes.test.ts
```

### Evidence (this run)

- Command status: pass
- File: 1 passed
- Tests: 12 passed
- Duration: ~30.85s
- Observed logs include transient shutdown warnings (`57P02 quickdie`) during embedded DB process lifecycle; suite still passes and cleanup completes.

### Unblock Mapping

- Unblock consumer issue: `LUC-1196` (Soar backend DCA-first close-authority route-level proof).
- Unblock owner: assignee of `LUC-1196` (`76972bb9-c2eb-41d4-bafc-2c14363da2bf`).
- Next action: run the same embedded Postgres-backed route-test pattern for the DCA close-authority route pack in the Soar workspace, without waiting for `localhost:5432`.
