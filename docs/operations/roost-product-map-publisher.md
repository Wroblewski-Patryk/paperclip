---
title: Roost Product Map Publisher (source-only)
summary: Protected, supervised Paperclip-to-Roost projection transport definition
---

# Roost Product Map Publisher

`server/src/services/roost-product-map-publisher.ts` defines the one and only
`roost-product-map-publisher` child service. This document records the source
package for PMAP-REL provenance; it does not activate the service.

The publisher reads only the company-scoped Paperclip projection route on
loopback port `3200`, validates the shared v1 packet, and posts its bounded
envelope to the separately pinned Roost HTTPS ingestion URL. It has a
five-minute tick, a single-flight/coalescing run lock, three attempts,
three-second connection bound, and ten-second total operation bound.

Its only runtime bindings are names, never values:

- `PRODUCT_MAP_PAPERCLIP_SOURCE_URL`
- `PRODUCT_MAP_PAPERCLIP_READ_KEY`
- `PRODUCT_MAP_ROOST_INGEST_URL`
- `PRODUCT_MAP_ROOST_INGEST_KEY`
- `PRODUCT_MAP_ROOST_INGEST_SIGNING_KEY` (only when separately approved)

Board, session, agent, and run credential shapes are rejected before a source
read. The outbound client refuses redirects, proxy inheritance, non-443 URLs,
and loopback/private/link-local/multicast/reserved DNS results. Telemetry is
limited to outcome, attempt count, digest/idempotency identifiers, and stable
error code; it excludes bindings and request payloads.

Activation, secret provisioning, runtime registration, production reachability,
and Roost ingress acceptance remain held by the protected release gate. Before
activation, PMAP-REL must record this file's exact commit and package digest,
the supervisor service identity, the prior rollback package, and a clean
post-upgrade stop/start readback.
