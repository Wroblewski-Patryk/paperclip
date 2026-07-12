# LuckySparrow Software House Pipeline Model

## Purpose

The softwarehouse works as a loop, not as isolated agent runs:

`intent -> map -> lanes -> implementation -> verification -> integration -> decision -> memory`

Every target version moves from broad context to narrow owned work, then back to
broad decision-making with evidence. A lane is not complete because an agent
wrote a summary. It is complete only when the Paperclip issue state, evidence,
and parent handoff agree.

## Pipeline Stages

| Stage | Primary owner | Output | Exit condition |
| --- | --- | --- | --- |
| 1. Intake | Portfolio Director | project/target selected | target has priority, scope, and parent issue |
| 2. Project control | Project Manager | version target, queue, blockers, routine posture | project has one accountable manager and current operating state |
| 3. Product shape | Product Lead | workflows, acceptance criteria, non-goals | target can be judged as useful or not useful |
| 4. Architecture map | CTO Architect | boundaries, function chains, risk map | target can be split without guessing architecture |
| 5. Delivery breakdown | Engineering Delivery Lead | ordered specialist lanes | every lane has one owner, proof contract, and blocker policy |
| 6. Specialist execution | Layer agents | code/docs/config/test changes or explicit blocker | issue state is `done`, `blocked`, `in_review`, or delegated |
| 7. Verification | QA/Test/Security/Ops | repeatable evidence and release gates | failures are fixed or first-class blockers |
| 8. Integration decision | Project Manager + CTO/Product/Portfolio | release/readiness decision | evidence ledger covers all required workflows |
| 9. Memory/template | Docs Memory Lead | indexes, history, template feedback | future agents can resume from source-of-truth |

## Single-Agent Work-In-Progress Limit

Each agent has WIP=1 for active execution. This is separate from project-level
parallelism:

- PMs may maintain many queued project issues, but one PM run should make one
  decision or handoff at a time.
- Leaf/specialist agents should often have many planned `todo/backlog` issues.
  WIP=1 prevents simultaneous execution, not a useful ordered queue.
- Queue health is measured per active controlled track, not only in aggregate.
  Soar and Roost each need at least three legal worker-ready `todo/backlog`
  lanes, or explicit legal blockers for every missing lane, before the track is
  considered backlog-healthy.
- A live `in_progress` worker lane proves execution is happening, but it does
  not replace planned queue depth. A track can show useful live work and still
  fail the fan-out closure rule if its worker-ready queue is shallow.
- A healthy active project should show work accumulating at the lowest
  responsible layer: Frontend, Backend, Data, Integration, AI Runtime, Test
  Automation, QA/Security/Ops, Docs, or UX as applicable.
- Specialists may be shared across projects, but a specialist cannot work on
  Soar and Roost simultaneously.
- If a specialist is already `running` or has an `in_progress` issue with a live
  run, additional requests for that specialist remain queued with dependency
  notes.
- Cross-project context belongs to Portfolio/PMs and Docs Memory, not to a
  specialist implementing a narrow change.
- Use `node scripts/check-two-project-readiness.mjs` before promoting a second
  project from preparation into full delivery. Passing shared supervision is
  not the same as passing full delivery readiness.

Example for a small UI request:

`user intent -> PM state check -> optional Product/CTO best-practice review -> PM plan/acceptance -> Delivery child issue -> Frontend implementation -> QA/Test verification -> Security/Ops only if risk -> PM integration -> Docs/Memory/source-control closure`

## Plan-Design-Build-Verify Pattern

For non-trivial UI, product, workflow, and runtime fixes, Paperclip should use a
role pipeline inspired by planner/designer/builder workflows:

| Phase | Paperclip owner | Output |
| --- | --- | --- |
| Plan | Project Manager + Product Lead | Human-readable intent, target user workflow, acceptance criteria, non-goals, and risk notes. |
| Design | CTO Architect + UX Visual Lead when UI is involved | Architecture slice, data/API contracts, UI/interaction design target, affected files, and proof plan. |
| Build | One specialist owner | The smallest scoped code/config/docs change that satisfies the plan and design contract. |
| Verify | QA/Test plus Security/Ops when risk requires it | Fail-before/pass-after proof, browser/API/runtime evidence, release gate status, and residual risk. |
| Integrate | Project Manager + Docs Memory | Parent issue decision, source-control closure, evidence links, and next lane. |

