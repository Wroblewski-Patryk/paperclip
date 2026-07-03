# Next Steps

Last updated: 2026-07-03

## Paperclip Softwarehouse

- Keep active app defaults focused on `Soar` and `Roost`. If a future app is
  reopened, first update portfolio/board decision state, then enable project
  routines and lifecycle/app-completion indexes intentionally.
- Use the app-completion index as the PM/QA queue for "what can a real user
  actually do?" Do not let agents close work without frontend/backend/config/
  auth/subscription/integration/browser evidence when user-visible.
- Continue using the loop:
  `PM user-flow map -> CTO/API/config map -> UX/frontend map -> specialist build -> browser proof -> QA/PM review -> Docs/index update`.
- Keep review handoff packets short and decision-ready: files changed, proof,
  browser screenshots/clickthrough when relevant, subscription/configuration/
  integration impact, residual risk, and next owner.
- Use the consolidated Codex watchdog output to propose or apply at most a few
  practical operating improvements per run. Strategic standards review now
  lives inside that watchdog, not in a separate weekly automation. Do not
  implement broad org/process changes automatically without owner acceptance.
- When a recommendation needs Patryk's decision, have Paperclip create an
  owner approve/decision task with context, recommendation, alternatives,
  consequence of doing nothing, and what work resumes after approval. Do not
  rely on chat-only human-in-the-loop state.

## Runtime / Operations

- Before Paperclip restart:
  1. call `http://127.0.0.1:3200/api/health`;
  2. call company live-runs endpoint;
  3. wait for `activeRunCount=0` and `liveRuns=[]`;
  4. restart only the process serving port `3200`;
  5. verify `/api/health`, `/`, `/api/companies`, live-runs, agent/project/
     routine counts, and duplicate active routines.
- If `restartRequired=true` appears again, prefer safe idle restart over
  killing active runs.
- If the browser shows nothing or only `database_unreachable`:
  1. call `/api/health` and `/api/companies`;
  2. inspect the visible DOM/console before assuming a frontend cache bug;
  3. check whether `127.0.0.1:54345` is listening;
  4. inspect `.paperclip/runtime/logs/server.log` for `ECONNREFUSED 127.0.0.1:54345`;
  5. check `.paperclip/runtime/db/postmaster.pid` before manually starting Postgres;
  6. after recovery, hard reload or use a fresh query string.
- If agents appear idle, inspect dashboard/live-runs and run
  `pnpm softwarehouse:control-tick` before assuming the scheduler is broken.
  Idle can be normal when agents are wakeup/routine driven or the autonomy
  governor is supervising/blocking duplicate work.
- Runtime improvement TODO: make Paperclip/dev-runner report or recover the
  "web server alive, embedded Postgres dead" state more clearly so the board
  does not degrade to a terse `database_unreachable` page.

## Memory / Repo Hygiene

- Use `.agents/skills/paperclip-project-memory/SKILL.md` for future memory
  updates. It is present as of 2026-07-03.
- `.agents/state/` was created for Paperclip_Softwarehouse using the same
  state-file convention as Soar/Roost.

## Queue Hygiene

- Confirm the heartbeat queued-wakeup coalescing change is committed or
  otherwise preserved before relying on it in future work.
- Recheck fresh `heartbeat-runs` and `live-runs` before declaring the dashboard
  healthy; historical `process_lost` and `adapter_failed` runs existed before
  the cleanup.
- Do not mechanically unblock Soar lanes blocked by `LUC-6331`.

## Watchdog Follow-Up

- On the next supervision pass, verify that the single active Codex automation
  writes/updates `report/codex-automation/paperclip-liveness-watchdog.latest.*`
  and `report/codex-automation/paperclip-teacher-lessons.latest.*`.
- Verify that the watchdog reports `strategic standards review` and
  `approve-task routing` in its evidence section when relevant.
- Confirm whether the recovered source-control closure lesson has been
  resolved, routed to one deduplicated closure lane, or still blocks broad
  autonomous delivery.
- Track `LUC-6985` and `LUC-3515` until the longevity doctor no longer warns
  on those paths.
