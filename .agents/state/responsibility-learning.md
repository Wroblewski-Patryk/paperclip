# Responsibility Learning

## 2026-08-03 - Authority must shrink as uncertainty and irreversibility rise

Observed failure mode: work could enter a runnable queue because it sounded
urgent or important, without one machine-checkable record of expected value,
cost of inaction, evidence quality, resource limits, stopping conditions, or
rollback. That makes activity easier to authorize than deliberate restraint.

Standing rule: critical and protected agent-created work requires a native
pre-start decision contract. A low-confidence agent may investigate or propose,
but may not self-authorize costly or irreversible execution. Irreversible work
uses a governed proposal/escalation path. `later`, `monitor`, accepted debt,
rejection, and conditional execution are valid outcomes when justified.
Assumptions require provenance, confidence, review/expiry, and narrow linked
invalidation. Behavioral organizational evals must prove these rules rather
than relying on prompt wording.

## 2026-08-03 - Inventory is not progress and supervision must resist gaming

Observed failure mode: the operating policy required three planned worker
lanes per active product. Controllers correctly optimized that written metric
by creating and replenishing backlog, even when one next action was enough.
The queue, documentation, and review machinery could therefore grow while the
owner-visible product state did not change.

Standing rule:

- Never use counts of tasks, comments, documents, commits, agents, runs, or
  completion percentages as success targets. Use them only to trigger a causal
  investigation.
- Define success as observable product/owner state change or a necessary
  risk/dependency reduction, backed by inspectable evidence and independent
  review when required.
- Keep one smallest justified runnable next action per active product. Create
  more children just in time only for independent outcomes with named owners,
  evidence contracts, dependencies, and an integration owner.
- More than three open direct children, request depth above four, repeated
  normalized titles, comment-only evidence, or documentation-only technical
  closure are anti-gaming warnings, not invitations to create more process.
- After three failures without materially new evidence, stop retrying and open
  one systemic-cause, escalation, or redesign path.

Current evidence: the three-lane quota was removed from the worker backlog
model, seeder, learning loop, longevity routine, agent instructions, audit, and
autonomy governor. `softwarehouse:outcome-integrity` and its control-tick step
provide a testable regression guard, and Teachar now applies reversible staged
supervision rather than declaring autonomy from silence.

## 2026-08-02 - Active work must drain for systemic repair, not block it forever

Observed failure mode: Teachar could correctly identify control-plane defects
while a continuously replenished run tree made runtime repair permanently
illegal. Reporting more findings increased repair debt while new runs continued
under known-bad orchestration.

Standing rule:

- Classify every defect as immediate isolated repair, drain-required repair,
  genuine owner gate, or bounded accepted deferral.
- Never use `active runs present` as an unbounded disposition. Cut admission
  before waiting, so the run count can actually converge to zero.
- Preserve healthy in-flight runs; block only new admission. Request a durable
  checkpoint before interrupting one evidence-proven stale/runaway run.
- Drain at the smallest boundary: project writer for product repair, global
  company/runtime only for Paperclip runtime or shared contracts.
- Reopen only after tests, health/readback, and a deduplicated recovery plan.
- The current company pause is a compatibility barrier because it skips new
  wakeups. The native controller must defer them durably through
  `open/draining/maintenance/reopening` states.

Retirement condition: the native admission controller is implemented and
tested end to end, and Teachar demonstrates that detected systemic repair debt
is deployed rather than repeatedly reported.

## 2026-07-21 - Protected readback must stay in the authorized lane

Observed failure mode: SPA was the right role to notice the protected readback
gap, but its local runtime lacked the managed-reference binding needed to read
back the protected Soar evidence directly.

Standing rule:

- If SPA lacks the runtime or managed-reference binding for a protected readback,
  stop at the boundary and route the request to the authorized DRE lane.
- Treat the handoff as the durable action; do not retry the protected readback
  from an unbound SPA context.
- Preserve the issue chain and evidence anchor rather than manufacturing a
  fallback credential path.

Current evidence: `LUC-1569` now serves as the readback anchor for the
`LUC-1568 -> LUC-1556 -> LUC-1559 -> LUC-1547` chain, and no credential value
or production mutation was performed by Codex.

## 2026-07-21 - Learning loops should confirm coverage, not duplicate it

Observed failure mode: an organizational learning run can still encounter
repeated blocker families that are already covered by existing learning issues
or by an existing duplicate-suppression rule. If the loop treats those hits as
fresh process gaps, it creates noise instead of preserving a useful evidence
signal.

Standing rule:

- Keep the learning loop evidence-producing, not issue-cloning.
- When apply mode finds an already-covered pattern, record a no-op on the
  existing learning issue or suppress the duplicate and move on.
- Do not turn bounded learning backfills into new capability-gap issues unless
  the pattern is genuinely uncovered and the smallest process improvement is
  still missing.
- Record the retirement or merge-back condition so the lesson can stop firing
  once coverage is stable.

Current evidence: `LUC-1567` completed successfully on 2026-07-21, processed
the bounded recent-learning backfill, suppressed the duplicate `LUC-1492`
pattern via `LUC-1532`, and kept the existing `LUC-972` and worker-fanout
learning coverage as no-ops.

## 2026-07-21 - Terminal product parents can hide a dead delivery loop

Observed failure mode: product execution parents were marked `done` after
historical proof packets even though their explicit contracts required an
owner-usable application and their latest comments still named unresolved
gates. The parents also retained the control-plane project workspace instead of
the product workspace. The hard delivery parent therefore remained blocked,
while routine selectors had no persistent product owner that was obligated to
integrate child results and commission the next problem.

