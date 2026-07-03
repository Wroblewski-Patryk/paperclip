# LUC-7244 Company Value-Stream Governance

Date: 2026-07-03
Owner: 04 COO (Chief Operating Officer)
Process: company control loop; delivery gap loop; docs/memory loop

## Result

Blocked by local Paperclip API/control-tick responsiveness.

The value-stream governance checkpoint cannot safely advance or create
downstream value-stream issues while the canonical Softwarehouse control tick is
fail-closed. The active app priority remains Soar first, Roost second, with
deferred apps parked unless the board explicitly reopens them.

## Evidence

- Wake payload assigned `LUC-7244` as `[Softwarehouse] Company value-stream
  governance`, status `in_progress`, priority `critical`, already checked out
  by the harness.
- `GET /api/issues/$PAPERCLIP_TASK_ID/heartbeat-context` timed out after 20s.
- `GET /api/issues/$PAPERCLIP_TASK_ID` timed out after 20s.
- `pnpm softwarehouse:control-tick` waited 90s for an active single-flight run,
  then exited `1` with:
  - `ok: false`
  - `reusedExistingTick: true`
  - `staleReportReused: true`
  - `controlDecision: control_tick_failed`
  - `recommendedAction: Fix failed step projectOwnershipAssignment before
    starting or resuming agent work.`
- `report/softwarehouse-control-tick.latest.md` is stale from
  `2026-07-03T02:42:30.848Z` and reports:
  - `controlDecision: control_tick_failed`
  - `effectiveOperatingPosture: control_tick_failed`
  - `postureConsistent: false`
  - `activeRunCount: 7`
  - `liveRunCount: 7`
  - required before full delivery: `Soar Project Manager is in error status`
  - forbidden while blocked: push, deploy, production mutation, secret
    disclosure, duplicate source-control cleanup.
- Existing API-degraded evidence from `LUC-7190` and `LUC-7235` shows the same
  local shape: health stays available while issue/thread/search routes time
  out.

## Value-Stream Decision

Status: blocked.

The company value stream cannot be governed from stale board data. Starting new
lanes would risk duplicate source-control cleanup, stale blocker churn, or
unsafe routing around the failed `projectOwnershipAssignment` control step.

Allowed while blocked:

- preserve evidence;
- classify the failure in Softwarehouse memory;
- avoid push, deploy, restart, production mutation, protected smoke, secrets, or
  paid/live-account actions.

## Required Unblock

Owner: Paperclip runtime/API owner path.

Action:

1. Restore local Paperclip issue-list, issue-thread, and control-tick
   responsiveness.
2. Clear or finish the stuck control-tick single-flight run if it is stale.
3. Rerun:

```sh
pnpm softwarehouse:control-tick
```

4. Resume value-stream governance only after the tick returns fresh non-stale
   control evidence or a concrete first-class blocker/owner path.

## Closure Notes

- Files changed: this status note and `.agents/state/active-mission.md`.
- Verification: `pnpm softwarehouse:control-tick` failed closed with stale
  single-flight reuse after 90s; API issue context/read routes timed out.
- Commit status: not committed in this heartbeat because the repo already had
  unrelated dirty work before this change and the deliverable is a blocked
  checkpoint note.
- Push status: not needed.
- Deploy impact: none.
- Residual risk: the live value-stream issue graph is unknown until Paperclip
  issue routes and the control tick recover.
