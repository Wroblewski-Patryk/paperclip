# Pipeline And Supervision Contract

Work from broad context to narrow execution and back to broad integration:

`intent -> map -> lanes -> implementation -> verification -> integration -> decision -> memory`

During active takeover this loop repeats continuously:

`Portfolio/PM -> Delivery -> Specialist -> QA/Ops/Security -> Delivery -> PM -> Docs/Memory -> next lane`

The direction matters. Supervisors decide priority and split work downward;
specialists return evidence upward; QA/Ops/Security can block; Docs/Memory makes
the current truth durable; PM starts the next narrow lane until the current
version is verified or explicitly blocked.

For bigger fixes, use the explicit plan-design-build-verify pattern:

`PM/Product plan -> CTO/UX design -> specialist build -> QA/Ops proof -> PM/Docs integration`

For user-visible app completion, use the stricter completion loop:

`PM user-flow map -> CTO/API/config map -> UX/frontend map -> specialist build -> browser screenshot/clickthrough proof -> QA/PM review -> Docs/index update`

This loop applies when a user logs in, subscribes, configures an integration,
connects Binance/Gate.io, opens a dashboard, runs a trading/bot workflow, or
uses any paid feature. Do not close the work at the backend layer when the
frontend, entitlement, configuration, or browser proof is still unknown.

For app lifecycle work, select the correct entry path before coding:

- `takeover`: existing app is unclear or broken. Start with known-state,
  architecture, app-completion, source-control, security, and browser maps.
- `repair`: the app is mapped but has known gaps. Start from the gap register
  and create the smallest owner/proof lane.
- `greenfield`: the app does not exist yet. Start with business intent,
  target user, paid/free boundary, first workflow, architecture contracts,
  auth/subscription/configuration gates, and a first release slice.

All three paths converge into the same PM/CTO/UX/build/QA/Docs loop and the
same app-completion index. Do not create broad implementation work for parked
apps; activate the app through Portfolio/board first.

This pattern can be executed by Codex-backed Paperclip agents; it does not
require separate model providers. The point is separation of responsibility:
the planner defines intent and acceptance, the designer maps architecture or UI
contracts, the builder changes one scoped layer, and the verifier proves the
behavior independently.

Every run must keep Paperclip state aligned with the written conclusion. If the
comment says `blocked`, set or request `blocked`. If work is complete, set or
request `done`. If another role owns the next step, create or request a child
issue with one owner and a proof contract.

Identifiers with the company prefix, such as `LUC-1101`, are Paperclip issue
identifiers, not GitHub issue numbers. Never translate a `LUC-*` identifier into
`owner/repository#number`, never call `gh issue` for it, and never use a failed
GitHub lookup as a Paperclip blocker. When `PAPERCLIP_API_URL` and the injected
Paperclip agent credential are available, read and update the issue through the
Paperclip API or the tracked `skills/paperclip/scripts/paperclip-issue-update.mjs`
helper. A GitHub issue may be used only when the Paperclip issue explicitly
links a separate GitHub issue or the operator asks for one.

For a `done` transition, use the typed `completionEvidence` contract from the
Paperclip skill exactly. Each standard category (`testEvidence`,
`reviewEvidence`, and `documentationEvidence`) needs a summary and refs. A ref
may be only `request_comment`, or `comment`/`document`/`attachment`/
`work_product` with a same-issue UUID. Do not invent file-path refs or fields
such as `path` and `note`; register an important workspace file as a work
product first. If the API rejects an evidence payload, read the validation
error and repair the payload once instead of retrying the same shape.

Every agent completion also needs a `learningDisposition`. Use
`not_applicable` for non-corrective delivery, `one_off` only for a
standard-risk isolated correction with a root-cause and recurrence rationale,
or `systemic` for a repeated/cross-project/high-impact cause. A systemic
disposition must either attach same-issue evidence that prevention was
implemented or reference a separate non-cancelled same-company prevention
issue. This is the bridge between the local fix and the Softwarehouse PDCA
loop; a prose promise is not a prevention path.

Treat the tracked Paperclip skill, `docs/api/issues.md`, and the live API error
as the authoritative issue-update contract. Do not recursively search
`.paperclip/runtime`, managed `codex-home`, session JSONL files, archived run
logs, or unrelated project worktrees to discover an API payload. Those paths
are runtime evidence, not API documentation, and searching them can multiply
context cost without improving the closeout. If the documented helper is
unavailable, use the live validation error and the smallest direct API request.

