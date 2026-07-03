# 2026-05-27 V1 Acceptance Test Matrix (LUC-270)

Scope: Executable release-gate matrix for Paperclip V1, mapped to `doc/SPEC-implementation.md` milestones, regression minimum, and release acceptance criteria.
Parent: `LUC-259`
Issue: `LUC-270`

## How to Use

- Run the matrix in order from `G0` to `G9`.
- A gate passes only when all listed checks pass and evidence is attached.
- Any failed gate blocks V1 release candidate sign-off.

## Gate Matrix

| Gate | SPEC Source | What must be true | Executable verification | Evidence required |
|---|---|---|---|---|
| G0: Environment Baseline | §19 (criterion 9), §6.2 | App runs with embedded Postgres and with external Postgres via `DATABASE_URL`. | 1) Start without `DATABASE_URL` and confirm app boots + CRUD health. 2) Start with external Postgres (`DATABASE_URL` set) and re-run same health checks. | Startup logs for both modes, API health responses, and one successful CRUD trace per mode. |
| G1: Company + Auth Boundaries | §19 (criteria 1, 4), §17.4 (auth boundary tests), Milestone 1 | Board can create/switch companies; company scoping + auth boundaries enforced; agent API keys work for agent lanes only. | 1) Create two companies as board, switch context, verify isolated list results. 2) Attempt cross-company read/write and confirm deny (`403/404`). 3) Use agent API key to update issue comment/cost in its own company and confirm unauthorized actions are denied. | API request/response captures for allow + deny cases, plus activity log entries. |
| G2: Core Task/Governance Semantics | §19 (criteria 3, 5, 8), Milestone 2 | Atomic checkout conflicts are safe; approval workflows enforce governance; mutations are auditable. | 1) Run two concurrent `POST /issues/{id}/checkout` attempts; confirm one success and one `409`. 2) Submit hire/strategy approval flow and confirm board approve/reject paths in UI. 3) Verify activity entries for each mutation. | Checkout race trace with timestamps, approval workflow screenshots/API traces, activity log export. |
| G3: Heartbeat + Runtime | §19 (criterion 2), Milestone 3 | At least one active heartbeat-enabled agent executes end-to-end with persisted heartbeat runs/status. | 1) Create active agent with heartbeat trigger. 2) Dispatch work issue and invoke heartbeat path. 3) Confirm run created, status transitions persisted, and issue updated by agent path. | Heartbeat run record(s), issue timeline, and final task/comment mutation evidence. |
| G4: Cost + Budget Hard Stop | §19 (criterion 6), §17.4 (hard budget stop), Milestone 4 | Budget hard limit auto-pauses agent and prevents new invocations. | 1) Set low monthly budget. 2) Submit cost events until threshold crossed. 3) Confirm agent transitions to paused and next invocation is blocked with explicit budget reason. | Cost-event log, agent status transition proof, blocked invocation response. |
| G5: Dashboard Correctness | §19 (criterion 7), §17.4 (dashboard summary consistency), Milestone 5 | Dashboard counts/spend match live DB state. | 1) Seed deterministic set of issues/statuses and cost entries. 2) Compare dashboard payload/UI totals against direct DB/API aggregates. | Snapshot of seed data, dashboard payload, and reconciliation table (expected vs actual). |
| G6: Regression Minimum | §17.4 | Release candidate blocks unless minimum regression suite passes. | Execute and record pass for: auth boundary tests, checkout race test, hard budget stop test, agent pause/resume test, dashboard summary consistency test. | Test run artifact containing each named regression and pass status. |
| G7: API Contract Coverage | §10, §19 (criteria 3, 4, 8) | V1-critical REST contract paths behave as specified for auth, status transitions, comments, checkout/release, approvals, costs, and dashboard reads. | Run contract checks for required endpoints with positive + negative cases (unauthorized, invalid transition, conflict). | Endpoint checklist with pass/fail and linked traces per endpoint. |
| G8: UI Release Path | §14, §19 (criteria 1, 5, 7) | Board can complete the release-critical UX path without hidden failures. | Execute scripted board journey: company switch, org/agents, issue workflow, approval decision, budget visibility, dashboard verification. Confirm each failure is surfaced in UI. | Screen recording or screenshot pack and step-by-step pass sheet. |
| G9: Final V1 Gate Decision | §19 (all criteria), Milestone 6 | All nine release criteria are true simultaneously on the same RC build. | Produce final gate ledger mapping criteria 1-9 -> evidence IDs from G0-G8 and mark each pass/fail. | Signed gate ledger document + reviewer approval comment. |

## Criterion-to-Gate Map

| Release Criterion (§19) | Primary gate(s) |
|---|---|
| 1. Multi-company create/switch | G1, G8 |
| 2. Active heartbeat-enabled agent | G3 |
| 3. Checkout conflict-safe `409` | G2, G7 |
| 4. Agent key updates tasks/comments/costs only | G1, G7 |
| 5. Board approve/reject hire + strategy in UI | G2, G8 |
| 6. Hard budget auto-pause + invocation prevention | G4, G6 |
| 7. Dashboard accuracy from live DB | G5, G6 |
| 8. Every mutation auditable | G2, G7 |
| 9. Embedded + external Postgres runtime | G0 |

## Minimal CI Release-Gate Suite

The release-candidate gate should enforce this minimum suite set:

1. `v1-unit-governance`: state transitions, invariants, permission guards, and budget rules.
2. `v1-integration-api`: tenancy boundaries, checkout race, approvals, cost ingestion, and activity log.
3. `v1-e2e-control-plane`: board creates company -> hires CEO -> approves strategy -> agent executes work -> cost reported -> budget stop enforced.

## SPEC-to-Gate Traceability

- §2 and §5 (outcomes and scope): overall completeness across `G0..G9`.
- §6.2 (runtime stores): `G0` environment baseline.
- §7 (canonical model): `G1`, `G2`, `G3`, `G4`, `G6`, `G8`.
- §8 (state machines): `G2`, `G3`, `G4`.
- §9 (auth/permission): `G1`, `G7`.
- §10 (REST contract): `G1`, `G2`, `G4`, `G7`.
- §11 (heartbeat contract): `G3`.
- §12 (governance): `G2`, `G8`.
- §13 (cost/budget): `G4`, `G6`.
- §14 (UI requirements): `G8`.
- §17.4 (regression minimum): `G6`.
- §19 (release acceptance): `G9`.

## Minimal Execution Ownership (for LUC-259 closure)

- Runtime/Ops lane: G0, G3, G4
- Architecture/contracts lane: G1, G2, G7
- QA/evidence lane: G5, G6, G9
- Product/docs lane: maintain this matrix and final criterion ledger

## Exit Rule

`LUC-259` may close only when `G9` is passed with linked evidence IDs for all criteria and no open failed gate.
