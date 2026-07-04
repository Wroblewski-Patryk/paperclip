# Responsibility Learning

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