This does not require different model providers. In this local company, Codex
agents play the roles. The important rule is that the phases are explicit:
planning output is not implementation, design output is not proof, and a code
change is not complete until independent verification and integration update
the issue graph.

When a user asks for a vague but important change such as "make Soar V1 fully
working", the PM must translate it into a parent issue plus narrow child lanes.
For each child lane, Engineering Delivery Lead must require:

- one accountable owner;
- affected architecture entities and files;
- exact acceptance/proof contract;
- local validation command;
- source-control and deploy disposition;
- next owner if the lane cannot finish.

## Supervisor Rule

Every specialist has a supervisor:

- Frontend, Backend, Data, Integration, AI Runtime, Test Automation, and UX report execution status to Engineering Delivery Lead.
- Project Manager owns the application-level queue and asks shared specialist
  agents for work through Product, CTO, Delivery, QA, Security, Ops, Docs, or UX
  lanes.
- If the queue stalls, Project Manager must convert silence into an explicit
  action: wake, split, reassign, defer, block with unblock condition, or
  escalate.
- If parent/controller issues exist but specialist queues are empty, the PM,
  Product Lead, CTO, or Engineering Delivery Lead must create worker-ready child
  issues before claiming progress. A manager may leave an empty worker queue
  only when it records the legal reason no worker can proceed yet.
- QA can block any lane that lacks reproducible evidence.
- Security can block auth, secrets, accounts, payment, API-key, live-risk, or abuse-case work.
- Ops can block deploy/release until environment, Coolify/VPS, rollback, and smoke proof are known.
- CTO resolves cross-layer architecture disputes.
- Product resolves workflow/acceptance ambiguity.
- Portfolio resolves project priority and final operating truth.

The supervisor does not silently take over implementation. The supervisor either
accepts the lane, requests evidence, creates another owned issue, or marks the
parent blocked with the concrete reason.

## Valid Lane Dispositions

Every agent run must leave exactly one durable disposition:

- `done`: work is implemented and verified, with evidence attached or linked.
- `blocked`: work cannot continue; the blocker is concrete and names the next owner/action.
- `in_review`: the lane needs a named reviewer or gate owner.
- `delegated`: the next step is a child issue with owner, acceptance criteria, and blocker/dependency links.
- `in_progress`: only valid when a live continuation path exists in Paperclip.

Narrative comments, file edits, and summaries do not satisfy a disposition unless
the issue state or child-issue graph also reflects the same truth.

## Broad-To-Narrow-To-Broad Loop

1. Start broad: understand the target, user workflow, architecture, deployment,
   risk, and known evidence.
2. Split narrow: create the smallest useful issue per layer, with one owner and
   one proof contract.
3. Execute narrow: agents work only inside their layer.
4. Verify narrow: each lane proves its claim or becomes blocked.
5. Integrate broad: supervisors update the parent issue, evidence ledger,
   project state, and release decision.
6. Repeat until every required workflow is verified, deferred, or blocked.

This loop is expected to run for hours on complex project takeover work. The
goal is not speed of the first summary; the goal is a known, evidence-backed
state that makes future development safer.

## Pipeline Failure Signals

Treat these as process bugs to repair immediately:

- managers/heads/team leads stay active while leaf specialists have no
  worker-ready backlog for an unfinished target;
- a successful run leaves an issue `in_progress` without a live continuation;
- a specialist writes a blocker in a comment but the issue status is not `blocked`;
- a plan creates file-only lanes but no Paperclip child issues;
- a parent is marked complete while child lanes are open, unknown, or blocked;
- evidence exists in code or logs but is not reflected in project docs/indexes;
- a supervisor implements code instead of creating or assigning a specialist issue.

## Relationship To Autonomous Idle

The pipeline does not end at "all agents stopped". It ends when the active
project can move into monitoring mode. That requires every important
perspective to be verified, delegated, blocked, deferred, or monitored. If the
project still has stale maps, unknown workflows, unlinked evidence, or open
blockers without owners, the next pipeline cycle should start from the smallest
missing map or repair lane.
