# LUC-236 Auth Lock Recovery Handoff (2026-05-27)

## Scope
- Issue: `LUC-236` (`[Softwarehouse] Autonomy governor`)
- Lane owner for this handoff: `Soar Project Manager`
- Process class: `company control loop` and `agent health and model governance`

## Trigger
- Latest heartbeat run failed with:
  - `errorCode`: `adapter_failed`
  - `error`: `EBUSY: resource busy or locked, unlink '<...>/companies/<company-id>/codex-home/auth.json'`

## Evidence Collected
- Health endpoints unavailable in this session:
  - `GET http://localhost:3100/api/health` -> connection failed
  - `GET http://localhost:3101/api/health` -> connection failed
- Autonomy governor implementation exists and already guards active-run reconfiguration:
  - `scripts/configure-autonomy-governor.mjs` (checks `activeRunCount` and refuses changes while runs are active)
- Heartbeat recovery test coverage exists for stranded run reconciliation and retry/escation policy:
  - `server/src/__tests__/heartbeat-process-recovery.test.ts`
  - `server/src/__tests__/heartbeat-stale-queue-invalidation.test.ts`

## Assessment
- Status classification: `blocked by error`
- Type: runtime contention in managed Codex home auth material (`auth.json` unlink during active/overlapping adapter activity).
- This PM lane is coordination-only and does not implement adapter/server runtime code.

## Required Child Lane
Create/assign a runtime specialist issue (Delivery/Adapter Runtime owner) with this exact contract:

1. Reproduce `auth.json` unlink contention on Windows with concurrent wake/continuation scenarios.
2. Add defensive file-operation behavior in managed Codex home preparation for `auth.json` replacement paths:
   - bounded retry with backoff for transient `EBUSY`/`EPERM`;
   - preserve fail-closed behavior for non-transient errors;
   - no cross-company credential leakage.
3. Add regression test(s) in codex-local/server runtime layer proving recovery path.
4. Verify with smallest relevant suite and record exact command output.
5. Close with source-control closure contract fields (files, verification, commit SHA, push/deploy impact).

## Proposed Disposition For LUC-236
- Preferred: `blocked` until runtime lane exists with owner and unblock action.
- Unblock owner: `Engineering Delivery Lead`.
- Unblock action: create and assign the child runtime issue above, then resume autonomy governor issue once the fix is merged or explicitly deferred.