Standing rule:

- Every unfinished active application has one persistent PM-owned completion
  parent in its canonical product project/workspace.
- The parent remains non-terminal until product acceptance is genuinely green;
  a plan, report, generated index, local commit, clean repo, isolated proof, or
  temporary runtime recovery cannot close it.
- Child completion wakes the PM. The PM integrates current truth and either
  routes the next smallest legal problem to the correct specialist unit or
  attaches complete owner-usable acceptance evidence.
- At every point an unfinished product exposes a live productive run, a
  runnable correctly owned `todo`, or a resolvable first-class blocker with a
  named owner and continuation mechanism. `backlog` alone is not liveness.
- Cross-unit ownership failures are routed through the accountable manager or
  a board-safe reassignment path; they must not remain indefinitely blocked on
  `403 Agent cannot mutate another agent's issue`.
- Eval the whole organizational handoff, not only individual scripts: require
  at least two automatic unit-to-unit transitions and fail on early parent
  closure, wrong-project workspace, backlog-only capacity, or a second writer
  against a dirty product repository.

Current evidence: `LUC-27` and `LUC-28` were restored to their Soar/Roost
projects, `LUC-25` now blocks on them, and `LUC-1554` owns implementation and
regression proof for the durable conveyor.

## 2026-07-15 - Windows script paths are not executable commands

Observed failure mode: an agent invoked a tracked `.mjs` helper by path and
Windows opened the source in VS Code or Notepad through the file association.
The editor process looked like activity, but the intended Paperclip mutation or
artifact upload never ran.

Standing rule:

- Execute `.js`, `.mjs`, and `.cjs` through `node`; execute `.ts` through the
  owning repository's `pnpm exec tsx` or documented package script.
- Never use a bare script path, `Invoke-Item`, or `Start-Process` pointed at a
  source file as an execution mechanism. Do not change global file
  associations as a workaround.
- In Node child-process code, use `process.execPath` and pass the script path as
  an argument.
- If an editor opens unexpectedly, close it, record the failed invocation once,
  and retry with the explicit runtime. Do not count the editor process as proof
  that the helper ran.
- Keep this rule in shared generated instructions and enforce it with the
  agent-instruction audit so new agents inherit it automatically.

## 2026-07-14 - Prompt-only status restrictions are not enforcement

Observed failure mode: LUC-1161 received an explicit status-only recovery
packet with deliverable and document work disabled, but still modified 78
Roost files. The task prompt was clear; the execution boundary was missing.

Standing rule:

- A status-only context must force the adapter into a fresh read-only sandbox.
- Remove configured bypass, sandbox, and additional writable-directory flags;
  never resume a prior writable session for status-only work.
- Keep issue/status reporting available, but route any required workspace edit
  to a separately assigned deliverable issue.
- Treat a status-only run that changes a repository as a runtime policy defect,
  not merely an agent coaching problem.

## 2026-07-12 - Self-run filtering for supervisor dispatch

Observed failure mode: supervisor-style routing can accidentally count its own current Paperclip run as external work. That can make the next-action selector or watchdog choose `supervise_active_runs` when the only live work is the supervisor itself.

Standing rule:

- When a supervisor delegates to next-legal-action or similar dispatch logic, filter out the current `PAPERCLIP_RUN_ID` and current issue context before deciding whether external work exists.
- Keep the observed run count and ignored-self-run count visible in the selector or watchdog output so the decision can be audited.
- Verify the filter with a gate/spec test before treating a quiet board as idle.

## 2026-07-12 - Terminal-gate freshness alignment

Observed failure mode: exported unblock packets can show terminal gates as fresh runnable work even when the operating decision correctly refuses to resume them.

Standing rule:

- Treat terminal delivery gates with good evidence as preserved evidence, not as fresh runnable gates.
- Use the same non-terminal actionable-fresh definition in both the exported packet and the operating selector logic.
- If the packet and selector disagree, repair the definition instead of re-queuing the gate.

## 2026-07-06 - Structured in_review handoff contract

Observed failure mode: tasks can enter `in_review` without enough structure to
tell the next reviewer what decision is needed, what evidence proves readiness,
or who owns the next move. That makes the review lane look live while the board
cannot actually act on it.

Standing rule:

- Treat `in_review` as a waiting state only when the next owner is explicit.
- Every review handoff must name:
  - reviewer or typed execution participant;
  - decision options (`approve`, `request changes`, `reject`, or a typed
    equivalent);
  - evidence links or artifacts that the reviewer must inspect;
  - deadline or cooldown for the next check;
  - next owner after the decision.
- Prefer `request_confirmation` or a typed issue-thread interaction for the
  decision path; do not rely on an unstructured markdown comment alone when the
  decision controls follow-up work.
- Update role instructions and issue-template guidance to require the contract.
  Do not change janitor behavior for this gap unless a future audit shows a
  separate cleanup defect.

Verification:

- Live example issue `LUC-149` is blocked and currently lacks a structured
  decision path.
- The current Paperclip API already supports `request_confirmation`,
  `ask_user_questions`, and `in_review` waiting paths, so the missing piece is
  operator discipline and template guidance rather than new lifecycle state.

## 2026-07-03 - App-completion proof before done

