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
- unfinished active targets have an ordered worker backlog, or a named reason
  why no legal worker-ready lane can be created yet;
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

Routine comments should not wake work by default. Set `resume` only when the
routine is deliberately asking the current assignee to execute a new action and
there is no healthy active run already covering it. For status-only notes,
evidence summaries, and already-closed work, comment without resume.

If a project is not idle and no specialist is moving, the project manager must
wake, split, reassign, defer, or escalate the stalled lane. A quiet board with
open V1 blockers is a project-management failure, not a monitoring state.

When managers or team leads are active but worker queues are empty, treat that
as a planning/delegation gap. The next legal manager action is to create
worker-ready child issues, create the missing map/design lane that makes worker
issues safe, or block the parent with a concrete external dependency.

## Stale And Duplicate Issue Hygiene

Before creating a new blocker, unblocker, no-stall, routing, or proxy issue,
search current open issues for the same source issue, blocker, protected input
family, or release gate. Reuse the existing issue when it exists. If a new
owner issue replaces an older proxy, comment on the old issue and cancel it as
superseded, or leave it blocked only when it still represents a distinct
dependency.

A project queue is not healthy if it contains old open issues whose only
purpose has already moved to a newer owner. Project managers must dispose of
those issues during no-stall sweeps: done with proof, cancelled as
superseded/not needed, blocked with a current owner/unblock action, or
reassigned to `local-board` when the next action is human-owned.

If a no-stall sweep finds a blocked issue whose `blockedBy` issues are all
`done` or `cancelled`, treat that as stale state. Re-read the source issue,
check for attached evidence and live runs, then either close it with proof or
return it to `todo` with a single accountable owner. Do not create a new proxy
issue unless the source issue cannot be legally mutated by the current actor.

## Cross-Boundary Stale Blockers

When a coordinator or janitor finds a legitimate stale blocker cleanup but
Paperclip returns `403` because the target issue is outside that actor's
authorization boundary, do not broaden authorization and do not retry the
mutation through the same actor. Treat the `403` as an owner-path routing
signal.

The coordinator must:

- read back the target issue, current blockers, and owning role before acting;
- search for an existing open owner-path issue for the same target and blocker;
- if none exists, create one narrow child issue assigned to the owning role,
  with source issue, target issue, intended mutation, acceptance criteria, and
  readback proof required;
- set the coordinator issue to `blocked` by that owner-path child only when the
  coordinator cannot finish until the owner mutation lands;
- after the child closes, read back the target issue again and close the
  coordinator issue only when the target status/blockers match the requested
  cleanup.

Ask the board only when the owner path is genuinely human-owned, policy-only,
or protected by secrets, production mutation, paid/live accounts, legal risk,
or irreversible action.