## Kanban Board Standard

## Structured In-Review Handoff Contract

An issue may rest in `in_review` only when its handoff records all of the
following fields in the issue, its review interaction, or the attached work
report:

- `reviewer`: the named person, role, or typed execution participant who can
  make the decision.
- `decisionOptions`: the allowed choices, including the disposition each choice
  produces.
- `evidence`: the exact links, checks, artifacts, or findings to inspect.
- `decisionTiming`: a decision deadline, or a next-check time with a cooldown.
- `nextOwner`: the named owner for the action after the decision.

When the review decision controls follow-up work, create a typed interaction or
execution-policy participant for it; a prose-only “please review” comment is
not a sufficient waiting path. The reviewer may approve to `done`, request
changes back to the return assignee, preserve a real blocker with its unblock
owner, or delegate a linked one-owner follow-up. Keep
`run-in-review-decision-path.mjs` as the runtime safety repair; do not use
janitor behavior as a substitute for a complete handoff.

Use this admission block in the issue handoff comment or review interaction
before moving an issue to `in_review`:

```markdown
### Review decision path
- Reviewer: <person, role, or typed participant>
- Decision options: accept -> done; request changes -> <return owner>; block -> <unblock owner/action>; delegate -> <child owner>; continue review -> <next check>
- Evidence: <links to files, checks, artifacts, or findings>
- Decision timing: <deadline or next-check time> / cooldown <duration if applicable>
- Next owner: <owner after the decision>
```

For `request_confirmation` or `ask_user_questions`, the interaction must
identify the reviewer/board owner and resulting decision route; repeat the
evidence, timing, and next-owner fields in the issue comment when the payload
cannot carry them. A pending interaction is a waiting mechanism, not proof
that the handoff is complete. If any field is unknown, keep the issue in
`in_progress` or move it to `blocked` with the owner/action needed to complete
admission.

Paperclip issues are the shared Kanban board for Stage 1 delivery. Goals define
why a lane matters, routines/procedures create or inspect repeatable work, and
issues/tasks carry the actual visible flow.

Use Kanban states deliberately:

- `backlog`: valid work, not ready or not selected.
- `todo`: ready or discovery-ready, with owner and next action.
- `in_progress`: live checked-out execution only.
- `in_review`: named reviewer or gate owner must inspect evidence.
- `blocked`: concrete blocker, owner, and unblock condition.
- `done`: evidence-backed completion.
- `cancelled`: duplicate, superseded, invalid, or intentionally abandoned with
  reason.

Kanban manages flow; PDCA improves the system after evidence is produced. Do
not hide work in prose when it needs a card, and do not create cards when a
comment or parent decision is enough.

## Single-Lane Execution

- One agent can actively execute only one lane at a time.
- Keep one justified next worker-owned `todo` lane for every active product
  track when a legal next action exists. Queue depth is a flow signal and a
  ceiling, never a target or proof of progress.
- After completion or a durable blocker, the responsible PM/Lead promotes an
  existing valid backlog lane before creating a duplicate. Create another
  child only just in time when it has an independent outcome, owner, evidence
  contract, and named dependency reason. Never replenish backlog merely
  because a lane count fell.
- One active lane is not one planned lane. WIP=1 applies to live execution, but
  speculative queues are also waste: planned work must be traceable to a
  current product gap and may be cancelled when the gap disappears.
- A manager may coordinate many open lanes, but each manager run must make one
  clear decision or handoff before moving to the next lane.
- Managers, heads, and team leads must turn parent goals into worker-ready
  child issues for the narrowest accountable owner. A worker-ready issue names
  the project, scope, affected files/entities, acceptance criteria, local proof,
  blocker policy, and expected handoff owner.
- A specialist must not implement two unrelated requests in one run, and must
  not mix project contexts such as Soar, Roost, and Featherly in one execution.
- If two Project Managers need the same specialist, the second request waits as
  `todo/backlog/blocked` with dependency notes until the specialist's current
  lane has a durable disposition.
- Parallel work is allowed only across different agents on independent lanes,
  with no shared file, release, secret, or acceptance conflict.
- One active run is not a company-wide lock. Independent Soar, Roost, Featherly,
  and Paperclip operating-system lanes may run concurrently when they use different
  agents and repositories; same-project writers remain serialized.
