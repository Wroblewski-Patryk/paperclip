# LUC-1263 Autonomy Governor Runtime Reachability (2026-06-01)

## Scope
- Issue: `LUC-1263` `[Softwarehouse] Autonomy governor`
- Role lane: `soar-project-manager` (coordination only; no implementation edits)

## Known State
- `implemented but not verified`: autonomy governor runtime exists at `scripts/run-autonomy-governor.mjs`.
- `blocked by error`: local Paperclip API endpoint is unreachable from this run, preventing governor execution and issue-state mutation.

## Evidence
- Command: `curl --max-time 5 http://127.0.0.1:3200/api/health`
- Result: `curl: (28) Operation timed out after 5000 milliseconds with 0 bytes received`

- Command: `curl --max-time 4 http://localhost:3100/api/health`
- Result: `curl: (7) Failed to connect to localhost port 3100`

- Command: `curl --max-time 4 http://localhost:3101/api/health`
- Result: `curl: (7) Failed to connect to localhost port 3101`

- Command: `node scripts/run-autonomy-governor.mjs`
- Result: timeout in this run context (no reachable API backend)

## Impact
- Governor cannot read company issues/runs/secrets.
- PM lane cannot post the required final `PATCH /api/issues/{id}` disposition while API is unreachable.

## Required Next Owners
1. Ops Release Lead
- Restore or expose the active LuckySparrow Paperclip API endpoint for this workspace/agent runtime.
- Provide the effective `PAPERCLIP_API_URL` if not `http://127.0.0.1:3200`.

2. Engineering Delivery Lead
- After API restoration, run `node scripts/run-autonomy-governor.mjs` and capture output/evidence.
- If governor still stalls, open a narrow worker issue for runtime hardening (request timeouts/fail-fast behavior in API calls).

## PM Disposition Intent
- Keep `LUC-1263` as `blocked` until API reachability is restored.
- Unblock action owner: Ops Release Lead.