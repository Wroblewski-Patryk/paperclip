---
title: Softwarehouse API
summary: Company-scoped Softwarehouse status and the versioned read-only Roost portfolio bridge
---

# Softwarehouse API

Softwarehouse endpoints are read-only company projections. They require normal Paperclip authentication and enforce the company boundary before reading source data.

## Roost portfolio projection v1

```http
GET /api/companies/{companyId}/softwarehouse/portfolio-projection/v1
```

The endpoint publishes the smallest stable Paperclip execution/evidence packet needed by the Roost portfolio map. It does not write to Roost and does not expose prompts, transcripts, tool calls, secrets, or full issue/run records.

The response uses:

- route version `v1` and schema version `1.0`;
- source version `softwarehouse-status-v1`;
- stable `companyId`, database-backed `paperclipProjectId`, and `offeringId` values;
- bounded issue, run, approval, and evidence counts (maximum 2,000 source rows per aggregate family);
- a deterministic `sourceSnapshotId` computed from semantic source data, excluding the request observation time;
- explicit `stale`, `sourceState`, `conflictState`, and `supersessionState` fields;
- explicit readiness evidence state and `zeroGapButNoGo`, so zero known gaps never overrides a recorded `NO-GO` decision;
- source/deployed SHA alignment and safe provenance paths/timestamps.

`sourceState` is `available`, `unavailable`, or `timed_out`. Source and database reads use a seven-second bound. Unavailable or timed-out inputs return a valid fail-closed packet with `stale: true`, `conflictState: "source_unavailable"`, a typed `failure`, and no speculative items.

The file-backed Softwarehouse source belongs to the one company configured by `SOFTWAREHOUSE_COMPANY_ID`. The route checks that ownership before loading the control-status file or mapping database projects. An authorized request for any other company, or a deployment with no configured owning company, receives the same fail-closed unavailable packet with zero items. Matching project names in another company never authorize projection of the owning company's workspace facts.

Per-item supersession is resolved only when the owner surface is available and both `ownerSurfaceUpdatedAt` and `controlStatusObservedAt` are valid timestamps. An owner timestamp strictly newer than the control observation yields `superseded`; equality or an older owner timestamp yields `current`. An unavailable owner surface or a missing/invalid timestamp yields `unknown`.

Top-level supersession is fail-closed. A project-mapping conflict, unavailable owner surface, unresolved item, or empty packet yields `unknown`. Otherwise, any superseded item yields `superseded`; only a non-empty packet whose items are all current yields `current`. Project-mapping conflict takes precedence over owner-surface conflict in the top-level `conflictState`, and either conflict prevents a speculative top-level `current` or `superseded` result.

Aggregate zero is evidence only when its source read succeeded. An available evidence source with no rows reports `total: 0`, empty `byStatus`, `healthy: 0`, `reviewed: 0`, and `truncated: false`. Repository rejection or timeout returns the typed unavailable/timed-out packet above; it is never converted into a zero aggregate.

Only `v1` is compatible. Another route version returns `422` with `supportedRouteVersions: ["v1"]`; consumers must not coerce an incompatible packet.

### Safety and authority

- Paperclip remains authoritative for company, project, issue, run, approval, and evidence facts.
- Roost remains the owner-facing aggregate and may surface conflicts without silently overwriting Paperclip truth.
- A `NO-GO`, missing evidence, SHA mismatch, stale source, unmapped project, or unavailable owner surface remains explicit and fail-closed.
- This contract grants no write-back, deployment, restart, production-smoke, secret, or provider authority.

## Related status endpoint

```http
GET /api/companies/{companyId}/softwarehouse/status
```

This broader owner-facing status projection remains available for the local Softwarehouse UI. Roost consumers should use the dedicated versioned bridge endpoint above.