- A ready release in one project must not be downgraded to generic
  `supervise_active_runs` only because another project has live work. Confirm
  that the release project, repository writer, and release owner are idle, then
  preserve the project-specific release priority.
- Planned queue depth is not execution permission. In a shared project
  workspace, start at most one repo-mutating lane at a time unless the lanes
  use isolated worktrees and their file sets are proven disjoint.
- Source-control closure outranks fan-out. Do not create or resume a
  repo-mutating lane while Paperclip, Soar, Roost, or Featherly has an unresolved dirty
  packet. Classify and close the existing packet first.
- Bind every product issue to that product's active project and primary
  workspace. A Soar, Roost, or Featherly issue must not inherit the Softwarehouse project
  or workspace merely because a controller created it.
- Every active product issue uses the canonical project marker and keeps its
  execution parent in the same project. Shared specialists may serve several
  applications sequentially, but they receive separate project-scoped issues
  from the relevant App PM/lead or an authorized manager inside that project's
  explicit parent chain; they never hold cross-project `in_progress` WIP.
- Resolve product identity from the exact active Paperclip project id and the
  canonical project registry. Never substitute another project's acceptance
  ledger, Coolify resource id, deployed SHA, secret namespace, PM, repository,
  workspace, routine, or evidence packet. Missing project-specific evidence is
  `unknown` or `blocked` for that project only; an aggregate may summarize
  typed project rows but must never become evidence for one of them.
- Product intent, architecture, status indexes, runbooks, and release truth stay
  in the corresponding product repository. Paperclip stores execution state,
  evidence, ownership, and links; Roost renders an owner-facing projection.
  Neither surface may copy another application's documentation or replace its
  project-local source of truth.
- Begin with the application's `docs/documentation-contract.json` and its
  bounded `defaultAgentContext`. Load generated graphs, history, planning,
  evidence, and operating memory only when the active issue needs them. A plan,
  report, map, or documentation-only commit is not product progress unless that
  artifact is the requested deliverable.
- If documentation conflicts, update the highest-authority canonical source or
  its generator. Do not resolve drift by adding another summary. Run
  `pnpm softwarehouse:documentation-hygiene` from the Paperclip root when the
  context boundary, freshness, release identity, or project separation is in
  doubt.
- Accounting, queue, review, and governance lanes may inspect board/API
  evidence, but they must not mutate product or Paperclip code unless the issue
  names the exact module, behavior change, and verification contract.
- Activity metrics such as task, comment, document, commit, agent, or run count
  are diagnostic signals only. They must never become success targets. Product
  progress means an observable change in owner-usable behavior or a necessary
  risk/dependency reduction, backed by evidence independent of the implementer
  when review is required.
- Treat repeated issue creation, shallow evidence, self-review, documentation-
  only technical closure, recurring normalized titles, growing request depth,
  and retries without new facts as possible reward hacking or specification
  gaming. Investigate the cause; do not reward the indicator.
- One control cycle may create at most one new child for a product track unless
  an issue explicitly proves independent scopes and disjoint writers. A parent
  with more than three non-terminal direct children requires a written fan-out
  justification and named integration owner.
- After three failed attempts without materially new evidence, stop retrying,
  preserve the evidence, classify the systemic cause, and escalate or redesign
  the loop. A reworded comment or regenerated report is not new evidence.
- Treat `docs/status`, `docs/graphs`, `.agents/state`, `.codex/context`, generated
  indexes, lockfiles, and source-control closure packets as shared conflict
  sets. Any lanes that write these surfaces must execute serially even when
  their primary implementation files differ.
- Keep parked products parked. Stage 1 fan-out may create work only for Soar,
  Roost, the owner-activated Featherly security-hardening lane, or the Paperclip
  control plane unless the owner explicitly activates another product.
- Before promoting Roost or any second project from preparation into full
  delivery, run `node scripts/check-two-project-readiness.mjs`. Shared
  supervision readiness is not full two-project delivery readiness.

The architecture graph is part of that state. Every implementation or proof lane
must identify:

- affected architecture entities;
- affected user flow from `docs/status/app-completion-index.md` when relevant;
- affected module/feature/component/API/model/test/doc paths;
- upstream dependencies;
- downstream tasks or parent decisions that depend on the result;
- proof required to move status from `implemented` to `tested` or `verified`.

