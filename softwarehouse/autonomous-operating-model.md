# Autonomous Operating Model

## Purpose

The softwarehouse should keep working until the active project has no ambiguous
work left. At that point agents stop creating broad work and routines monitor
for drift, regressions, deploy health, stale docs, and new operator ideas.

Autonomy does not mean claiming everything is perfect. It means every relevant
perspective is either verified, delegated, blocked, deferred, or monitored.

## Operating States

| State | Meaning | Required action |
| --- | --- | --- |
| `takeover` | project is not fully mapped | scan, index, create known-state maps |
| `repair` | known gaps have owners | specialist agents fix or block their lanes |
| `verification` | implementation claims need proof | QA/Test/Security/Ops run gates |
| `integration` | lane outputs must be reconciled | Delivery/CTO/Product update parent status |
| `polish` | functional baseline is stable enough for UX/UI refinement | UX/Frontend/Product refine experience with regression gates |
| `monitoring` | no active ambiguous work remains | routines watch for drift, regressions, deploy/runtime issues |
| `blocked` | external input/access/decision is required | create blocker record and stop pretending work can continue |

The project manager owns the transition between these states for one
application. Portfolio decides which application is active; the project manager
decides what that application needs next to reach the current version target.
If work is open and not moving, the project manager must wake the owner, split
the work smaller, reassign it, defer it, or escalate it. A project may only be
calm when every open item has a valid reason to wait or a scheduled routine to
watch it.

## Definition Of Autonomous Idle

A project may enter `monitoring` only when all are true:

- no `in_progress` issue lacks a live run, child issue, or explicit next action;
- every open blocker names the missing input, owner, and unblock action;
- every required product workflow has status in the evidence ledger;
- frontend routes/views, backend APIs, data models, integrations, security
  boundaries, deploy topology, and tests have current maps;
- QA/Test/Security/Ops gates are either passing, explicitly blocked, or deferred
  with reason and owner;
- project docs, `.codex/context`, history artifacts, Paperclip issue state, and
  `softwarehouse/portfolio/APPLICATIONS_INDEX.md` agree on current state;
- monitoring routines are active or intentionally paused with a named reason.

If any item is false, the project is not idle. Create or wake the narrowest
owner issue that can move the state forward.

## Required Map Inventory

Each active application should have or maintain these map families:

- portfolio status and project readiness table;
- product workflow/capability map with acceptance criteria;
- architecture/module map;
- function-chain and user-action indexes;
- route-to-view/component/client-API map;
- backend route/controller/service/test map;
- data model/migration/integrity map;
- integration/external-provider boundary map;
- AI/runtime/tool/context boundary map when applicable;
- QA regression/smoke matrix;
- security/auth/secrets/account/live-risk map;
- ops/deploy/Coolify/VPS/rollback/observability map;
- UX/UI polish map with screenshots and known visual friction;
- evidence ledger and gap register;
- docs/source-of-truth index and template feedback ledger.

Unknown map status is itself a gap and should become an owned issue.

## Known-State Harvesting Loop

When a project is not coding, it may still be working. The default non-idle
work is evidence harvesting:

`scan repo/docs -> classify works/fails/unknown -> link evidence -> create narrow follow-ups -> update project truth`

Evidence harvesting is allowed for active takeover projects even when protected
production gates block deploy, push, restart, protected smoke, live account
mutation, or secret access. In that state agents must stay read-only or
Paperclip-only unless a local repair issue explicitly grants project repo
mutation.

The known-state harvester owns the first autonomous wake for active projects:
currently `Soar`, `Roost`, and the owner-activated `Featherly` hardening lane.
Future projects such as `Aviary` and `Nest` stay parked until the board
activates them. For each active project
the harvester creates one lane whose output is not code, but an executable map:

- which functions/capabilities work;
- which functions/capabilities fail;
- which functions/capabilities are present but unverified;
- which docs, tests, commands, screenshots/logs, commits, and blockers prove
  the claim;
- which next issues are small enough for one owner and one proof contract.

A quiet board is valid only after this map says the remaining state is verified,
blocked with owner/action, deferred with reason, or covered by monitoring.

## Active Work To Monitoring Transition

When all repair and verification lanes are closed or blocked:

1. Delivery Lead reconciles all child issues into the parent controller.
2. Project Manager integrates queue/blocker/routine state for the active app.
3. CTO/Product/Portfolio decide whether the version is ready, reduced, blocked,
   or ready for UI polish only.
4. Docs Memory updates all source-of-truth files and root indexes.
5. Routines are activated for monitoring only after the active-work queue is
   clean enough that recurring checks will not create noisy duplicate work.
6. New operator ideas restart the cycle at `intake`, `project control`, or
   `product shape`.

## Control-Tick Capability Executors

The softwarehouse control tick owns the closed loop until Paperclip can run this
inside its own operating layer. Each tick should produce state, choose one legal
next action, and leave durable evidence instead of relying on chat memory.

Current capability executors:

- source-control closure executor: classifies dirty repositories, runs basic git
  validation, and separates safe documentation/context closure from specialist
  review lanes;
- in-review decision path: requires review issues to name a concrete accept,
  reject, block, delegate, or continue-review decision path;
- run disposition enforcer: finds stale active issues without a live run and
  requires a durable recovery disposition;
- Coolify production reconciler: checks whether production reconciliation can be
  performed from configured environment bindings without exposing secrets;
- release/push/deploy governor: decides whether project commits should be held
  for batch, committed/classified first, pushed as a meaningful release package,
  or blocked until Coolify/server/resource facts are known;
- Soar acceptance ledger: records the current delivery proof for Soar, including
  production probes, repository state, and missing owner/test-login evidence;
- access unblock task seeder: turns missing owner login, test-account, Coolify
  team/project/resource, and credential-binding facts into concrete Paperclip
  tasks with context for Patryk, Ops, Security, or QA;
- next legal action selector: converts the latest control/readiness reports into
  one non-duplicative next action.

These executors must stay read-only against production unless a fresh operator
approval explicitly allows push, deploy, restart, protected smoke, or live
account mutation.

## UI Polish Gate

UI polish may start only when:

- the primary workflows are known and mapped;
- severe backend/API/deploy blockers are fixed or explicitly out of scope;
- QA has a repeatable smoke path for the workflows being polished;
- UX/Frontend can test the screen states they are changing;
- Product can state what "better" means for the target user.

If those conditions are not met, UI work should create UX findings and frontend
map updates, not broad visual rewrites.
