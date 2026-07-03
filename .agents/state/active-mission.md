# Active Mission

## 2026-07-03 Softwarehouse App-Completion Mission

Current durable mission: make Paperclip Softwarehouse capable of taking over,
repairing, proving, and later creating subscription apps with autonomous agents
under owner approval.

The active lanes are `Soar` and `Roost`. Future apps remain parked until the
board explicitly activates them. Agents should not create broad controller,
routine, or implementation work for parked apps by default.

Key loop for user-visible work:

`PM user-flow map -> CTO/API/config map -> UX/frontend map -> specialist build -> browser screenshot/clickthrough proof -> QA/PM review -> Docs/index update`

Do not close a user-facing feature only because the backend works. Also do not
close a frontend-visible feature if subscription, configuration, exchange/API
keys, backend behavior, tests, docs, or browser proof are unknown.

## 2026-07-03 Conversation Memory

Context from repeated local Paperclip Softwarehouse diagnostics in late June / early July 2026.

### Durable Decisions And Findings

- Paperclip is being used as the LuckySparrow Softwarehouse control plane at `http://127.0.0.1:3200`, company prefix `LUC`, company name `LuckySparrow`.
- The board UI can appear empty for two different reasons:
  - frontend/session/cache issue while API is healthy;
  - backend serving HTML while the embedded Postgres is unreachable, where the visible page may show `database_unreachable`.
- Do not treat `LUC/inbox/all` containing many blocked/open items as evidence that Paperclip is broken. This Softwarehouse often has many `blocked`, `todo`, and `in_review` issues by design.
- Agents are generally not configured as continuous timer workers. Many active agents have no `adapterConfig.schedule`; they wake through routines, assignments, and wakeups, then return to `idle`.
- A healthy quiet state can be normal if the autonomy governor or control tick chooses to supervise, avoid duplicate work, or wait on source-control / protected-production gates.

### Operational Pattern

- Before restarting Paperclip, check:
  - `http://127.0.0.1:3200/api/health`
  - `http://127.0.0.1:3200/api/companies`
  - `http://127.0.0.1:3200/LUC/inbox/all`
  - `pnpm dev:list`
  - live runs: `/api/companies/<LuckySparrow company id>/live-runs`
- Avoid blind restarts while live runs exist unless the system is genuinely unhealthy.
- When the browser is blank, use browser/DOM inspection and API probes to distinguish UI cache/runtime errors from DB/backend failure.

### LuckySparrow Company Id

- `f13051a7-d0aa-4261-9254-d3ab90735de5`

## 2026-07-03 Dashboard And Queue Cleanup

The archived cleanup thread found that the busy dashboard was partly healthy
activity and partly real hygiene debt. Durable current-state notes:

- Repeated `issue_assignee_changed` cancellations should be checked for
  duplicate queued wakeups, not treated as automatically bad.
- Routines were cleaned by archiving superseded duplicates and activating only
  two useful governance loops.
- Agent errors were cleared for AID, COO, and SPA.
- RTE and DPM were resumed because their paused state was directly blocking
  active critical queues.
- `LUC-6595` was unblocked from a completed blocker; `LUC-6647` and `LUC-6641`
  were nudged because they unblock `LUC-6645` and `LUC-6637`.
- Remaining Soar blockers tied to `LUC-6331` should be treated as real until
  fresh evidence says `LUC-6331` is resolved.

## 2026-07-03 Source-Control And App Redeploy Gate

- Treat `Paperclip_Softwarehouse` as the Paperclip control-plane repo. Agent-built products are separate repositories, usually under `C:/Personal/Projekty/Aplikacje/<Application>`, and must be managed from their own repo root.
- For deploy-impacting product-app work, the done gate is: app repo identified, files classified, commit created or explicitly deferred, branch/upstream/push status known, Coolify redeploy observed when applicable, and production smoke/readiness evidence attached or recorded.
- `scripts/run-release-push-deploy-governor.mjs` is the preferred first check for multi-app release readiness. With no `SOFTWAREHOUSE_RELEASE_PROJECTS`, it discovers active app repos from `C:/Personal/Projekty/Aplikacje/APPLICATIONS_INDEX.csv`, filters for `.git`, and excludes the Paperclip repo and Paperclip worktrees.
- Current known app blocker: Soar was reported by the governor as `main...origin/main [ahead 9, behind 1]` with 31 dirty lines. Do not push or deploy Soar until dirty work is classified/committed and the branch is reconciled cleanly.
- Current repo caveat for this workspace: verify visible git metadata before promising commits/pushes. A later session observed no `.git` directory in the current checkout even though prior thread memory recorded local commits.

## 2026-07-03 Codex Watchdog Consolidation

Conversation summary and verified local automation state from the Paperclip
Softwarehouse autonomy work.

- Codex-level supervision for Paperclip should now converge on one automation:
  `check-paperclip-soar-autonomy` / `Paperclip Softwarehouse liveness
  watchdog`, scheduled every 480 minutes.
- The separate weekly `paperclip-autonomous-company-standards-review`
  automation was deleted after its review purpose was folded into the watchdog.
- The watchdog prompt now carries both operating liveness checks and strategic
  autonomous-company review. Future Codex should not assume the weekly review
  still exists.
- Human-in-the-loop means approve/decision tasks in Paperclip created by
  autonomous agent activity. Do not treat chat-only approval assumptions as
  durable owner gates.
- Expected watchdog artifacts:
  - `report/codex-automation/paperclip-liveness-watchdog.latest.md`
  - `report/codex-automation/paperclip-liveness-watchdog.latest.json`
  - `report/codex-automation/paperclip-teacher-lessons.latest.md`
  - `report/codex-automation/paperclip-teacher-lessons.latest.json`
- The watchdog should read `report/autonomous-cycles/latest.json` when present
  and carry forward useful lessons rather than losing already-spent audit work.
- Recovered lesson that must stay in the loop: close or classify local
  Paperclip OS source-control state before broad autonomous delivery. If the
  local state is dirty/diverged/stale, create or update one deduplicated
  closure lane instead of letting every cycle rediscover the same blocker.
- Current known issue linkage from the longevity doctor work:
  - `LUC-6985`: deduplicated repair lane created by
    `scripts/run-softwarehouse-longevity-doctor.mjs --apply`.
  - `LUC-3515`: Soar Coolify production deploy health sweep was in review
    without structured decision path and caused the doctor to warn.

Verification remembered from the automation consolidation session:

- `node --test scripts/softwarehouse-gate-specs.test.mjs` passed `82/82`.
- `node scripts/run-coolify-production-reconciler.mjs` reported `ready` with
  `8/8` resources and confirmed secret fallback loaded key names only, not
  secret values.
- `node scripts/configure-softwarehouse-longevity-routines.mjs` updated the
  internal Paperclip routines after company alias fixes.

Important guardrail: this memory stores no secret values. Future agents should
use configured secret references and legal/safe secret-delivery mechanisms, and
they should report missing access as a concrete configuration defect to repair.
