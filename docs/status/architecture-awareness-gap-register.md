# Architecture Awareness Gap Register

Generated: 2026-05-27
Scope: LUC-265 [LUC-259] architecture graph and traceability audit

## Baseline

- `implemented and verified`: graph export pipeline runs and produces all required artifacts.
- Evidence command: `node scripts/build-architecture-awareness-index.mjs --project Paperclip --root . --out docs`
- Current counts (from `docs/status/architecture-awareness-report.md`, generated 2026-05-27T01:30:38.657Z):
  - entities: 12377
  - relations: 17517
  - blocked entities: 1
  - api endpoints: 363
  - implementation entities without inferred tests: 9338
  - implementation entities without inferred docs: 1699

## Gaps And Owner Lanes

Contract snapshot (2026-05-27): `docs/architecture/architecture-evidence-graph-system.md`
declares `docs/architecture/registry/*`, `docs/architecture/relations/*`, and
`docs/architecture/chains/*` as source-of-truth, but those files are currently
absent. Present exports are inference-based (`docs/graphs/*`, `docs/status/*`).
This keeps traceability high-level and harder to curate deterministically.

1. Gap: Large missing inferred test coverage (`9338`) limits verification confidence.
Owner: QA Regression Lead
Action: Define top-priority architecture entities (routes/endpoints/features) that must have explicit test relations and add coverage map.
Proof required: Reduced missing-test count for priority slice + linked tests in architecture exports.

2. Gap: Large missing inferred documentation links (`1699`) limits onboarding traceability.
Owner: Docs Memory Lead
Action: Map high-impact modules/routes to canonical docs and backfill doc links where coverage is missing.
Proof required: Reduced missing-doc count for priority slice + doc index cross-links.

3. Gap: Entity ownership is mostly unset in generated graph.
Owner: CTO Architect + Engineering Delivery Lead
Action: Define owner attribution rules by path prefix (for example `server/`, `ui/`, `packages/db/`) and enrich export with default owner fields.
Proof required: Owner field populated for target module set with reviewed mapping contract.
Status update (2026-05-27): Completed in `LUC-277`.
- Rules documented in `docs/architecture/owner-attribution-rules.md`.
- Export pipeline updated in `scripts/build-architecture-awareness-index.mjs`.
- Verification in `docs/status/architecture-awareness-report.md` shows `Entities without owner attribution: 0`.

4. Gap: Scanner still uses inference heuristics; critical entities can be misclassified.
Owner: CTO Architect
Action: Add a curated override input (allowlist/denylist or entity metadata file) for high-value architecture entities.
Proof required: Override file committed and referenced in scanner output/report.
Evidence (2026-05-27):
- Override file committed at `docs/architecture/scanner-overrides.json`.
- Scanner now supports `--overrides` and default loading from `docs/architecture/scanner-overrides.json`.
- Generated report notes now include override input path and applied override summary.

5. Gap: Declared CSV registry and chain source-of-truth is missing in-repo.
Owner: CTO Architect + Docs Memory Lead
Action: Bootstrap required files and define ownership/update workflow for
`registry/*`, `relations/*`, and `chains/*`, then use scanner exports as
derived evidence instead of sole source-of-truth.
Proof required: Required files committed with initial curated rows and linked
from architecture docs.
Status update (2026-05-27): Completed in `LUC-274`.
- Canonical source-of-truth CSV sets now exist under:
  - `docs/architecture/registry/*` (nodes, functions, components, api routes,
    ui elements, tests, agents, prompts, events, workflows, pages, features)
  - `docs/architecture/relations/*` (dependencies, documentation-links)
  - `docs/architecture/chains/chains.csv`
- `docs/architecture/architecture-evidence-graph-system.md` now defines scanner
  and report outputs as derived evidence (`docs/graphs/*`, `docs/status/*`).

## Next Control-Loop Step

- Child lanes created under `LUC-265`:
  - `LUC-274`: bootstrap canonical architecture registries/chains
  - `LUC-275`: backfill priority test links
  - `LUC-276`: backfill priority documentation links
  - `LUC-277`: define/apply owner attribution rules
  - `LUC-278`: add scanner override input for critical entities
- Parent `LUC-265` can close as completed audit scope; execution risk remains
  tracked in these owned child issues.
