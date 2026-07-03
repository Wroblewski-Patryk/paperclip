# 2026-05-27 LUC-276 Priority Documentation Links Backfill

## Scope

- Issue: `LUC-276` (`[LUC-265] Backfill priority documentation links for architecture entities`)
- Goal: backfill explicit documentation relations for high-priority API endpoint entities so architecture traceability is less inference-only.
- Consolidation note: evidence references in this record are repository-relative so
  the artifact remains valid after project/workspace rebinding.

## Changes Applied

1. Expanded `docs/architecture/relations/documentation-links.csv` with curated
   API route to docs mappings for priority backend route groups:
   - `access`, `activity`, `agents`, `approvals`, `auth`, `companies`,
     `costs`, `dashboard`, `goals`, `issues`, `projects`, `routines`, `secrets`.
2. Added 174 unique `entity_path -> doc_path` mappings (37 -> 211 total rows in
   `documentation-links.csv`).
3. Regenerated architecture exports with:
   - `node scripts/build-architecture-awareness-index.mjs --project Paperclip --root . --out docs`

## Verification Evidence

- Generator run succeeded and produced fresh exports on `2026-05-27T02:16:07.039Z`.
- Health signal delta in `docs/status/architecture-awareness-report.md`:
  - `Implementation entities without inferred docs`:
    - before: `1699` (report baseline in `docs/status/architecture-awareness-gap-register.md`)
    - after: `1441`
  - net reduction: `258`
- Canonical evidence artifacts:
  - `docs/architecture/relations/documentation-links.csv`
  - `docs/status/architecture-awareness-report.md`
  - `docs/graphs/architecture-awareness.csv`
  - `docs/graphs/architecture-awareness.json`
  - `docs/graphs/architecture-graph.md`
  - `docs/graphs/architecture-graph.mmd`

## Mapping Strategy

- Use canonical API doc pages under `docs/api/*` for route-family level coverage.
- Keep mappings deterministic by using architecture scanner `entity_path` format:
  `server/src/routes/<file>.ts#/<route-path>`.
- Avoid speculative cross-domain links; only mapped routes with clear owner docs.

## Residual Gaps (Next Backfill Candidates)

Top unresolved missing doc links are currently concentrated in route families
without canonical docs coverage in this heartbeat, including:

- `server/src/routes/adapters.ts`
- `server/src/routes/assets.ts`
- `server/src/routes/cloud-upstreams.ts`
- `server/src/routes/company-skills.ts`
- `server/src/routes/environments.ts`