Observed failure mode: agents can find a backend function that works and close
the task even though the frontend displays it badly, the subscription/config
gate is missing, or no browser proof exists. The inverse also happens: a UI
surface exists but the backend, API key setup, exchange integration, or paid
feature entitlement is not proven.

Standing rule:

- Treat user-visible work as unfinished until the user flow is proven across
  frontend, backend, auth, subscription/entitlement, configuration,
  integration, tests/docs, and browser/screenshot/clickthrough proof as
  relevant.
- Use `docs/status/app-completion-index.md` as the PM/QA queue for "what can a
  real user actually do?"
- Builders return evidence upward for review. PM/Product/QA/Docs accept,
  request fixes, or route follow-up; a builder's "done" comment alone is not a
  final acceptance gate for user-facing work.

TODO for a future Codex:

- When app work feels vague, create or refresh the app-completion index before
  coding.
- For new apps, start from the lifecycle brief in
  `docs/softwarehouse/13-app-lifecycle-standard.md`.
- For business/product ambiguity, use
  `docs/softwarehouse/14-business-operating-standard.md` before creating broad
  implementation tasks.

## 2026-07-03 - Prevent duplicate local app instances

Observed failure mode: Paperclip Softwarehouse agents/routines can accidentally
create many local copies of the same app when project workspace policy defaults
to isolated git worktrees or when agents use temp/scratch folders as app
repos. This wastes disk, CPU, memory, and makes it unclear which app instance is
authoritative.

Standing rule:

- Treat `C:/Personal/Projekty/Aplikacje/<Application>` as the only canonical
  local repo/workspace for each app.
- Use Paperclip project workspace/runtime controls for services instead of
  starting unmanaged duplicate dev servers.
- Do not create app repos/checkouts in `C:/tmp`, `%TEMP%`, Downloads, Desktop,
  or random scratch folders.
- Only create isolated worktrees when the board explicitly approves it for a
  specific issue, and preserve evidence/work products before cleanup.

TODO for a future Codex:

- Once `http://127.0.0.1:3200` is healthy, rerun or repair the Softwarehouse
  configuration so the live project workspace policies match the updated repo
  script/instructions.
- Add or run an audit that flags project workspaces whose `cwd` is outside the
  canonical applications root or points to temp/scratch directories.
- Investigate why `C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse`
  currently lacks visible `.git` metadata even though earlier tooling reported
  git status-like output.

## 2026-07-03 - Queue hygiene and targeted unblocking

Observed failure mode: a busy dashboard can look productive while still hiding
mechanical control-plane churn. In the archived cleanup thread, repeated
`issue_assignee_changed` cancellations were mostly stale queued runs waking
after ownership had already moved. Some blocked/todo lanes were also stuck
because the blocker was already terminal or the assignee role was paused.

Standing rule:

- Treat `issue_assignee_changed` cancellations as benign only after checking
  whether the same issue/agent is being repeatedly queued.
- Prefer code-side coalescing for duplicate wakeups over manual dashboard
  cleanup.
- Remove blockers only when the blocker is actually terminal/resolved; do not
  override live blocked dependencies such as active Soar restoration blockers.
- Resume paused agents only when a specific paused role blocks a current
  critical queue. Do not mass-resume paused company roles.
- For duplicate/superseded routines, archive the duplicate instead of leaving a
  paused duplicate around as permanent dashboard noise.

TODO for a future Codex:

- Confirm the heartbeat wakeup coalescing change is committed or otherwise
  preserved; the archived thread verified it locally but did not confirm a git
  commit.
- Recheck fresh heartbeat telemetry before assuming the queue is healthy:
  `GET /api/companies/f13051a7-d0aa-4261-9254-d3ab90735de5/heartbeat-runs?limit=30`.
  Watch for fresh `adapter_failed` or `process_lost`, not only historical runs.

## 2026-07-03 - Watchdog and autonomy truth rules

- Do not create a new owner path just to restate a duplicate watchdog warning.
  If the longevity doctor reports duplicate `[Softwarehouse] Longevity doctor
  and watchdog` issues but a fresh duplicate run already closed and a cleanup
  issue already exists, keep one consolidation lane and verify on the next
  doctor pass. In this cycle that lane was `LUC-7125`.
- Treat `LUC-7008` as the current canonical local-first autonomy score packet
  until a newer evidence-backed packet supersedes it. The honest score remains
  `0.74 / 1.00`, not `0.9+`.
- Accepted constraints such as codex-local bypass/sandbox posture and the lack
  of a separate staging VPS must not be counted as defects, but they also must
  not be counted as proof of autonomy improvement.
- `LUC-7059` and `LUC-7100..LUC-7103` are closed cleanup history, not an
  invitation to run another broad routine-mismatch audit. Reopen only on new
  evidence with readback and proof.
- Product acceptance remains intentionally parked manual-only after the
  `LUC-7103` / `LUC-7106` closure path. Do not reactivate that routine unless a
  real invokable owner path and new evidence exist.

## 2026-07-03 - Repo-aware git and Coolify feedback

Observed failure mode: agents can treat Paperclip's git state as enough proof
for product-app work. In this Softwarehouse setup, Paperclip is only the
control plane; apps such as Soar and Roost have their own repos, remotes, and
Coolify redeploy paths.

Standing rule:

- Agents must always name the affected repo root in handoff/closure, then
  report commit SHA or why no commit exists, branch/upstream state, push status,
  deploy impact, Coolify redeploy evidence when applicable, production smoke
  evidence, residual risk, and next owner.
