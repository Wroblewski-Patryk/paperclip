---
title: Roost Product Map Publisher
summary: Active, protected Paperclip-to-Roost projection transport definition
---

# Roost Product Map Publisher

`server/src/services/roost-product-map-publisher.ts` defines the one and only
`roost-product-map-publisher` child service. The canonical local runtime enables
it through `.paperclip/.env`; the ingest credential remains encrypted in the
Paperclip secret store and is resolved only for this system target.

The publisher reads only the company-scoped Paperclip projection route on
loopback port `3200`, validates the shared execution packet, adapts it to
Roost's closed Product Map schema `2.0`, and posts the bounded envelope to the
separately pinned Roost HTTPS ingestion URL. The adapter preserves project
identity, lifecycle stage, readiness, issue aggregates, and source/deployed
SHA truth. It never invents verified lifecycle evidence: gates without
inspectable evidence remain explicitly blocked. It has a
five-minute tick, a single-flight/coalescing run lock, three attempts,
three-second connection bound, and ten-second total operation bound.

The durable outbox is latest-state transport, not an activity archive. A newer
snapshot atomically supersedes older pending snapshots so an obsolete contract
or outage backlog cannot starve the current owner-visible state. Published and
superseded rows remain auditable with names-only error codes.

Its only runtime bindings are names, never values:

- `PRODUCT_MAP_PAPERCLIP_SOURCE_URL` (derived from the local company id by default)
- `PRODUCT_MAP_PAPERCLIP_READ_KEY` (optional on loopback in `local_trusted` mode)
- `PRODUCT_MAP_ROOST_INGEST_URL`
- `PRODUCT_MAP_ROOST_INGEST_SECRET_ID` (non-secret pointer to the encrypted binding)
- `PRODUCT_MAP_ROOST_INGEST_KEY` (resolved in memory; never stored in `.env`)
- `PRODUCT_MAP_ROOST_INGEST_SIGNING_KEY` (only when separately approved)

Board, session, agent, and run credential shapes are rejected before a source
read. The outbound client refuses redirects, proxy inheritance, non-443 URLs,
and loopback/private/link-local/multicast/reserved DNS results. Telemetry is
limited to outcome, attempt count, digest/idempotency identifiers, and stable
error code; it excludes bindings and request payloads.

Any future key rotation must recreate the exact
`product-map:projection:ingest` scope, rotate the encrypted secret version,
restart the canonical runtime, and prove both outbox delivery and Roost
readback. A direct broad API key or owner session must never be placed in the
publisher environment.

Verification is explicit and secret-safe:

```powershell
node server/node_modules/tsx/dist/cli.mjs scripts/verify-roost-product-map-contract.ts
node server/node_modules/tsx/dist/cli.mjs scripts/bootstrap-roost-product-map-publisher.ts --verify
```

The first command validates the generated envelope against Roost's actual
parser. The second performs an owner-session readback using temporary encrypted
bindings and outputs only status, schema version, and project names.
