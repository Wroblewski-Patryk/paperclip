# LUC-310 Delivery Plan (Gate Freshness Watcher)

Date: 2026-05-27
Owner role: Engineering Delivery Lead (decomposition only)
Issue: LUC-310 (critical)

Status: superseded by completed Paperclip issue state.

This file is retained as a historical handoff artifact, not an active delivery
plan. `LUC-310` was later marked `done` after the mandatory watcher path ran
successfully through the active local Paperclip API at `http://127.0.0.1:3200`.
The blocker notes below were produced while a run probed inactive local ports
(`3100`/`3101`) and should not be used as current operating guidance.

## Scope framing

This lane requires implementation, verification, and integration for a "gate freshness watcher" capability.
Engineering Delivery Lead does not implement feature code and must delegate to specialists.

## Required implementation lanes

1. Backend API Engineer
- Layer: server orchestration + API
- Expected output:
  - Add freshness watcher execution path and scheduler/trigger integration.
  - Add company-scoped route/service exposure if required by V1 contract.
  - Emit activity log events for mutating watcher actions.
- Proof:
  - Targeted backend tests covering stale-gate detection and refresh transitions.
  - API smoke call examples with expected status codes.
- Closure requirements:
  - files changed, verification commands/results, commit SHA, push status, deploy impact, residual risk.

2. Data Persistence Engineer (conditional)
- Layer: packages/db + shared contracts
- Trigger: only if freshness state needs persisted model or migration.
- Expected output:
  - Schema changes + exports + migration.
  - Shared validators/types/constants synchronized.
- Proof:
  - migration generation output + targeted typecheck.

3. Frontend Engineer (conditional)
- Layer: ui
- Trigger: only if operator-facing visibility/control is required.
- Expected output:
  - Surface freshness status and failure states clearly.
  - Company-scoped API wiring.
- Proof:
  - UI test or targeted smoke screenshots with stale/fresh/error states.

4. QA Regression Lead
- Layer: verification
- Expected output:
  - Repeatable regression check for freshness watcher path.
- Proof:
  - command-based verification artifact proving pass/fail behavior.

## Integration order

1. Confirm architecture entities + exact affected modules.
2. Backend implementation (and DB lane if needed).
3. Shared contract sync validation.
4. Frontend visibility (if in scope).
5. QA regression check.
6. Delivery integration review and parent issue disposition.

## Blockers recorded in this run

1. Governance blocker
- Constraint: active role file prohibits feature-code implementation by this agent.
- Unblock owner: CTO / Project Manager
- Unblock action: assign specialist child issue(s) to backend/data/frontend/QA owners.

2. Control-plane access blocker
- Constraint: local Paperclip API unreachable (`http://localhost:3100/api/health`, `http://localhost:3101/api/health`).
- Unblock owner: Ops / local runtime owner
- Unblock action: restore Paperclip API and then apply issue status/comment updates to reflect delegation/blocked state.

## Proposed immediate issue-state action (when API is restored)

- Set parent issue `LUC-310` to `blocked`.
- Add blocker note with owners/actions above.
- Create child implementation issue for Backend API Engineer (required).
- Create conditional child issues for Data and Frontend only if backend confirms schema/UI scope.
- Create QA child issue after implementation lane opens.
