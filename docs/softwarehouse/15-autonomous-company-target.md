# Autonomous Company Target

Status: active operating target
Date: 2026-06-28
Owner: Board / 00 AIA / 11 SPM / 11 RPM

LuckySparrow Softwarehouse should behave like a small, serious software house
implemented inside Paperclip: roles, queues, proof, learning, and escalation are
represented as agents, issues, routines, documents, and work products.

The board owns the vision. Agents own turning that vision into inspectable,
verified, economical software work.

## Strategic Sequence

1. V1 local: Soar and Roost are both active application completion lanes.
   - Goal: reach honest V1 readiness for owner use and release confidence in
     both apps through indexed flow truth, verification, source-control
     closure, docs, and gated deploy/readiness proof.
   - Do not claim 100% until every required workflow is implemented, verified,
     documented, or explicitly deferred/blocked with owner, reason, and date.
   - Soar is the first tie-breaker when protected production work, scarce owner
     attention, or a shared specialist conflicts; Roost must not be idle when
     local owner-scoped work is legal.
2. V2.1 connects a fully working Roost to Paperclip through an accepted
   Roost/CompanyCore API/MCP/data boundary.
3. V2.2 moves Paperclip to a dedicated VPS so agents can build apps on the
   server and send project pushes through Coolify to production.
4. V3 opens additional application projects into the same autonomous loop.
5. Softwarehouse/system work exists to keep Paperclip healthy enough to run the
   company and to improve the operating model.
   - System work is legitimate when it unblocks Soar, Roost, evidence quality,
     agent execution, cost control, visibility, or board decisions.
   - System work is not a license to drift into broad Paperclip product work.

Everything else stays parked unless the board explicitly opens it.

## Operating Standard

Agents must manage work like a real softwarehouse:

- maintain a current indexed map of known, unknown, working, broken, deferred,
  blocked, and owner-needed work;
- split gaps into one-owner issues with layer, acceptance, proof, and release
  impact;
- execute the smallest useful implementation/proof lane;
- verify through tests, browser/screenshot proof, logs, API checks,
  source-control closure, deploy/readiness evidence, or documented inspection;
- update docs, architecture graphs, app-completion indexes, and issue comments;
- turn repeated misses into instruction/process/routine improvements;
- assign human-owned decisions to `local-board` so the board can filter them.

## Priority Policy

When multiple lanes are open, agents use this order:

1. Soar blockers that prevent V1 readiness, production proof, source-control
   closure, protected auth/smoke, deploy/readiness proof, live-risk safety, or
   app-completion evidence.
2. Paperclip/system blockers that directly prevent agents from moving Soar or
   Roost, including stale live-run state, broken control ticks, missing board
   visibility, agent routing, or runaway token waste.
3. Roost work that advances V1 app completion, CompanyCore readiness, source
   truth, local verification, or the later Paperclip/Roost bridge, without
   blocking higher-priority Soar gates.
4. Learning/template/process improvements extracted from real Soar/Roost/system
   failures.
5. Deferred apps only after explicit board reopen.

If Soar is below target readiness and no Soar worker lane is moving, the next
manager action is to create, wake, reassign, or unblock a Soar lane. Monitoring
alone is not enough.

## Flow Cadence

2026-07-01 operating adjustment:

- The active Soar no-stall expeditor runs every 30 minutes. It is a lightweight
  routing/splitting/wake pulse, not an implementation or production-mutation
  loop.
- The Softwarehouse delivery gap loop runs every 60 minutes while active
  projects have no runnable lane. Its job is to turn blocked/ambiguous parent
  state into the next one-owner proof, repair, blocker, or board-visible
  decision.
- Soar gap-register refresh and V1 audit-to-completion controller run every 3
  hours while Soar remains below honest V1 readiness.
- Heavy or protected routines, including deploy, production smoke, secrets,
  paid/live accounts, and irreversible mutations, must not be made frequent just
  to create visible activity. They remain gated by approval, credentials,
  rollback, and evidence requirements.

If Soar/Roost/Softwarehouse have no `in_progress` work and no actionable
`todo` lanes, the expected autonomous behavior is: classify whether the stop is
a real blocker, create or wake the smallest safe non-production lane, or assign
the precise operator decision to `local-board`. Silent idle is a defect unless
all remaining work is explicitly blocked with owner, reason, and next review
condition.

## Routine Alignment Checkpoint

2026-06-28 audit result for LUC-6071:

- Active routine inventory from the local Paperclip API returned 52 routines:
  11 Soar, 3 Roost, 31 Softwarehouse, 3 AI Company Operating Layers, 3
  LuckySparrow Innovation Portfolio, and 1 Featherly Web Studio.
- The routine duplicate janitor reported `duplicateGroupCount=0`, so there is
  no proven duplicate-routine cleanup to apply now.
- Soar has the live PM/no-stall/gap/audit loop required by this target:
  daily status refresh, no-stall queue expeditor, gap register and repair lane
  refresh, V1 audit-to-completion controller, regression evidence, security
  gate, deploy-health, production performance, and authenticated acceptance
  routines are present. The current issue queue also shows active Soar worker
  lanes plus explicit protected/operator blockers.
- Roost is an active V1 completion lane. Its routines should cover PM status,
  no-stall, known-state/map drift, source-control closure, project-truth gap
  routing, local proof, production/authenticated acceptance evidence when
  gated facts exist, and Coolify provenance/rollback evidence. Broad Roost
  work is appropriate when it is one-owner, safe, and does not hide Soar
  blockers.
- Softwarehouse/system routines are justified when they repair Paperclip health,
  control-loop visibility, source-control closure, board decision paths, agent
  health, cost/token safety, docs/memory, or learning generated by Soar/Roost
  work.
- Monitoring noise to keep out of the active posture: routines with
  `status=active` but all schedule triggers disabled, duplicate legacy review
  titles, status-sync-only wakeups, and broad portfolio routines for deferred
  apps. Treat these as configuration cleanup candidates, not core/product work.

Recommended next step is configuration-only: keep the active Soar/Roost/system
posture, and use routine status/trigger changes before proposing plugin or
Paperclip core work. Core work is warranted only if Paperclip cannot express the
needed durable behavior through projects, routines, issues, blockers,
assignments, documents, work products, instructions, environments, or adapter
configuration.

## Configuration-First Rule

Prefer Paperclip configuration and operating content before changing Paperclip
core:

- use projects, goals, routines, issues, blockers, assignments, documents,
  work products, agent instructions, environments, and adapter configuration;
- improve shared agent contracts when a failure is behavioral or procedural;
- improve project docs and gap indexes when the problem is missing context;
- create a plugin/addon/library only when the required durable behavior cannot
  be represented safely with current Paperclip primitives.

Core Paperclip changes require a narrow issue that proves the missing platform
capability and explains why configuration, docs, routines, or plugin extension
are insufficient.

## Honesty Rule

No agent may convert "many checks passed" into "100% done". A project can be
called 100% only for an explicitly scoped target and only when:

- the target scope is written down;
- every known required workflow has proof or an accepted defer/block record;
- source control, deploy/readiness, docs, and user-facing proof agree;
- board-owned blockers are visible through assignment to `local-board`;
- remaining risks are named in plain language.

Unknown is work. Hidden unknown is a defect in the operating system.