- Frontend agents should include browser/screenshot evidence for UI changes and
  should hand off to deployment reliability/Ops when production redeploy
  verification is needed.
- Before any broad release push, run the app-aware release governor or an
  equivalent repo-by-repo status check and fix blockers instead of pushing
  opportunistically.

TODO for a future Codex:

- Keep source-control closure visible in default agent instructions, bundled
  skills, and role templates so every future project inherits this behavior.
- Recheck Soar before deploying: it was observed with 31 dirty lines and
  `main...origin/main [ahead 9, behind 1]`.

## 2026-07-03 - Codex watchdog as Paperclip teacher

Observed failure mode: Paperclip can pass through many agent/routine cycles
without turning repeated failures into durable operating improvements. This is
especially painful when the same blocker reappears: missing indexes, unclear
ownership, production/Coolify uncertainty, secret-access confusion, stale
source-control state, or agents closing work without holistic proof.

Standing rule:

- The 8-hour Codex watchdog should act as a teacher above Paperclip until
  Paperclip can self-supervise. It should not only check whether the local
  runtime is alive; it should identify repeated failures, decide which layer
  must learn, and apply the smallest durable improvement.
- A lesson is useful only when it names:
  `observedProblem`, `rootCause`, `durableLesson`, `paperclipLayerToTeach`,
  `changeApplied`, `verification`, `nextTimePaperclipShould`, and
  `retirementSignal`.
- Valid layers to teach include docs, agent instructions, routines, scripts,
  tests, project-truth indexes, evidence gates, and repair lanes.
- Do not create duplicate repair lanes for the same systemic issue. Update the
  existing deduplicated issue/routine/report when one exists.
- Do not treat blockers as excuses. If the blocker is configuration, secrets,
  Coolify/VPS access, local runtime, missing index, or missing evidence, the
  responsible lane should produce a concrete repair path or owner-gated ask.

TODO for a future Codex:

- After the next watchdog run, verify that
  `report/codex-automation/paperclip-teacher-lessons.latest.*` exists and that
  at least one real lesson was either applied or explicitly marked unnecessary.
- Check whether `LUC-6985`, `LUC-3515`, and the source-control closure lesson
  are still active blockers or have been retired with evidence.

## 2026-07-04 - Do not strand source-scoped recovery after infrastructure repair

Observed failure mode: a transient/infrastructure adapter failure can create
source-scoped `Recovery needed` actions, then remain visible even after the
runtime substrate is fixed if no fresh wake is queued for the recovery owner.
This makes Paperclip look broken while the real fix has already landed.

Standing rule:

- Treat repeated `adapter_failed` from the same runtime substrate as one repair
  lane, not many duplicated issue trees.
- After the substrate is repaired, source-scoped recovery actions should be
  rearmed with a bounded cooldown and a fresh attempt count when there is no
  active execution path.
- Prefer official agent `/resume` for stale non-running `error` badges caused
  by historical infrastructure failure; do not mass-invoke agents just to clear
  UI state.
- Avoid restarting the Paperclip server while healthy live runs are active
  unless the restart is the only safe repair path.

## 2026-07-04 - Treat protected smoke gaps as configuration defects

Observed pattern: Soar Gate 2 reached real deploy/readiness verification, but
protected `/workers/ready` smoke could not be proven with the available
production test account. The smoke account authenticated as `USER`, while the
endpoint requires admin authority plus the approved ops-network path. `LUC-69`
correctly captured the missing bindings as a blocked configuration/approval
lane instead of letting QVE/DRE close the gate with partial evidence.

Standing rule:

- When a protected production smoke needs additional secret refs, roles, or
  ops-network bindings, record the exact missing secret-ref names and required
  authority without exposing values.
- Keep the delivery gate blocked until the least-privilege path is approved and
  bound; do not downgrade the evidence requirement merely because public health
  checks pass.
- Route secret binding, role grant, deploy, restart, or broad access changes
  through the governed owner/AIA path. DSM/operations may record the lesson and
  track the blocker, but must not self-edit agent authority or bindings.
- Future closure evidence should cite the parent issue, the binding/approval
  issue, the smoke command or artifact, and the residual risk.

## 2026-07-04 - Split live capacity cleanup into diagnosis, permit, and hardening

Observed pattern: Stage 1 deploy triggers for Soar and Roost reached Coolify, but
the queue did not produce current production build metadata while the VPS root
filesystem was critically full. The useful path was not another deploy trigger.
It was a read-only investigation, a narrow mutation permit, and source-controlled
recurrence hardening.

Standing rule:

- Treat live disk/capacity pressure as a protected release gate, even when the
  suspected object looks obvious.
- First produce read-only evidence with target object, size, owner, path,
  sensitivity risk, and no-mutation boundary.
- If cleanup is needed, request approval for the exact object/action, expected
  reclaimed space, rollback/no-rollback statement, stop condition, and
  post-action smoke/readiness checks.
- Route recurrence prevention as a separate source-controlled code/config lane
  with verification, not as an ad hoc live-server tweak.
- Do not repeat deploy triggers while the deployment queue is known stale,
  storage is critically low, or the previous deployment rows are unresolved.

Current evidence:

- `LUC-124` found a stale Soar API core dump at `/app/apps/api/core` accounting
  for about 4.6G of writable-layer pressure without reading the core contents.
- `LUC-124` requested cleanup approval `eaae3dd5-369b-43b3-b54a-4d09c5dd5fc5`
  for deleting only that file.
- `LUC-127` implemented recurrence hardening in Soar deployment configuration.

