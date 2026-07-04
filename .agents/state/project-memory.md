# Paperclip Softwarehouse Project Memory

Last updated: 2026-07-03

## 2026-07-03 Archived Thread: App-Completion And Company-Standards Context

This thread established durable Softwarehouse direction, not just one task:

- Active app focus is `Soar` first and `Roost` second. `Aviary`, `Nest`,
  `Featherly`, `LuckySparrow.ch`, `OpenJarvis`, `Obiekty`, and Paperclip
  product work stay parked until the board explicitly activates them.
- Paperclip agents need an app-completion model that maps architecture to real
  user flows: login, subscription/entitlement, configuration, Binance/Gate.io
  or other integrations, backend/API behavior, frontend display, tests, docs,
  screenshots/clickthrough proof, and next owner/action.
- Existing-app takeover, mapped repair, and greenfield app creation should use
  one lifecycle standard and converge into the same proof/review loop.
- Softwarehouse work must stay grounded in business usefulness: target user,
  job-to-be-done, paid/free boundary, onboarding, trust/safety, risk, evidence,
  and owner acceptance. Working code without user trust is unfinished; pretty
  UI without working data/configuration is unfinished.
- Agent handoffs should move down and back up the organization:
  `PM -> CTO/UX -> specialist -> QA/Ops/Security -> PM/Product -> Docs/Memory`.
  User-visible work should end in review evidence, not only a "done" comment.
- Codex supervision should now use one automation:
  `check-paperclip-soar-autonomy` / `Paperclip Softwarehouse liveness
  watchdog`, scheduled every 480 minutes. The former weekly
  `paperclip-autonomous-company-standards-review` automation was merged into
  this watchdog and deleted on 2026-07-03. Strategic review of APQC/MECE/PDCA
  and other useful standards now happens inside the watchdog.
- Human-in-the-loop should happen through owner approve/decision tasks created
  by autonomous Paperclip agent activity. If a recommendation changes strategy,
  authority, production, money, secrets, live accounts, commercial promises, or
  broad organization design, the watchdog/agents should create an approve task
  with recommendation, alternatives, consequence of doing nothing, and what
  resumes after approval.
- The watchdog also acts as a temporary "teacher" above Paperclip: repeated
  failures should produce durable lessons in docs, agent instructions,
  routines, scripts, tests, project-truth indexes, evidence gates, or repair
  lanes until Paperclip can self-supervise reliably.

Relevant files from this direction:

- `docs/softwarehouse/12-app-completion-review.md`
- `docs/softwarehouse/13-app-lifecycle-standard.md`
- `docs/softwarehouse/14-business-operating-standard.md`
- `softwarehouse/operating-processes.md`
- `softwarehouse/instructions/shared/90-pipeline-and-supervision.md`
- `softwarehouse/instructions/shared/95-operating-processes.md`
- `scripts/build-app-completion-index.mjs`
- `scripts/check-architecture-awareness-lifecycle.mjs`

Recent verification/context:

- `pnpm softwarehouse:test-gates` passed with `48/48`.
- `pnpm softwarehouse:architecture-lifecycle` passed for
  `Paperclip`, `Soar`, and `Roost`.
- The agent instruction sync reported `38` agents updated after Softwarehouse
  instruction changes.
- Active routine duplicates were cleaned down to zero active duplicate groups.

## Local Instance

- Active LuckySparrow Software House API/UI base is `http://127.0.0.1:3200`.
- Do not treat failed probes to `localhost:3100` or `3101` as proof this local
  Softwarehouse instance is down.
- Relevant UI pages from the archived thread:
  - `http://127.0.0.1:3200/LUC/routines`
  - `http://127.0.0.1:3200/LUC/agents/all`

## Decisions And Operational Lessons

- The high volume of `issue_assignee_changed` cancellations is not necessarily
  harmful by itself, but repeated queued wakeups for the same issue/agent can
  create dashboard noise and queue churn.
- Prefer fixing duplicate/stale routines by archiving superseded duplicates, not
  pausing them indefinitely.
- Do not resume all paused agents blindly. Resume or reassign only specific roles
  whose paused status is blocking active critical work.
- Inactive/paused routines should be evaluated by whether they are duplicate,
  superseded, or strategically useful before activation.

## Code Changes Started In Archived Thread

- `server/src/services/heartbeat.ts` was changed to coalesce repeated
  capacity-deferred issue wakeups by same issue/agent instead of creating many
  pending wakeups.
- Regression coverage was added in
  `server/src/__tests__/heartbeat-stale-queue-invalidation.test.ts`.
- Verification run during the thread:
  - `pnpm vitest run server/src/__tests__/heartbeat-stale-queue-invalidation.test.ts -t "coalesces repeated issue wakeups" --reporter=dot`
  - `pnpm --filter @paperclipai/server typecheck`
- Note: the workspace was already dirty and this directory did not contain a
  `.git` repository when memory was written. Do not assume these changes were
  committed.

## Routine Cleanup Applied

Archived superseded paused duplicate routines:

- `b976be32-3d9c-4688-b70e-b67ed9ca9f8d` -
  `[Softwarehouse] Company value-stream governance`
- `5cc9b38f-446c-4dff-9935-d8b3492e7a76` -
  `[Softwarehouse] Human decision inbox steward`
- `f0e2ddc6-45ef-4d26-86a3-d7a881f71e0e` -
  `[Softwarehouse] Product acceptance gate review`
- `dbbad564-5c3a-474e-ab61-a594091dbdf6` -
  `[Softwarehouse] CTO technical acceptance gate review`

Activated strategically useful routines:

- `3683f550-cb08-4e8a-8b2f-e7e9572d1b06` -
  `[Softwarehouse] Delivery gap loop`
