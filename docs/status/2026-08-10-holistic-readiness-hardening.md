# Holistic Softwarehouse Readiness Hardening

Date: 2026-08-10

## Outcome

The installed Paperclip `0.3.1` control plane is healthy on strict ports
`3200` and `54329`, its registered extensions pass the four-dimensional
completion contract at `12/12` and `100%`, and the current provider-token hold
is represented as a safe read-only operating posture. This maintenance pass
created no Paperclip issues and dispatched no agent runs.

This is a hardened bounded-supervision state, not operational graduation and
not a claim that the application portfolio is finished.

## Repairs Implemented

1. Provider quota holds no longer leave an agent in a false `error` state.
   The failed run remains inspectable, receives the dedicated
   `issue_execution_quota_hold` classification, and the agent returns to
   `idle` without retrying work.
2. Native supervision now accepts zero-billed-cost subscription telemetry when
   a real cost event is linked to the delivery issue. A monetary total of zero
   is no longer confused with absent telemetry.
3. Windows runtime discovery no longer depends on privileged CIM access.
   Strict-port ownership is derived from `netstat` plus exact process-image
   readback, and the launcher/stopper refuse ambiguous or non-Node listeners.
4. The runtime was restarted through the controlled strict-port scripts. The
   live instance reports `restartRequired=false`, one listener on `3200`, one
   registered service, and the canonical embedded database on `54329`.
5. Five recent completed issues were backfilled only where existing same-issue
   proof safely supported typed completion evidence. No historical evidence
   was invented.
6. Paperclip project-truth exports were refreshed so documentation hygiene no
   longer treats their stale state as current truth.
7. A quota-hold readiness mode was added. It refreshes Soar, Roost, and
   Featherly project truth plus the Paperclip-to-Roost projection while
   explicitly allowing no new lane, mutation, protected delivery, task
   creation, or agent dispatch. A normal control tick must replace it after
   provider quota recovery.

## Verification Matrix

| Area | Result | Evidence |
| --- | --- | --- |
| Live API/runtime | pass | health `ok`; strict topology audit pass |
| Extension utilization | pass | 12/12 capabilities, average 100% |
| Agent settings | pass | all managed agents conform |
| Agent instructions | pass | managed bundle audit pass |
| Goals | pass | goal-alignment audit pass |
| Workspace boundaries | pass | four approved singleton roots |
| Product isolation | pass | no active cross-project identity violation |
| Operating docs | pass | canonical operating-document validation |
| Product intent | pass | strict traceability audit |
| Documentation hygiene | pass | strict audit; warnings remain visible |
| Server typecheck | pass | `@paperclipai/server` TypeScript check |
| Focused regressions | pass | 18 Vitest tests plus 2 runtime-inventory tests |
| Readiness snapshot | pass, bounded | fresh `provider_quota_hold`, zero dispatch |
| Outcome integrity | not green | 114/125 recent done issues have typed proof; 11 historical/recent gaps remain |
| Autonomy graduation | not graduated | stale productive-cycle evidence and 5 active supervision findings |

## Current Portfolio Truth

The read-only refresh sees all three applications and healthy public probes,
but it also records 17 routed truth gaps:

- Soar: 4 gaps, first in Account access verification.
- Roost: 2 operational gaps, beginning with release-branch divergence.
- Featherly: 11 gaps, beginning with Account access verification.

These are application backlog/evidence facts for Paperclip to process after
quota recovery. They are not reasons to create replacement work from Codex
during the token hold.

## Honest Residual Boundaries

- Provider quota is the current intentional hard stop. The system must remain
  quiet rather than manufacture failed runs until quota recovers.
- Outcome integrity remains fail-closed: 11 of 125 recently completed issues
  lack typed evidence, and three legacy accepted outcomes do not carry the
  modern predicate contract. Existing evidence was not upgraded by assertion.
- Operational graduation is correctly withheld. A fresh normal Paperclip-owned
  productive cycle, closure of material supervision findings, and the required
  continuous healthy observation window are still empirical requirements.
- Soar, Roost, and Featherly contain pre-existing uncommitted application work.
  This pass did not edit, discard, commit, or reinterpret those changes.
- Docker Desktop is currently unavailable. This is a warning, not a Paperclip
  runtime failure; project-runtime policy may start it on demand when an
  assigned application task actually requires containers.

## Restart Contract After Quota Recovery

The normal autonomous control tick is the only mechanism that may replace the
quota-hold snapshot. It must re-evaluate current project truth, admission,
supervision, source-control, outcome, and delivery gates before dispatch. The
quota-hold refresh itself is intentionally incapable of creating tasks or
runs.
