# Softwarehouse Unblock Packet

Generated at: 2026-07-11T23:25:51.683Z

This packet is generated from the local Paperclip API. It intentionally redacts secret values and records only metadata needed for safe gate decisions.

## Runtime

| Field | Value |
| --- | --- |
| API base | http://127.0.0.1:3200 |
| Company | ae26bb8b-8f5f-4a85-b341-78d4e1985975 |
| restartRequired |  |
| activeRunCount |  |
| liveRunCount |  |

## Gate Summary

| Project | Gate | Status | Owner | Fresh? | Latest evidence | Blocked issues | Allowed next action |
| --- | --- | --- | --- | --- | --- | --- | --- |

## Gate Details

## Skipped Refresh Inputs

| Action | Reason | Owner action | Error |
| --- | --- | --- | --- |
| skip_unblock_packet_refresh | board_access_required | A board-authorized actor must refresh unblock packet secret metadata; keep the current packet in blocked mode and do not infer gate freshness from this actor. | GET /api/companies/ae26bb8b-8f5f-4a85-b341-78d4e1985975/secrets failed with 403: {"error":"Board access required"} |

## Operating Decision

Unblock packet refreshed with a board-access-required secret metadata gap. The current actor cannot read company secret metadata, so gate freshness is unknown; keep blocked delivery lanes paused until a board-authorized refresh or explicit operator evidence is recorded.

## Agent Handoff

- If a gate is not fresh, PMs and specialist agents must stay quiet instead of reseeding the same lane.
- If operator approval is needed, show the operator prompt and approval commands, but do not run the apply command without explicit approval.
- If a gate becomes fresh, resume exactly one responsible lane and require the evidence listed above.
- If the lane fails, return the root blocker to `blocked` with exact owner/action and wait for a new fact.
- Do not treat this packet as approval for production mutation.

