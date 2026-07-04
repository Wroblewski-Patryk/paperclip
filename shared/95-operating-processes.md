# Operating Processes

LuckySparrow Software House runs through named processes, not loose effort.
Before ending a run, connect your work to one of these process classes:

- company control loop
- project no-stall loop
- delivery gap loop
- agent health and model governance
- board janitor
- regression evidence loop
- release/deploy gate
- docs/memory loop
- portfolio index refresh
- retrospective/template loop
- talent/capability loop

Use `softwarehouse/operating-processes.md` as the process source of truth.

## Required Process Disposition

Every run must leave one of these durable outcomes:

- `done`: the checkpoint is complete with proof.
- `blocked`: exact blocker, owner, and unblock action are named.
- `delegated`: child issue or handoff exists with one owner.
- `in_review`: named reviewer or gate owner exists.
- `todo`: work is ready for the next scheduled routine or owner.

Use `in_progress` only while a live run is executing. Do not leave parent,
controller, routine, or checkpoint issues in stale `in_progress`.

Before stale board cleanup, run `node scripts/run-live-run-janitor.mjs`. Apply
it only when the dry-run names closed-issue live-run tails or governor
self-supervision loops. Ordinary active specialist runs should be supervised,
not cancelled.

Process checkpoints may inspect or comment on related issues, but they must not
set another issue to `in_progress` unless that issue is actually checked out and
running. If a related issue needs action, leave it `todo` with owner/next step,
`blocked` with unblock action, or create a child issue.

## Up-Down-Up Flow

Work should move through the hierarchy:

`Portfolio/PM -> Delivery -> Specialist -> QA/Ops/Security -> Delivery -> PM -> Docs/Memory -> Portfolio`

If you are a lead, split and decide. If you are a specialist, produce layer
evidence. If you are QA/Ops/Security, you may block. If you are Docs Memory,
make the current truth durable. If the loop does not have a next owner, create
or request one.

## Portfolio Index Refresh

After any project audit, takeover preparation, docs-root change, or meaningful
status change, refresh the Paperclip-owned application radar:

`node scripts/update-softwarehouse-portfolio-index.mjs`

Then run or request the Softwarehouse audit and verify it reports
`rootPortfolioDrift: []`. Do not create `APPLICATIONS_INDEX.md`,
`APPLICATIONS_INDEX.csv`, helper folders, or updater scripts directly under
`C:/Personal/Projekty/Aplikacje`; the canonical index files live under
`Paperclip_Softwarehouse/softwarehouse/portfolio/`.

## Learning And Role Splits

When a failure repeats, work crosses too many layers, or no role owns the proof,
do not solve it with a broader prompt. Record a capability gap and propose the
smallest useful role, instruction update, or process change. New active agents
need the hiring gate from `softwarehouse/talent-and-capability-system.md`:
Portfolio Director approves project/company roles, and CTO Architect approves
engineering, QA, security, ops, and runtime specialists.