## 2026-07-04 - Do not wake blocked duplicate lanes with cleanup comments

Observed pattern: live-run cleanup can accidentally recreate the problem it is
trying to solve. `LUC-145` and `LUC-146` were already blocked duplicate DRE
lanes while `LUC-133` remained the real active DRE run. The janitor cancelled
the duplicates, then wrote a bookkeeping issue comment that caused Paperclip to
queue fresh duplicate DRE runs for the same blocked issues.

Standing rule:

- For already-blocked duplicate owner lanes, cancel the duplicate run and skip
  bookkeeping issue comments unless a human-facing decision actually needs to
  be recorded.
- Do not treat board/user issue comments as neutral metadata; comments can wake
  assignees and should be avoided in pure runtime cleanup paths.
- Preserve the single productive owner run, and verify cleanup with a follow-up
  dry-run showing `actionCount: 0`.

Current evidence:

- `scripts/run-live-run-janitor.mjs` skips duplicate-run bookkeeping comments
  for blocked duplicate lanes.
- `scripts/softwarehouse-gate-specs.test.mjs` contains regression coverage for
  this behavior.

## 2026-07-04 - Deduplicate visible board truth before creating more work

Observed pattern: Paperclip can create internal noise when a scheduler or gap
dispatcher treats "no live run" or "terminal status" as "no existing issue."
That produced repeated routine execution issues and repeated Project Truth
tasks with the same exact title. Archiving old evidence is useful; deleting it
or letting it stay visible as current truth is not.

Standing rule:

- Before creating a routine or Project Truth issue, search for an existing
  visible exact match and reuse it as canonical context unless the new issue has
  a distinct, more precise scope.
- Routine execution coalescing must consider all open routine issues, including
  `blocked`, `todo`, and `in_review`, not only issues with live runs.
- Terminal duplicate evidence should be hidden with `hiddenAt`, not deleted.
  Keep one canonical visible item and preserve older history for audit.
- Do not use normal board/API comments for pure metadata cleanup on closed
  issues, because comments can reopen the issue and wake the assignee.
- If cleanup accidentally wakes an agent, cancel only that accidental cleanup
  run, restore the issue to its true terminal/hidden state, and record the
  lesson.

Current evidence:

- `scripts/run-routine-duplicate-janitor.mjs` supports terminal duplicate
  archival and open duplicate cancellation/hiding.
- `server/src/services/routines.ts` coalesces routine dispatch to open routine
  issues without requiring a live run.
- `scripts/run-project-truth-gap-dispatcher.mjs` dedupes exact visible terminal
  Project Truth issues.

## 2026-07-05 - Parked product roles must not keep live product workspaces

Observed pattern: even paused or parked roles can become dangerous if their
standing workspace points at a product directory outside the current mission.
Stage 1 allows Paperclip_Softwarehouse, Soar, and Roost only, but Aviary,
Featherly, and Nest product-manager roles still referenced their future product
folders.

Standing rule:

- If a product is parked, its manager may exist as a role but must use the
  Paperclip_Softwarehouse coordination workspace, not the inactive app repo.
- Product-specific cwd access is granted only when the owner explicitly
  activates the product into the current mission and the workspace boundary
  policy is updated in source control.
- Portfolio roles should read Paperclip-owned indexes and issue evidence rather
  than starting in the parent `C:\Personal\Projekty\Aplikacje` directory.

Current evidence:

- `softwarehouse/agent-roster.json` maps portfolio, Aviary, Featherly, and Nest
  workspaces to Paperclip_Softwarehouse for Stage 1.
- Live API audit after sync reported 39 agents and 0 cwd violations.

## 2026-07-05 - Treat token quota as operational capacity, not only accounting

Observed pattern: subscription-backed local Codex work can consume a large
weekly quota while normal API cost fields remain `$0.00`. If agents only react
to dollar spend, they can overrun the real limiting resource and then stall in
bulk when quota pressure appears.

Standing rule:

- Cost dashboards must show both real API billing and effective subscription
  plan usage.
- Queue/wake logic should use quota pressure to pace work before it wakes a
  large backlog.
- Agent context should be treated as a budgeted resource: start from a compact
  role/project baseline, then fetch specific architecture, issue, or evidence
  context only when the current task needs it.
- Context optimization must not remove evidence gates or cause agents to guess;
  it should reduce irrelevant context, not reduce accountability.

Current evidence:

- `/LUC/costs` now displays effective Codex plan usage and plan-share
  attribution while keeping API spend visible as `$0.00` when no metered API
  event exists.
- `scripts/softwarehouse-gate-specs.test.mjs` includes quota-gating coverage for
  local Codex starts.

## 2026-07-06 - Do not classify active instance files as disposable cleanup

Observed pattern: Paperclip can keep agent rows and adapter config in the
database while the file-backed instruction bundle under
`~/.paperclip/instances/default/companies/<companyId>/agents/<agentId>/instructions`
is missing. The UI then fails with `Instructions root does not exist`, and
agents may lose role-specific operating context even though the company still
looks configured.

Standing rule:

- Before cleanup, scan live Paperclip config for absolute path references and
  verify each referenced path exists.
- Treat active instance folders, agent instruction roots, local object storage,
  secrets metadata, database directories, and workspace roots as live runtime
  state unless proven otherwise.
- Prefer archive/recycle/backup over deletion when provenance is uncertain.
- After any cleanup or restore, test a representative instruction bundle page
  and at least one generated/restored agent bundle.