- `6d5eaf0a-7d8b-4f58-a15f-d6a1568fc184` -
  `[Softwarehouse] Release and deploy governance audit`

Post-cleanup routine status snapshot from the thread:

- `active: 42`
- `archived: 4`
- `paused: 6`
- health check OK

## Agent And Issue Cleanup Applied

Cleared stale `error` state on these agents; all returned to `idle`:

- `3300d600-8039-4fb9-a8a6-6009a38e82d5` -
  `06 AID (AI Agent Development Partner)`
- `70be2377-dc68-4962-b7b3-cd2352fef753` -
  `04 COO (Chief Operating Officer)`
- `65bb2327-4e81-4754-a53e-141b579f0ae6` -
  `10 SPA (Security & Privacy Auditor)`

Resumed only the paused roles that were blocking active critical queues:

- `e9a487af-764a-4602-99c5-17fd3467dbd5` -
  `09 RTE (Runtime & Adapter Engineer)`
- `e8572481-c6ad-4a0d-a421-3e1d4c203cf9` -
  `04 DPM (Delivery Project Manager)`

Fixed stale blocker state:

- `LUC-6595` was blocked only by `LUC-6562`, which was already `done`.
  Removed the stale blocker and reopened `LUC-6595` to `todo`; it then moved to
  `in_progress` under AIA.

Wake comments were added to:

- `LUC-6647`, because it unblocks `LUC-6645`.
- `LUC-6641`, because it unblocks `LUC-6637`.

Post-cleanup agent snapshot from the thread:

- `errors: 0`
- `idle: 15`
- `paused: 20`
- `running: 3`
- Running issues were AIA on `LUC-6595`, RTE on a runtime cleanup issue, and DPM
  on `LUC-6641`, all with `outputSilence: ok`.

## Known Remaining Blockers And Risks

- Many blocked Soar issues are genuinely blocked by `LUC-6331`
  (`[Soar] Restore production Web and backtest worker health after LUC-6329 watch`).
  Do not unblock these mechanically unless `LUC-6331` is resolved.
- Some open tasks remain assigned to intentionally paused roles such as CPO,
  FEW, IDE, CINO, and others. Treat these as intentional until a specific active
  blocker requires a targeted resume/reassignment.
- Some `in_review` items are board/operator decision lanes, not agent failures.
  Do not auto-close or auto-reassign without reading the issue context.
- `process_lost` and `adapter_failed` appeared in recent historical runs before
  cleanup. After the targeted changes, newly running agents had healthy output,
  but future sessions should still check fresh run telemetry before assuming the
  queue is healthy.

## Useful Future Checks

- Health:
  `curl http://127.0.0.1:3200/api/health`
- Companies:
  `curl http://127.0.0.1:3200/api/companies`
- Agents:
  `GET /api/companies/f13051a7-d0aa-4261-9254-d3ab90735de5/agents`
- Live runs:
  `GET /api/companies/f13051a7-d0aa-4261-9254-d3ab90735de5/live-runs?limit=20&minCount=0`
- Recent runs:
  `GET /api/companies/f13051a7-d0aa-4261-9254-d3ab90735de5/heartbeat-runs?limit=30`

## Source-Control And App Redeploy Model

- Paperclip is the control plane. Stage 1 agent work is bounded to
  `C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse`,
  `C:/Personal/Projekty/Aplikacje/Soar`, and
  `C:/Personal/Projekty/Aplikacje/Roost`.
- Sibling app folders under `C:/Personal/Projekty/Aplikacje` are owner assets
  or parked portfolio items. Do not mutate or delete them without explicit
  owner approval.
- Product-app work must be closed from the product repo root, not only from
  `Paperclip_Softwarehouse`: report files changed, verification, commit SHA or
  why no commit exists, branch/upstream state, push status, deploy impact,
  Coolify redeploy evidence when applicable, production smoke/readiness
  evidence, residual risk, and next owner.
- `scripts/run-release-push-deploy-governor.mjs` is app-aware and defaults to
  Soar/Roost when `SOFTWAREHOUSE_RELEASE_PROJECTS` is unset. Use it before
  broad push/deploy decisions.
- Run `pnpm run softwarehouse:workspace-boundary-audit` after changing
  Paperclip projects, routines, workspaces, or autonomy scope.
- Known current blocker: Soar was observed with 31 dirty lines and branch
  divergence (`main...origin/main [ahead 9, behind 1]`). Future agents should
  classify/commit dirty work and reconcile the branch before any push or deploy
  attempt.
- The formal memory workflow `.agents/skills/paperclip-project-memory/SKILL.md`
  is present as of this update and should be used for future archival memory
  writes.

## Codex Watchdog And Teacher Loop

- Active Codex automation: `check-paperclip-soar-autonomy` / `Paperclip
  Softwarehouse liveness watchdog`, every 480 minutes in
  `Paperclip_Softwarehouse`.
- Deleted/merged automation: `paperclip-autonomous-company-standards-review`.
  Future agents should not expect a separate Sunday review automation.
- Expected report files:
  - `report/codex-automation/paperclip-liveness-watchdog.latest.md`
  - `report/codex-automation/paperclip-liveness-watchdog.latest.json`
  - `report/codex-automation/paperclip-teacher-lessons.latest.md`
  - `report/codex-automation/paperclip-teacher-lessons.latest.json`
- Recovered audit lesson that should remain in the watchdog: close or classify
  local Paperclip OS source-control state before broad autonomous delivery, or
  create/update one deduplicated closure lane.
- Recent evidence from the consolidation session: Coolify production reconciler
  was `ready` with `8/8` resources and loaded secret key names only; softwarehouse
  gate specs passed `82/82`; longevity doctor `--apply` created/updated
  `LUC-6985` and still warned on `LUC-3515` needing a structured decision path.