If a lane cannot name these links, the correct next action is not coding. The
correct next action is an architectural-awareness scan or CTO/Docs Memory
reconciliation.

If a lane changes user-visible behavior, the correct final handoff is review,
not just a completion comment. Include:

- exact user action and expected result;
- changed files and architecture entities;
- API/backend proof, if any;
- browser screenshot/clickthrough proof, or the blocker preventing it;
- login/subscription/configuration/integration impact;
- commit status and push/deploy impact;
- named reviewer or next owner.

## Supervisor Flow

- Project Manager owns one application project, version target, queue, blockers,
  routine posture, and project-level status integration.
- The App PM/lead owns the top-level lifecycle and release chain for exactly one
  application. A functional manager may delegate a specialist task, but it must
  remain a child or explicitly linked lane of that application's PM-owned chain.
- Project Manager enforces no-stall flow: every open lane needs an owner,
  expected output, evidence requirement, and next integration point.
- Project Manager delegates in stages: map current state, request best-practice
  or architecture review when useful, propose the plan upward when the change is
  non-trivial, delegate exact implementation, request independent verification,
  request security/Ops review when risk requires it, then integrate evidence and
  route source-control closure.
- A PM/Lead run that finds unfinished work but creates no worker-ready lane must
  record why no legal worker lane exists: protected gate, missing map, blocked
  dependency, duplicate active owner, or explicit deferral. If the reason is a
  missing map, the run must create the smallest map/design/proof lane instead.
- PM/Lead must use the app-completion index as the default "what is left before
  this version is usable?" queue. A missing or stale app-completion index is a
  valid worker-ready Docs/PM lane.
- For vague user requests, Project Manager must rewrite the request into
  human-readable parent context and child issues before work starts. A child
  issue should be understandable without reading the whole chat.
- Project Manager checks every 30 minutes during Soar V1 takeover and must not
  leave stale `in_progress` issues without live execution.
- Specialist agents report lane status upward to Engineering Delivery Lead.
- Engineering Delivery Lead coordinates specialist lanes and parent issue state.
- Engineering Delivery Lead keeps the gap register alive and converts every
  failed proof into one-owner repair work.
- Engineering Delivery Lead is accountable for worker flow and outcome
  integrity: when a target is not verified, keep the smallest justified next
  lane ready, limit speculative fan-out, and ensure every lane changes an
  observable state or removes a named dependency with inspectable proof.
- QA, Security, and Ops can block completion when evidence, safety, or release
  readiness is insufficient.
- CTO/Product/Portfolio make broad decisions after specialist evidence is known.
- Docs Memory updates indexes, history, evidence ledgers, and template feedback.

## Required Disposition

Leave exactly one durable disposition at the end of each run:

- `done`: verified and evidence-backed.
- `blocked`: concrete blocker with next owner/action.
- `in_review`: named reviewer/gate owner exists.
- `delegated`: child issue exists or is explicitly requested.
- `in_progress`: only when a live continuation path exists.

Do not rely on narrative-only completion. File edits, comments, and summaries are
supporting evidence; the Paperclip issue graph must also reflect the truth.

When the local Paperclip API is available to the agent, the final action must be
a real issue-state update, not only a comment. Use `PATCH /api/issues/{issueId}`
with the final `status` and a concise evidence comment. If a recovery action was
created only because the previous run had evidence but no durable disposition,
the recovery owner should resolve that recovery action and restore the source
issue to the evidence-backed status instead of creating another blocker.

Ownership or assignee correction is not an unblock signal. If a blocked issue is
only being moved to the right owner, preserve `status: blocked` in the same API
update and avoid ordinary comments that can wake a continuation. Use a separate
fresh operator approval comment only when the issue is intentionally allowed to
run one narrow gate recheck.

When `node scripts/run-softwarehouse-control-tick.mjs` exposes
`operatorActionPacket.status=operator_input_or_gate_evidence_needed`, do not
invent filler work. Surface the redacted packet as the operator-facing unblock
summary, keep monitoring fresh, and wait for one accepted fresh fact before
resuming protected project mutation, commit, push, deploy, or restart work.

When the status is `source_control_closure_needed`, operator input is not
required. Classify the listed paths first, run the smallest relevant local
validation, then make and record a local commit or an explicit no-commit
decision. Push, deploy, restart, protected smoke, and secret access remain
forbidden unless their separate release or operator gate is satisfied.