Current evidence:

- 2026-07-06 repair restored all 39 LuckySparrow managed instruction bundles.
- Active agent `adapterConfig` and `runtimeConfig` path-reference audit checked
  78 Windows paths and found 0 missing after the repair.
- `docs/softwarehouse-feature-regression-register.csv` now tracks this as a
  regression risk under `runtime_file_state` and `cleanup_safety`.

## 2026-07-12 - Distinguish dev-server cold render from a UI crash

Observed pattern: after source or configuration changes, the local trusted
Paperclip server and Vite middleware may restart together. The health endpoint
can recover before the first UI module graph and dashboard queries finish, so a
fresh browser tab may briefly show only `Loading...` even though the app is
healthy. Dashboard activity content can also contain issue-reference links;
wrapping the whole activity row in another anchor creates invalid nested links
and React hydration warnings.

Standing rule:

- Verify `/api/health`, root HTML, Vite source assets, and the rendered DOM
  before classifying a temporary blank/loading view as a crash.
- After HMR or a watcher restart, repeat the browser check once the process
  start time is stable; do not diagnose from the restart window alone.
- Clickable activity rows that can contain issue mentions must use a
  keyboard-accessible non-anchor container and preserve nested link behavior.
- Keep a DOM regression check for `a a` nesting and confirm current timestamps
  before treating retained browser console history as a fresh error.

## 2026-07-17 - Windows supervision must be bounded and singleton

Observed pattern: fallback ports, mismatched launch paths, broad
`Win32_Process` enumeration, and retrying timed-out validation can turn one
local control plane into competing process trees and can overload or freeze the
PowerShell host.

Standing rule:

- Paperclip, Soar, and Roost each have one canonical checkout and one active
  project workspace. A new worktree or clone requires a scoped execution need
  and lifecycle cleanup, not convenience.
- Managed singleton ports fail closed. Never interpret automatic port fallback
  as a healthy second instance.
- Start and stop Paperclip only through the registered service tree. Inspect or
  terminate one verified PID tree; never serialize the full process table or
  broad-kill Node, PowerShell, Postgres, or Paperclip by name.
- Run heavy validation sequentially. When an external timeout occurs, record it
  as unverified, remove the exact remaining test tree, and use narrower passing
  evidence rather than immediately spawning a retry.

Current evidence:

- `scripts/audit-local-runtime-topology.mjs` verifies strict ports, canonical
  roots, one Git worktree per repo, one active project per root, one registered
  dev service, health, and absence of a Paperclip fallback on 3201.
- `scripts/start-luckysparrow-softwarehouse.ps1` and
  `scripts/stop-luckysparrow-softwarehouse.ps1` share the registered
  `dev:watch` lifecycle and have regression coverage in
  `scripts/softwarehouse-gate-specs.test.mjs`.

## 2026-07-18 - Planned backlog is not runnable capacity

Observed pattern: the worker-fanout audit counted `todo` and `backlog` together
as ready capacity, while Paperclip deliberately does not wake an assigned
`backlog` issue. Roost therefore appeared healthy with four planned cards and
zero runnable cards. Separately, the continuation watchdog treated any live
productive run as a company-wide lock even though the lane starter already
guards the target agent and project.

Standing rule:

- `todo` is runnable; `backlog` is reserve inventory.
- Each unfinished active track normally keeps at least one worker `todo` and
  three planned worker lanes in total, or explicit blockers for the deficit.
- One agent keeps WIP=1 and one shared project/repository keeps one active
  writer. A live run in one project must not idle independent agents in another
  project.
- The dispatcher starts at most one new independent lane per control cycle and
  reuses/promotes existing work before creating duplicates.

Current evidence:

- Focused rolling-queue and policy-gate tests pass 188/188.
- Live dry-run reports Soar `ready` and Roost `needs-another-child`, matching
  actual Paperclip wake semantics.

## 2026-07-20 - Windows test teardown is an ownership protocol

Observed pattern: a test assertion could pass while its teardown exceeded a
generic 10-second hook limit, a late embedded-PostgreSQL `io_worker` survived
its original parent, or a canonical database restarted with a new PID after the
test baseline was captured. Treating those cases as one flaky timeout either
reported false failures or risked killing the live control-plane database.

Standing rule:

- Separate assertion time from teardown time. Give Windows hooks a measured,
  bounded allowance and keep non-Windows defaults unchanged.
- Protect the canonical embedded database from its current strict-port
  listener on every cleanup pass, not only from a startup PID snapshot.
- Capture and terminate only the fixture-owned PID tree, then rescan it for
  late reparented descendants. Never broad-kill PostgreSQL or Node by name.
- Treat several consecutive no-listener snapshots as port release. A failed
  Node rebind probe is not proof that PostgreSQL still owns the port.
- After an interrupted aggregate run, prove there are no matching Vitest,
  temporary Paperclip service, or non-canonical PostgreSQL processes before a
  retry. A timeout remains unverified until a complete run exits 0.
- Node scripts that spawn pnpm use the active JavaScript entrypoint via
  `process.execPath + npm_execpath`, with a scoped Windows shell fallback.

Current evidence:

- Three complete DB iterations passed `108/108` active tests; three worktree
  iterations passed `105/105`.
- Full `pnpm test` exited 0 after 5,963.8 seconds, and post-run process audits
  found no test Node process or PostgreSQL outside the canonical 54329 tree.
