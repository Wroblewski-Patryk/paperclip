# 2026-05-27 Full Takeover Audit and Operating Baseline (LUC-259)

## Scope and Role

- Issue: LUC-259 `[Paperclip_Softwarehouse] Full takeover audit and operating baseline`
- Date: 2026-05-27
- Owner: Portfolio Director
- Status: recovered baseline after detached run
- Consolidation note (2026-05-27): this issue/history was preserved while the duplicate `Paperclip_Softwarehouse` project bucket was archived and work was rebound to canonical `Softwarehouse Operating System` in the canonical local workspace.

This baseline captures the current operating truth for the canonical
Softwarehouse Operating System control plane and defines lane ownership so
technical execution can continue without relying on hidden chat context.

## Baseline Snapshot

1. Product and implementation contracts exist.
   - V1 implementation contract: `doc/SPEC-implementation.md`
   - Strategic framing: `doc/GOAL.md` and `doc/PRODUCT.md`

2. Repo-level contributor contract exists.
   - Required process and invariants are codified in `AGENTS.md`.
   - Softwarehouse boundaries, synchronization, and verification expectations are also maintained under `softwarehouse/`.

3. Local runtime command surface exists.
   - Canonical startup: `pnpm dev`.
   - Embedded database and local development notes are documented in `doc/DEVELOPING.md` and `doc/DATABASE.md`.

4. Current local control-plane API is reachable.
   - Correct local API base for this instance: `http://127.0.0.1:3200`.
   - The earlier LUC-259 run incorrectly probed `localhost:3100`, `3101`, and `3000`; those failed probes do not prove Paperclip API downtime for this active instance.

## Operating Risks

1. Detached-run liveness risk.
   - LUC-259 and earlier LUC-232/LUC-234 runs showed that dev-server restarts can leave active runs with lost process handles.
   - Guardrail added in `scripts/audit-luckysparrow-softwarehouse.mjs`: detached process runs and live runs attached to closed issues are now reported.

2. Baseline-to-lane drift risk.
   - A baseline issue can remain active without effective movement if lane ownership and unblock conditions are not attached to runnable child work.

3. Verification ambiguity risk.
   - Lane agents must report against concrete acceptance criteria and evidence, not free-form narrative.

4. Documentation root drift risk.
   - Planning and operating baseline artifacts should use the canonical `docs/` tree. Legacy/product-specific `doc/` files may still exist for Paperclip-native product specs, but new operational status should prefer `docs/`.

## Baseline Operating Model

1. Keep LUC-259 as orchestration parent, not an implementation lane.
   - It owns cross-lane state, blockers, and acceptance ledger.

2. Child lanes own execution.
   - Architecture/contracts lane: schema, API, UI contract consistency.
   - Runtime/Ops lane: startup health, execution path, environment and deploy readiness.
   - QA/evidence lane: smoke and regression evidence.
   - Product/docs lane: V0/MVP-to-V1 gate map and documentation alignment.

3. Closure gate.
   - LUC-259 can close after it records current baseline, identifies active risks, confirms the API base, and leaves follow-up lanes with owners and evidence expectations.

## Current Active State

- Roost is `in_progress` and blocked at protected smoke by missing approved `COMPANYCORE_API_KEY`.
- Soar is `in_progress`; several production/deploy lanes remain intentionally gated.
- Paperclip_Softwarehouse is `in_progress` while the softwarehouse operating system is being hardened.
- One-agent-one-active-lane is now audited via `agentsWithMultipleLiveRuns`.
- Detached process handles and live runs on closed issues are now audited.

## Immediate Next Actions

1. Keep supervising active autonomous lanes with `node scripts/audit-luckysparrow-softwarehouse.mjs`.
2. Do not restart production/deploy or secret-gated lanes without explicit operator approval.
3. Consolidate duplicate routine outputs when they appear under the same owner.
4. Continue strengthening the local Paperclip control plane so agents can self-detect:
   - wrong API base,
   - wrong docs root,
   - detached process runs,
   - WIP=1 violations,
   - closed issues with live runs.

## Evidence

- `node scripts/audit-luckysparrow-softwarehouse.mjs` detects model drift, instruction drift, WIP violations, detached runs, closed-issue live runs, stale in-progress issues, missing owners, and project status drift.
- Paperclip API base verified in this operator session as `http://127.0.0.1:3200`.
- LUC-259 detached run artifact was recovered from `doc/plans/2026-05-27-full-takeover-audit-and-operating-baseline.md`, corrected, and normalized into this `docs/planning/` document.
