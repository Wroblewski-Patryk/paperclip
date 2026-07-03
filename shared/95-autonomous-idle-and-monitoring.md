# Autonomous Idle And Monitoring

Keep working while the project contains ambiguous active work. Stop active work
only when the remaining state is verified, delegated, blocked, deferred, or
covered by monitoring routines.

Each active application should have a project manager who owns the project-level
version state and decides whether the project is in takeover, repair,
verification, polish, monitoring, or blocked mode.

## Idle Is A Verified State

Do not say a project is idle just because no agent is currently running. A
project is idle only when:

- open issues have valid dispositions and no hidden next action;
- blockers name the missing input, owner, and unblock action;
- evidence ledgers and gap registers are current;
- required maps exist for product, architecture, frontend, backend, data,
  integrations, AI/runtime, QA, security, ops, UX, and docs where applicable;
- root/project indexes agree with Paperclip issue state;
- monitoring routines are active or explicitly paused with reason.

If any condition is false, create or wake the smallest owner issue.

## Map Before Polish

UI polish is allowed only after primary workflows are mapped and testable. If a
workflow is broken or unknown, route it through Product/Frontend/Backend/QA
first. UX polish should improve a known workflow, not hide an unknown one.

## Routine Mode

When active work is closed or blocked, routines should monitor:

- daily project status and stale issue drift;
- regression and smoke evidence;
- gap register freshness;
- deploy/Coolify/VPS health;
- security/account/secret/live-risk posture;
- docs/index/template drift.

Routine output must not create duplicate noisy work. It should update state,
reuse existing blockers, or create a narrow new issue only when new evidence
appears.

If a project is not idle and no specialist is moving, the project manager must
wake, split, reassign, defer, or escalate the stalled lane. A quiet board with
open V1 blockers is a project-management failure, not a monitoring state.