- Recursive typecheck, build, build-gap typechecks, `182/182` Softwarehouse
  gates, workspace-boundary audit, and runtime-topology audit pass.

## 2026-07-22 - Project Truth targets are identifiers and paths, not titles

Observed pattern: Project Truth issue titles intentionally summarize a broad
user flow, so a QA agent interpreted two `page-tsx` lanes as the generic
dashboard page even though the issue description named a different dynamic
route. Generic browser proof can therefore look plausible while leaving the
indexed source item unchanged.

Standing rule:

- Treat `source item` and `authoritative evidence path(s)` as the executable
  target. The issue title and `userFlow` are routing summaries only.
- Never substitute a generic page, endpoint, component, test, or browser route
  for the exact indexed target.
- Dynamic routes require a concrete fixture URL that resolves the exact path.
- A proof lane stays open until the exact source item is removed or truthfully
  reclassified by the refreshed Project Truth indexes, and its evidence/state
  packet receives source-control closure.

Current evidence:

- `LUC-1650` closed the exact bot-assistant route and reduced Soar truth gaps
  from 51 to 50 with clean commit `87adc571c`.
- `LUC-1653` initially drifted to generic `/dashboard`; board supervision
  cancelled that run and a fresh session accepted the exact bot-edit route.
- The dispatcher now emits authoritative evidence paths, path-specific route
  title slugs, and an explicit exact-target rule. Focused dispatcher and
  Softwarehouse gate tests pass `197/197`.

## 2026-07-24 - Recovery and comment wakes require terminal-state deduplication

Observed pattern: successful source work can leave an obsolete recovery action
alive, and repeated retries then wake the same agent indefinitely. Separately,
adding a comment to an assigned issue can create a new wake even when the issue
has just been parked in `backlog`.

Standing rule:

- Before retrying recovery, read the source issue, its latest run, typed
  completion evidence, and any first-class blocker. Resolve the recovery action
  when that source truth is already terminal or explicitly blocked.
- Treat a high recovery attempt count as a control-plane fault signal, not as
  evidence that another identical agent run is useful.
- Park an assigned issue only after the final explanatory comment, or cancel
  the exact queued wake created by a later comment. Do not broad-cancel agents
  or processes.
- Bounded repo inspection must start from named files and helper paths. Avoid
  recursive workspace-wide searches across runtime/plugin directories.

Current evidence:

- `LUC-1513` and `LUC-1542` recovery actions were resolved after 143/144
  attempts once their successful source evidence was read.
- The recovery janitor resolved `LUC-1809` against blocker `LUC-1810`.
- A comment-after-backlog wake for `LUC-1827` was cancelled by exact run ID;
  the issue remains parked without product mutation.
- `LUC-1828` and `LUC-1829` produced clean live-run, final-disposition, and
  issue-queue janitor evidence. `LUC-1829` closed; the reusable `LUC-1828`
  lane returned to `todo` after preserving the completed pass as evidence.

## 2026-07-25 - Corrective closure must classify recurrence

Observed pattern: policy documents told agents to improve the process after
repeated failures, but the issue-close API allowed a local repair to finish
without any recurrence classification. Organizational learning and completion
evidence therefore existed as disconnected mechanisms, leaving prevention to
agent intuition.

Standing rule:

- Every agent-owned completion explicitly classifies whether corrective
  learning is not applicable, an isolated standard-risk one-off, or systemic.
- One-off classification includes the root cause and why recurrence risk is
  low; it is unavailable for high-risk corrective work.
- Systemic closure either proves prevention was implemented in the current
  issue or points to another non-cancelled same-company prevention issue.
- Preserve the board's explicit override and historical evidence compatibility;
  do not backfill invented learning claims.
- Keep the classification lightweight for ordinary delivery. Do not create a
  prevention issue merely to satisfy ceremony.

Current evidence:

- Shared validator tests pass `29/29`.
- Issue route tests pass `14/14`.
- Issue-update helper tests pass `2/2`.
- Adapter prompt tests pass `36` with `3` unrelated skips.
- Shared, adapter-utils, and server typechecks pass.

## 2026-07-26 - Windows agent commands must bypass batch argument forwarding

Observed pattern: managed Codex agents used `scripts/codex.cmd` as their
command while Roost CompanyCore MCP settings supplied quoted TOML values and
Windows paths through `-c`. Batch forwarding re-parsed those arguments, so
Codex rejected the final stdin marker with `unexpected argument '-'` before a
model turn began. The failure repeated across AIA, CTO, DRE, and Roost PM.

Standing rule:

- Resolve the platform-native Codex executable from the installed optional
  package and persist that executable as the agent command.
- Do not use `.cmd` forwarding for structured CLI arguments containing quoted
  TOML, JSON, or Windows paths.
- Audit both the default adapter configuration and every model-profile
  adapter configuration against the native command.
- Prove recovery with an actual run using the formerly failing argument set;
  clearing a stale `error` status alone is not repair evidence.

Current evidence:

- Native-command resolver tests pass `2/2` on Codex CLI `0.133.0`.
- Full managed synchronization updated `39/39` agents.
- Agent-settings audit reports zero findings.
- AIA and CTO completed post-fix runs with the quoted CompanyCore MCP
  configuration and explicit stdin `-` argument.

## 2026-08-02 - Duplicated project registries cause cross-project contamination

