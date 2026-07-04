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
Use `docs/softwarehouse/` as the lightweight operating standard:

- `00-operating-model.md` for the department purpose and role model.
- `01-process-map.md` for APQC-style process classes.
- `03-delivery-workflow.md` for PDCA and workflow states.
- `04-definition-of-ready.md` before starting implementation.
- `05-definition-of-done.md` before marking work done.
- `06-quality-gates.md` for code, bugfix, feature, and deploy checks.
- `07-security-standard.md` for secrets, auth, and risky work.
- `08-devops-and-release.md` for release and production mutation gates.
- `11-agent-handoff-rules.md` for cross-role handoffs.
- `12-app-completion-review.md` for user-flow, frontend/backend,
  auth/subscription/configuration, integration, browser proof, and review
  handoff closure.
- `13-app-lifecycle-standard.md` for takeover, repair, and greenfield app
  creation from first business intent to release-ready evidence.
- `14-business-operating-standard.md` for the lightweight business checks that
  keep autonomous work useful to real users and the owner.
- `16-standard-stack.md` for the complementary standard map: APQC/PCF, MECE,
  Kanban, PDCA, RACI/DACI-lite, DoR/DoD, ADR/RFC, C4 traceability,
  DevOps/DORA/SRE, OWASP/SAMM, ITIL-inspired incident/change, and value-stream
  waste reduction.
- `templates/work-report-template.md` for final reports.

Do not treat documentation as optional ceremony. These files are the operating
contract that lets the agent group behave like one softwarehouse.

Kanban is the default board standard for using Paperclip issues/tasks. Goals
define intent, routines/procedures create or review repeatable work, and issues
move through visible workflow states until they reach evidence-backed closure or
a named blocker. PDCA is the improvement loop around that board: after a lane
finishes or fails, update the relevant process, memory, skill, or follow-up.

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
status change, refresh the root application radar:

`C:/Personal/Projekty/Aplikacje/scripts/update-applications-index.ps1`

Then run or request the Softwarehouse audit and verify it reports
`rootPortfolioDrift: []`. Do not leave stale aliases such as old docs roots,
missing project folders, or helper folders masquerading as applications in
`APPLICATIONS_INDEX.md` or `APPLICATIONS_INDEX.csv`.

## Learning And Role Splits

When a failure repeats, work crosses too many layers, or no role owns the proof,
do not solve it with a broader prompt. Record a capability gap and propose the
smallest useful role, instruction update, or process change. New active agents
need the hiring gate from `softwarehouse/talent-and-capability-system.md`:
CHRO creates or activates agents only after domain-owner consultation. AID
designs/reviews AI-agent role changes. CTO reviews engineering, QA, security,
ops, and runtime specialists. IPM or the relevant application PM reviews
project-management coverage.

## Organizational System Bias

Optimize the operating system, not a single agent. Before creating a new
routine, skill, prompt, script, or role, check whether an existing module can be
extended. Favor reusable process, memory, evidence, and governance improvements
over one-off heroics.
