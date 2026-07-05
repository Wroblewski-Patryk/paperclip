# Soar Coolify VPS Contract

Last updated: 2026-07-05

## Scope

This contract records the read-only production resource inventory for Soar in
Coolify. Secret values and full resource identifiers are intentionally omitted.

## Target

| Field | Value |
| --- | --- |
| Project | Soar |
| Environment | production |
| Team/workspace | LuckySparrow configured in runtime secrets |
| Inventory source | Read-only Coolify API direct resource reads |
| Verification timestamp | 2026-07-05T00:14:04.231Z |

## Resource Inventory

| Resource | Kind | Type | Read status | Runtime status | Git metadata |
| --- | --- | --- | --- | --- | --- |
| `soar-web` | application | dockerfile | 200 OK | running:unknown | branch and commit present |
| `soar-api` | application | dockerfile | 200 OK | running:unknown | branch and commit present |
| `workers-backtest` | application | dockerfile | 200 OK | running:unknown | branch and commit present |
| `workers-execution` | application | dockerfile | 200 OK | running:unknown | branch and commit present |
| `workers-market-data` | application | dockerfile | 200 OK | running:unknown | branch and commit present |
| `workers-market-stream` | application | dockerfile | 200 OK | running:unknown | branch and commit present |
| `postgresql` | database | standalone-postgresql | 200 OK | running:healthy | not applicable |
| `redis` | database | standalone-redis | 200 OK | running:healthy | not applicable |

## Current Assessment

Implemented and verified: read-only Coolify access can resolve the expected
eight Soar production resources directly by configured resource references:
six Dockerfile application resources, Postgres, and Redis.

Implemented but not fully verified: project/environment aggregate discovery.
The existing reconciler reached the configured Coolify team and direct
resources, but the aggregate project route returned `404` for the currently
configured project id. Until that is resolved, resource-by-resource post-push
verification should use the direct resource references above and should not rely
on `/api/v1/projects/<project>/<environment>` as the inventory authority.

## Safety Boundary

- Read-only status and metadata checks are allowed with configured Coolify read
  credentials.
- Deploy, restart, rollback, environment mutation, and log inspection with
  sensitive output still require an explicit release mutation permit.
- Comments, screenshots, and artifacts must redact secret values and full
  resource identifiers.