Observed pattern: generic orchestrators independently hardcoded active project
lists, aliases, PMs, priorities, and acceptance inputs. The copies drifted:
Featherly disappeared from some paths, parked Aviary/Nest remained active in a
janitor, and Soar-specific evidence/bindings leaked into generic or Roost PM
contexts. Existing health checks could still report success because they
verified availability, not semantic project provenance.

Standing rule:

- Resolve application identity from one canonical registry and exact active
  Paperclip project id.
- Every acceptance/readiness/deployment fact carries project identity and
  provenance; no aggregate or other-project fallback is allowed.
- Project PMs may hold only their own project-prefixed secret references plus
  explicitly shared base references. Cross-project QA/DRE access must be an
  explicit role plan, never accidental inheritance.
- Audit both source configuration and live Paperclip state. An unavailable or
  partial live readback fails closed.
- Repair active mismatches and add regression coverage; preserve closed history
  as warnings unless a separate migration is justified.

Current evidence:

- The strict isolation audit reports zero active blockers after repairing two
  PM binding sets and two open issue bindings.
- 22 closed historical Soar mismatches remain visible as warnings.
- Targeted isolation/selector/dispatcher tests and the 192-test canonical gate
  suite pass; all 39 managed instruction bundles contain the new guard.

## 2026-08-02 - Global run locks and exhaustive heartbeats starve delivery

Observed pattern: the next-action selector returned `supervise_active_runs`
before considering release candidates, so unrelated work in Featherly could
indefinitely prevent a clean Roost or Soar release. At the same time, large
aggregated audits could exceed the heartbeat window and make the supervisor
look unhealthy even when the underlying application lanes were progressing.

Standing rule:

- Live work is a project/agent/repository occupancy signal, not a company-wide
  mutex. Permit a ready application release when its own project and release
  owner are idle; keep same-project mutation serialized.
- Fetch active issue identity as one bounded catalog when classifying live
  runs. Do not perform an unbounded N+1 issue lookup per run.
- Every half-hour heartbeat runs a small operational control loop. Expensive
  longevity, topology, full-history, and deep semantic audits rotate only when
  stale, changed, or triggered by a concrete failure signal.
- A timed-out audit is an explicit supervision defect with an exact owner and
  next action. It is never reported as a pass and never retried concurrently.

Current evidence:

- Regression tests prove unrelated-project work does not suppress a ready
  release and same-project work still blocks it safely.
- Live instruction audit passes for 39/39 managed bundles with zero warnings.
- Teachar readback confirms the project model, two-layer supervision, release
  starvation check, and concise Polish run report are active every 30 minutes.

## 2026-08-02 - Historical ledgers can create false autonomy graduation

Observed pattern: the bootstrap retirement check accepted the existence of
`report/autonomous-cycles/latest.json` even though the latest cycle was one
month old. It also hardcoded parked Aviary/Nest while omitting the canonical
Featherly project. A superficially green run could therefore recommend
retiring external supervision without current Paperclip-owned execution proof.

Standing rule:

- Existence is not freshness. Retirement evidence needs a parseable timestamp
  within the bounded cycle freshness window.
- Retirement and portfolio checks consume the canonical active-project
  registry and project-specific outcomes.
- One clean snapshot is not adulthood. Require a continuous 14-day window and
  reset it after every critical regression or material external repair.
- Self-retirement is complete only after the automation status is read back as
  `PAUSED`; a requested pause is not evidence of a successful pause.

Current evidence:

- Bootstrap supervisor reports `bootstrap_required` and explicitly fails the
  stale July 2 autonomous-cycle ledger.
- Regression tests cover freshness, canonical projects, the observation
  status, and Teachar's self-pause contract.
- The same final readback caught postgres driver code `CONNECT_TIMEOUT`, which
  the janitor's database-unavailable classifier omitted. It now uses bounded
  API fallbacks for both control data and comments instead of failing the whole
  control tick or restarting the canonical database.

## 2026-08-03 - PID existence and recovery fan-out can deadlock one agent

Observed pattern: a detached CTO run remained `running` for roughly 19 hours
because its persisted PID had been reused by a PostgreSQL background worker.
Twelve never-started runs accumulated behind the same WIP=1 agent, including
the issue intended to evaluate the stale head. Cancelling queued tails through
the old endpoint created three replacement recovery runs.

Standing rule:

- PID existence is not process ownership. Compare the persisted process start
  timestamp to the observed process start timestamp before retaining or
  signalling a detached process. Only a positive identity match permits a
  persisted-process signal; both `mismatched` and `unverified` fail closed.
- Recovery for a blocked executor cannot be queued behind that executor.
- Janitor cleanup is monotonic and suppresses automatic issue recovery. Always
  prove that live/queued counts decreased and did not rebound.
- A paused company freezes admission but does not drain queued work. Reconcile
  stale/detached heads and deduplicate wakeups before reopening.

Current evidence:

- Live startup reaped run `00c2281a-15b1-48bb-90b4-94adbf702d67` without
  signalling the canonical PostgreSQL process.
- Twelve historical queued runs and four replacement/retry runs were cancelled;
  final live readback is zero and no cancellation recovery was recreated.
- The focused recovery suite passes 53 tests with one platform-specific skip.
- A follow-up review found and corrected the unverified-identity cancellation
  gap. The focused recovery suite now passes 54 tests with one
  platform-specific skip, including both reused and unverified live-PID proof.
- Source-control closure also needs a writer lease: commit `fa57ce75` captured
  the shared packet while Teachar was still reviewing/editing it. Future
  maintenance closure must reserve the repository writer before staging and
  read back the exact committed diff before reopening.
