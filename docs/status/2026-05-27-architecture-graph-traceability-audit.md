# 2026-05-27 Architecture Graph And Traceability Audit (LUC-265)

## Scope

- Parent initiative: `LUC-259` full takeover baseline.
- Audit issue: `LUC-265` architecture graph and traceability audit.
- Focus: declared architecture traceability contract vs current repository state.

## Evidence Collected

- Contract documents reviewed:
  - `docs/architecture/architecture-evidence-graph-system.md`
  - `softwarehouse/architectural-awareness-layer.md`
  - `docs/documentation-map.md`
- Current graph exports reviewed:
  - `docs/graphs/architecture-awareness.json`
  - `docs/graphs/architecture-awareness.csv`
  - `docs/graphs/architecture-graph.md`
  - `docs/graphs/architecture-graph.mmd`
  - `docs/status/architecture-awareness-report.md`
  - `docs/status/architecture-awareness-gap-register.md`
- Contract-path existence check run for:
  - `docs/architecture/registry/*`
  - `docs/architecture/relations/*`
  - `docs/architecture/chains/*`

## Findings

1. `high`: Source-of-truth mismatch.
The architecture evidence doc declares CSV registries and chains under
`docs/architecture/{registry,relations,chains}` as canonical. None of those
declared files exist in the repository.

2. `medium`: Scanner exports are available and fresh, but inferential.
`docs/status/architecture-awareness-report.md` is generated on 2026-05-27 and
shows broad inferred coverage (12,377 entities, 17,517 relations), but this is
not a curated chain/registry contract for deterministic architecture changes.

3. `medium`: Traceability confidence remains limited by missing links.
The same report shows `9338` implementation entities without inferred tests and
`1699` without inferred docs, so proof coverage is still sparse in critical
areas like API endpoints.

4. `medium`: Control-loop documentation drift.
`docs/status/architecture-awareness-gap-register.md` was still scoped to
`LUC-224`. It is now updated to `LUC-265` and expanded with the missing-registry
gap so the issue's ownership and next steps are explicit.

## SPEC-Implementation Traceability Matrix

| SPEC section | Required behavior | Current evidence | Status |
| --- | --- | --- | --- |
| `6.1 Runtime Components` | Runtime architecture should be represented and inspectable. | Generated architecture graph artifacts exist: `docs/graphs/architecture-graph.md`, `docs/graphs/architecture-graph.mmd`. | `partial` |
| `10.4 Tasks` + `10.4.1 Atomic Checkout Contract` | Architecture audit work must be durable and tied to issue execution artifacts. | This issue (`LUC-265`) has durable markdown artifacts in `docs/status/*` and explicit issue-thread evidence updates. | `met` |
| `15.3 Logging and Audit` | Mutations and delivery evidence should be auditable. | Gap register and audit record are versioned in-repo and linked to issue scope. | `met` |
| `17 Testing Strategy` | Verification confidence should be explicit and measurable. | `docs/status/architecture-awareness-report.md` shows `9338` entities without inferred tests. | `gap` |
| `19 Acceptance Criteria (Release Gate)` | Traceability/proof should support release-quality confidence. | `docs/architecture/{registry,relations,chains}/*` declared as source-of-truth but missing; current exports are inference-only. | `gap` |

Interpretation: the runtime graph export exists and is fresh, but release-grade
traceability remains blocked on missing curated architecture registries and
evidence-link coverage.

## Subsystem To SPEC Section Mapping

| Implemented subsystem | SPEC-implementation section(s) | Primary artifact(s) |
| --- | --- | --- |
| Runtime component inventory (`server`, `ui`, `packages/db`, `packages/shared`) | `6.1 Runtime Components` | `doc/SPEC-implementation.md`, `docs/graphs/architecture-graph.md` |
| Core task/audit lifecycle traceability | `7.6 issues`, `10.4 Tasks`, `10.4.1 Atomic Checkout Contract` | Issue `LUC-265` thread + `docs/status/architecture-awareness-gap-register.md` |
| Control-plane audit logging and durable mutation evidence | `15.3 Logging and Audit` | Paperclip issue comment log and versioned docs under `docs/status/*` |
| Verification/test confidence posture | `17 Testing Strategy` | `docs/status/architecture-awareness-report.md` |
| Release-gate architecture proof completeness | `19 Acceptance Criteria (Release Gate)` | Missing canonical `docs/architecture/{registry,relations,chains}/*` + present inferred `docs/graphs/*` |

## Command And Artifact Evidence

Commands executed during audit (PowerShell):

1. Validate SPEC section anchors:
   - `rg -n "^## |^### " doc/SPEC-implementation.md`
2. Validate architecture graph source-of-truth contract and existing exports:
   - `Get-Content docs/architecture/architecture-evidence-graph-system.md -TotalCount 260`
   - `Get-ChildItem -Recurse docs/graphs,docs/status | Select-Object FullName`
3. Verify canonical registry/relations/chains path existence:
   - `Test-Path docs/architecture/registry/nodes.csv`
   - `Test-Path docs/architecture/relations/dependencies.csv`
   - `Test-Path docs/architecture/chains/chains.csv`

Observed outputs:

- SPEC headings include sections used by this audit:
  `6.1`, `7.6`, `10.4`, `10.4.1`, `15.3`, `17`, `19`.
- Graph/report artifacts exist:
  `docs/graphs/architecture-awareness.{json,csv}`,
  `docs/graphs/architecture-graph.{md,mmd}`,
  `docs/status/architecture-awareness-report.md`.
- Canonical source-of-truth files do not exist yet:
  `docs/architecture/registry/nodes.csv` -> `False`,
  `docs/architecture/relations/dependencies.csv` -> `False`,
  `docs/architecture/chains/chains.csv` -> `False`.

## Changes Made In This Heartbeat

- Updated `docs/status/architecture-awareness-gap-register.md`:
  - scope moved to `LUC-265`;
  - added contract compliance snapshot;
  - added new lane for bootstrapping missing source-of-truth CSV registries;
  - updated control-loop next step from 4 lanes to 5 lanes.
- Added this audit record for durable evidence.

## Proposed Next Lanes

1. Bootstrap canonical registry/chains (`registry/*`, `relations/*`, `chains/*`)
with minimal curated seeds and maintenance contract.
2. Add owner attribution rules into graph generation and/or curated registries.
3. Create prioritized doc-link and test-link backfill for high-impact routes.
4. Add scanner override inputs for critical entities to reduce misclassification.

## Verification

- File existence checks for declared registry/chain paths confirm they are
absent as of 2026-05-27.
- Current generated report values verified against
`docs/status/architecture-awareness-report.md` generated timestamp
`2026-05-27T01:30:38.657Z`.

## Addendum (Post-Bootstrap)

Update date: 2026-05-27

The missing canonical source-of-truth finding in this audit is now resolved by
`LUC-274`.

- `docs/architecture/registry/*` now exists with curated seed records.
- `docs/architecture/relations/*` now includes canonical dependency and
  linkage files.
- `docs/architecture/chains/chains.csv` now exists with curated chain rows.
- `docs/architecture/architecture-evidence-graph-system.md` now explicitly
  marks scanner/report exports (`docs/graphs/*`, `docs/status/*`) as derived
  evidence rather than canonical source-of-truth.
