# 2026-06-01 LUC-1283 Docs and Memory Loop

## Scope

- Issue: `LUC-1283`
- Role: Docs Memory Lead
- Process class: `docs/memory loop`

## Evidence Run

- Command: `node scripts/audit-luckysparrow-softwarehouse.mjs`
- Result: `overall = fail`

## Known-State Snapshot

- `health.restartRequired: true` with reason `backend_changes`
  (implemented and verified)
- `counts.issuesByStatus`: `blocked=48`, `in_progress=2`, `in_review=2`, `todo=2`
  (implemented and verified)
- `blockedIssueSummary.agentsWithMultipleLiveRuns`: one offender
  (`Soar Project Manager`, 2 live runs) (implemented and verified)
- `findings` include:
  - `critical`: one-agent-one-active-lane violation
  - `warn`: issues in `in_review` without a structured decision path
  - `warn`: runtime secret/binding gaps on multiple blocked Soar lanes
  (implemented and verified)

## Findings Relevant To Docs/Memory

1. Current control evidence is fail-closed and not idle/green; memory artifacts
   must keep explicit blocker and governance language.
2. Single-lane policy is currently violated by one PM agent, so docs must avoid
   implying lane-governor compliance until corrected.
3. `in_review` issues without a real decision path remain a governance truth and
   should stay visible in audit memory until disposition is fixed.

## Durable Updates Completed

1. Added this dated docs/memory evidence note for `LUC-1283`.
2. Appended a 2026-06-01 delta section in
   `softwarehouse/softwarehouse-operational-audit.md` with audit findings and
   memory posture guidance.

## Remaining

1. Delivery/PM ownership must resolve the one-agent-two-live-runs violation.
2. Owners of `in_review` issues must add a real review/approval/interaction
   path or return to an executable status.
3. Docs Memory should keep additive dated deltas while `overall = fail` and
   governance warnings are active.

## Continuation Note (2026-06-01 finish_successful_run_handoff)

- Read endpoint check succeeded:
  `GET /api/issues/faf9d871-d3d0-46ce-bec8-e34dffa8ff3a` -> `HTTP 200`
- Mutation endpoints still failing with server error despite auth/run headers:
  - `PATCH /api/issues/faf9d871-d3d0-46ce-bec8-e34dffa8ff3a` -> `HTTP 500`
  - `POST /api/issues/faf9d871-d3d0-46ce-bec8-e34dffa8ff3a/comments` -> `HTTP 500`
- Unblock owner/action: Softwarehouse Backend/API owner should inspect server
  runtime logs for the `/api/issues/:id` write path and restore mutation
  behavior; once fixed, rerun issue disposition update to `done` with the
  evidence already recorded above.
