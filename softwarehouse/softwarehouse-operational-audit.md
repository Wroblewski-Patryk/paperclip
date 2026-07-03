# LuckySparrow Software House Operational Audit

Last updated: 2026-05-31

## Current Verdict

The softwarehouse now has an explicit operating-process layer. The core
hierarchy, Soar project manager, specialist lanes, local Codex adapter, Soar
workspace policy, PM no-stall routine, and Softwarehouse OS process routines
are configured. The Windows Codex probe path was repaired so adapter checks no
longer fail on missing `sh`. The current execution blocker is Codex runtime
authentication: agents should use local Codex login/session auth, but the shared
local Codex home does not currently expose an `auth.json` that Paperclip can
seed into managed agent homes.

## Live State Snapshot

| Area | Status | Notes |
| --- | --- | --- |
| Local Paperclip health | pass | Local API is healthy and restart is not required after the last restart. |
| Active pilot | pass | Soar is the active project; Softwarehouse OS is planned. |
| Project management | pass | Soar Project Manager owns Soar, runs no-stall control, and can delegate to shared specialists. |
| Specialist execution | active | PM spawned Delivery, Frontend, Integration, and Test Automation work from the no-stall routine. |
| Routine cadence | configured, governed | Five pilot routines stay active; the wider routine library stays paused unless a planned batch needs it. |
| Agent environment | active | Windows probe wrapper and local Codex auth path are configured; adapter health is checked by doctor and the daily governance routine. |
| Evidence memory | active | Docs/history/evidence patterns exist; process loops require docs/index/template feedback to remain aligned with Paperclip state. |
| Deployment safety | active with fail-closed scope | Coolify/VPS routines can run read-only with approved credentials; mutation remains blocked without explicit approval and evidence. |
| Security/account safety | active with fail-closed scope | Account, secret, API-key, and live-risk checks run through approved scopes and must redact secrets. |

## Perspective Coverage

| Perspective | Owner | Current Use | Improvement Needed |
| --- | --- | --- | --- |
| Portfolio | Portfolio Director | Keeps active-project focus and final truth. | Daily company control loop now owns project focus and escalation. |
| Project management | Soar Project Manager | Owns V1 target, queue pressure, blockers, and specialist delegation. | Keep no-stall routine active; add one PM per future active app. |
| Product | Product Lead | Owns acceptance, v0/v1/v2 shape, non-goals. | Run product readiness when PM needs scope decisions. |
| Architecture | CTO Architect | Owns cross-layer maps and no-regression contracts. | Should be woken by PM when repair lanes touch multiple layers. |
| Delivery | Engineering Delivery Lead | Splits PM findings into small owner lanes. | V1 controller/gap routines run every 2 hours during takeover. |
| Frontend/UX | Frontend Engineer + UX Visual Lead | Frontend work is active; UX is ready for polish gate. | UX polish must wait for route/workflow proof and UI state matrix. |
| Backend/Data | Backend API Engineer + Data Persistence Engineer | Backend known-state exists; data lane is still todo. | Data persistence scan should become a PM-prioritized lane before V1 closure. |
| Integration/runtime | Integration Trading Engineer + AI Agent Runtime Engineer | Trading/runtime lane is active; AI lane adapter passes but had stale error status. | Clear stale status and keep AI/runtime checks behind Delivery/Security gates. |
| QA/Test | QA Regression Lead + Test Automation Engineer | Test Automation is active from PM; QA lead has routine coverage. | Regression routine is active and should turn failures into owned repair lanes. |
| Security | Security Review Lead | Security routine and role exist. | Account/credential checks run with redaction and fail-closed mutation boundaries. |
| Ops/Deploy | Ops Release Lead | Coolify/VPS routine and role exist; LUC-47 is the concrete deploy blocker. Coolify must be treated as project -> environment -> resources, not one app id. | Coolify sweep is active for read-only status/deploy evidence; mutation requires approval. |
| Docs/Memory | Docs Memory Lead | Maps, ledgers, template feedback patterns exist. | Map drift and weekly retrospective loops now own process/template feedback. |
| Talent/Capability | Portfolio Director + CTO Architect + Docs Memory Lead | Evidence-backed role/process improvement loop exists. | Repeated failures should produce capability gap notes, not broader prompts or uncontrolled new agents. |

## Gaps Found

1. Most routines existed without schedule triggers. This made them documented
   intentions rather than real automation. They should have schedules even when
   paused so activation is one state change, not fresh configuration work.
2. Daily PM status was still paused despite adapter smoke tests passing. The
   project needs a daily state heartbeat separate from the aggressive no-stall
   loop.
3. Agent status can become stale after a failed run, but current failures are
   real auth failures until local Codex login or explicit API-key auth is valid.
4. Role coverage is implemented, but operating maturity depends on issue
   dispositions. Every run must leave Paperclip state aligned with its comment.
5. Future projects need copied project-manager pattern before activation, not
   after work starts.
6. Company-level process routines now exist, but must prove over multiple
   cycles that they reduce stale issue state instead of creating noise.
7. Codex auth must be treated as a first-class runtime dependency. If it fails,
   the company can plan and display structure, but cannot execute autonomous
   agent work.
8. Repeated operational failures need a capability-gap loop so the softwarehouse
   can split roles, sharpen instructions, or retire weak boundaries without
   creating broad uncontrolled agents.
9. Closed issues can retain short live-run tails after Paperclip marks the
   issue done or cancelled. The live-run janitor now gives agents a bounded
   tool-first cleanup path before they write broad status comments.

## Activation Policy

| Routine | Desired State Now | Reason |
| --- | --- | --- |
| `[Soar][PM] No-stall queue expeditor` | active, every 30 minutes | Keeps the queue moving and creates/reassigns narrow work; stale `in_progress` issues with no active run must be closed, blocked with an unblock action, returned to `todo`, or restarted with the responsible specialist. |
| `[Soar] Daily project status refresh` | paused library | Run manually or temporarily activate when a daily PM truth refresh is needed. |
| `[Soar] V1 audit-to-completion controller` | active, every 4 hours | Delivery reconciles specialist work upward to PM and splits unresolved gaps downward to one-owner tasks. |
| `[Soar] Gap register and repair lane refresh` | paused library | Converts failed proof, stale issue drift, and audit findings into owned repair lanes when activated for a planned batch. |
| `[Soar] Regression evidence sweep` | paused library | Keeps the baseline fresh and turns failures into repair issues when activated for a planned batch. |
| `[Soar] Autonomous idle and map drift sweep` | paused library | Checks whether the project is truly idle/monitoring or only stalled behind missing map/evidence updates. |
| `[Soar] Coolify production deploy health sweep` | active, every 6 hours | Approved Coolify scope exists; Ops checks production state read-only and keeps deploy evidence current. |
| `[Soar] Security and account-access gate sweep` | paused library | Approved app/Coolify access exists; Security checks account, secret, subscription, and live-risk boundaries without leaking secrets when activated. |
| `[Soar] Commercial/legal readiness review` | paused with schedule | Not part of technical softwarehouse loop unless requested. |
| `[Softwarehouse] Template feedback sweep` | paused library | Pulls reusable Soar operating lessons back into `!template` when activated. |
| `[Softwarehouse] Daily company control loop` | paused library | Portfolio checks active-project focus, blockers, and routine output when activated. |
| `[Softwarehouse] Stale board janitor` | active, hourly | Runs `node scripts/run-live-run-janitor.mjs` first for named closed-issue live-run tails or governor self-supervision loops, then repairs stale `in_progress`, missing owner, missing unblock, and done-without-proof states. |
| `[Softwarehouse] Agent health and model governance` | active, daily | Verifies adapter health, model policy, Spark drift, and stale agent errors. |
| `[Softwarehouse] Project intake and index sync` | paused library | Keeps portfolio index and Paperclip project state aligned without starting non-pilot work when activated. |
| `[Softwarehouse] Release and deploy governance audit` | paused library | Checks commit/push/deploy hygiene, Coolify/VPS posture, rollback, and smoke gates when activated. |
| `[Softwarehouse] Weekly retrospective and SOP update` | paused library | Turns stalls and repeated fixes into process, instruction, and template improvements when activated. |
| Talent/capability loop | paused library/process | Produces capability gap notes, role proposals, onboarding gates, and measured trials when repeated failures show missing ownership. |

## Runtime Auth Gate

- Preferred mode is local Codex login. Paperclip should not bind
  `OPENAI_API_KEY` to every agent unless explicit API-key billing is desired.
- `scripts/configure-softwarehouse-local-codex-auth.mjs` removes API-key
  bindings and lets Paperclip seed managed `CODEX_HOME` from local Codex auth.
- Local Windows Codex probes now use the managed `CODEX_HOME` path instead of a
  Unix `sh` wrapper.
- Critical blocker issue: `[Softwarehouse][Blocker] Configure OpenAI runtime
  auth for Codex agents`.
- Do not clear agent `error` statuses or rely on routines as live execution
  until one harmless Codex adapter smoke test passes; then run
  `scripts/repair-softwarehouse-codex-auth.mjs`.

## Next Best Improvements

1. Add one project-manager template for future apps so new active projects get a
   PM before specialist work begins.
2. Let PM create periodic "state checkpoint" issues that summarize which
   specialist lanes are active, blocked, or safe to pause.
3. Add credential-readiness checklists for Coolify and production test accounts
   before activating Ops/Security routines. For Soar, the Coolify checklist must
   include project id, production environment, application resources, Postgres,
   Redis, deploy/log/read permissions, and mutation permissions separately.
4. Keep commits small: one Paperclip configuration change per operational
   behavior change, and separate Soar application code commits from Paperclip
   operating-system commits.

## 2026-05-28 Delta (LUC-501 Docs/Memory Loop)

Audit evidence source: `node scripts/audit-luckysparrow-softwarehouse.mjs`

### Status Delta

- `rootPortfolioDrift` is `[]` (implemented and verified).
- `staleInProgressIssues` is `[]` (implemented and verified).
- `agentsWithMultipleLiveRuns` is `[]` (implemented and verified).
- Softwarehouse operating posture is
  `project_repo_mutation_blocked_monitoring_allowed` (implemented and verified).

### Current Gate Reality

- Soar protected/project-repo mutation remains blocked behind stale gate-owner
  facts rooted at `LUC-241` and `LUC-413` (implemented and verified).
- The audit reports one critical control-loop finding requiring fail-closed
  gate-wait posture enforcement during protected work (implemented and verified).
- Active routines are currently Softwarehouse control/doctor/janitor/governance
  loops; Soar project routines are paused (implemented and verified).

### Docs/Memory Actions

1. Keep this audit as historical baseline plus deltas; avoid wholesale rewrites.
2. Record each docs-memory heartbeat in `docs/status/` with exact evidence
   commands and date.
3. Route gate-owner follow-up to the responsible blocker owners; do not mutate
   protected project repos while posture is blocked.

## 2026-05-31 Delta (LUC-875 Docs/Memory Loop)

Audit evidence source: `node scripts/audit-luckysparrow-softwarehouse.mjs`

### Status Delta

- `overall` is `warn` due to source-control closure warning (implemented and
  verified).
- `effectiveOperatingPosture` is `operating_system_closure_required`
  (implemented and verified).
- `deliveryPermission.canStartNewLane` is `false` and permits
  `supervision_only` lanes (implemented and verified).
- `rootPortfolioDrift` remains `[]` (implemented and verified).

### Current Gate Reality

- Control loop indicates existing live work must be supervised before new lane
  starts (implemented and verified).
- One Paperclip OS repo warning remains: unclassified dirty files require
  closure/classification evidence before broader delivery posture can be lifted
  (implemented and verified).

### Docs/Memory Actions

1. Added dated evidence note:
   `docs/status/2026-05-31-luc-875-docs-memory-loop.md`.
2. Preserved additive delta-only update style to maintain audit continuity.

## 2026-05-31 Delta (LUC-1076 Docs/Memory Loop)

Control evidence source: `pnpm softwarehouse:control-tick`
(`generatedAt: 2026-05-31T12:01:34.324Z`)

### Status Delta

- `controlDecision` is `blocked_needs_triage` (implemented and verified).
- `effectiveOperatingPosture` is
  `project_repo_mutation_blocked_monitoring_allowed`
  (implemented and verified).
- `deliveryPermission.canStartNewLane` is `false`; allowed lane types are
  monitoring-safe only (implemented and verified).
- `operatorActionPacket.status` is
  `operator_input_or_gate_evidence_needed` (implemented and verified).
- Source-control packet reports clean repos for Paperclip_Softwarehouse, Soar,
  Roost, Aviary, and Nest (implemented and verified).

### Current Gate Reality

- Soar gate root `LUC-241` remains blocked and awaits one accepted fresh gate
  fact before a single approved protected recheck (implemented and verified).
- Roost gate root `LUC-261` is marked stale (`~8.32h` wait at control-tick
  time) with explicit owner action to refresh accepted credential/gate evidence
  or keep blocker closure explicit (implemented and verified).
- Architecture lifecycle summary still flags missing/stale export sets for Soar
  and Nest, which should remain visible in memory state until owner lanes
  refresh them (present in control output, behavior unknown).

### Docs/Memory Actions

1. Added dated evidence note:
   `docs/status/2026-05-31-luc-1076-docs-memory-loop.md`.
2. Preserved additive delta-only update style and blocker-owner traceability
   language instead of broad status-sync commentary.

## 2026-06-01 Delta (LUC-1283 Docs/Memory Loop)

Audit evidence source: `node scripts/audit-luckysparrow-softwarehouse.mjs`

### Status Delta

- `overall` is `fail` (implemented and verified).
- Local API health reports `restartRequired: true` with `reason: backend_changes`
  (implemented and verified).
- Issue-state summary is `blocked=48`, `in_progress=2`, `in_review=2`, `todo=2`
  (implemented and verified).
- `agentsWithMultipleLiveRuns` is non-empty and flags one PM with two live runs
  (`LUC-1286`, `LUC-1284`) (implemented and verified).

### Current Gate Reality

- Control posture remains fail-closed; routine memory should not present a
  healthy/idle narrative while critical WIP governance findings are active
  (implemented and verified).
- Audit still reports `in_review` issues lacking structured decision paths; this
  remains an operating-process gap requiring owner disposition
  (implemented and verified).

### Docs/Memory Actions

1. Added dated evidence note:
   `docs/status/2026-06-01-luc-1283-docs-memory-loop.md`.
2. Preserved additive delta-only history update style in this audit document.

## 2026-06-11 Delta (LUC-3331 Docs/Memory Loop)

Control evidence source: `pnpm softwarehouse:control-tick`
(`generatedAt: 2026-06-11T02:37:37.218Z`)

### Status Delta

- `controlDecision` is `supervise_active_runs` (implemented and verified).
- `controlBrief.autonomyDisposition` is `source_control_closure_allowed`
  (implemented and verified).
- `deliveryPermission.canStartNewLane` is `true`; allowed lane types are
  `source_control_classification`, `local_validation`, and
  `local_commit_closure` (implemented and verified).
- `deliveryPermission.protectedDeliveryAllowed` is `false`, so protected smoke,
  push, deploy, restart, production mutation, and secret disclosure remain
  forbidden (implemented and verified).
- Dirty controlled project worktrees remain `Soar=247`, `Roost=40`, and
  `Nest=28` (implemented and verified).
- Softwarehouse audit summary remains `overall = fail` because agent error
  state, unowned issues, and Coolify/runtime binding gaps still require owner
  action (implemented and verified).

### Current Gate Reality

- Local source-control closure is allowed, but only through classified local
  owner lanes with evidence; it is not approval to push or mutate production
  (implemented and verified).
- The control tick created or preserved explicit access/unblock lanes:
  `LUC-1397`, `LUC-1368`, `LUC-3390`, `LUC-3391`, and `LUC-2559`
  (implemented and verified).
- Five live runs were present during the tick, so routine output should
  supervise rather than duplicate running work (implemented and verified).

### Docs/Memory Actions

1. Added dated evidence note:
   `docs/status/2026-06-11-luc-3331-docs-memory-loop.md`.
2. Preserved additive delta-only history update style and kept the distinction
   between local source-control closure and protected delivery gates explicit.

## 2026-06-11 Delta (LUC-3464 Docs/Memory Loop)

Control evidence source: `pnpm softwarehouse:control-tick`
(`generatedAt: 2026-06-11T12:52:43.808Z`)

Retry refresh source: `pnpm softwarehouse:control-tick`
(`generatedAt: 2026-06-11T12:57:15.461Z`; `reusedExistingTick=true`)

Continuation refresh source: `pnpm softwarehouse:control-tick`
(`generatedAt: 2026-06-11T13:00:50.676Z`; `reusedExistingTick=true`)

Final heartbeat refresh source: `pnpm softwarehouse:control-tick`
(`generatedAt: 2026-06-11T13:07:07.433Z`; `reusedExistingTick=true`)

### Status Delta

- `controlDecision` is `supervise_active_runs` (implemented and verified).
- `effectiveOperatingPosture` is `operating_system_closure_required`
  (implemented and verified).
- `postureConsistent` is `true` (implemented and verified).
- `controlBrief.autonomyDisposition` is `operating_system_closure_required`
  (implemented and verified).
- `deliveryPermission.canStartNewLane` is `false`; the only allowed lane type
  is `paperclip_os_closure` until Paperclip OS changes are verified and closed
  (implemented and verified).
- `deliveryPermission.protectedDeliveryAllowed` and
  `projectRepoMutationAllowed` are both `false`, so protected smoke, push,
  deploy, restart, production mutation, project repo mutation, and secret
  disclosure remain forbidden (implemented and verified).
- Dirty controlled project worktrees remain `Soar=279`, `Roost=41`,
  `Aviary=13`, and `Nest=28` (implemented and verified).
- Retry refresh reports dirty controlled project worktrees as `Soar=281`,
  `Roost=41`, `Aviary=13`, and `Nest=28` (implemented and verified).
- Architecture lifecycle reports stale exports for Paperclip, Roost, and Nest,
  while Soar and Aviary exports are fresh (implemented and verified).

### Current Gate Reality

- The company is supervising active live runs, not idle
  (implemented and verified).
- Retry refresh reports `activeRunCount=6` and `liveRunCount=6`; the company
  remains in supervised live-work posture, not idle (implemented and verified).
- Continuation refresh reports `activeRunCount=7` and `liveRunCount=7`; the
  company remains in supervised live-work posture, not idle (implemented and
  verified).
- Final heartbeat refresh reports `activeRunCount=6` and `liveRunCount=6`; the
  company remains in supervised live-work posture, not idle (implemented and
  verified).
- Current recommended action is to supervise live work and not apply
  `node scripts/run-gate-freshness-watcher.mjs --apply` while active runs
  remain, despite two fresh gate recheck candidates (implemented and verified).
- Broad delivery cannot start a new lane until Paperclip OS closure is handled;
  source-control closure lanes remain evidence in the operator packet, not the
  current lane-start authority (implemented and verified).
- Full delivery remains blocked by `Soar: Soar Project Manager is in error
  status` and `Soar: open issues without assignee` (implemented and verified).
- Runtime-binding repair still needs manual owner attention for `LUC-3443` and
  `LUC-3452` (implemented and verified).
- Continuation refresh reports one runtime-binding manual assignment need for
  `LUC-3443` with missing `coolify` binding group (implemented and verified).
- Final heartbeat refresh reports runtime-binding manual assignment needs for
  `LUC-3443` and `LUC-3471` (implemented and verified).
- Operator packet source-control gates remain `LUC-2361`, `LUC-2353`, and
  `LUC-402`; these remain closure evidence for the owning source-control lanes,
  not permission for protected delivery (implemented and verified).

### Adapter Failure Reality

- The previous `LUC-3464` run failed before producing work because managed
  Codex auth symlink creation hit `EEXIST` (implemented and verified from the
  wake payload).
- The duplicate company-scoped Codex `auth.json` was inspected without printing
  secret contents; a hash-guarded symlink repair was attempted and blocked by
  Windows elevation requirements, then restored the original file
  (blocked by error with safe rollback).

### Docs/Memory Actions

1. Added dated evidence note:
   `docs/status/2026-06-11-luc-3464-docs-memory-loop.md`.
2. Preserved additive delta-only history update style.
3. Kept Codex auth repair routed to Runtime/CTO evidence instead of treating a
   docs checkpoint as a credential mutation lane.
4. Refreshed the retry evidence after the process-lost adapter failure and
   preserved the same fail-closed posture.
5. Refreshed continuation evidence at 13:00 UTC and preserved the same
   fail-closed posture with the updated live-run count and runtime-binding
   assignment fact.
6. Refreshed final heartbeat evidence at 13:07 UTC and closed the docs/memory
   checkpoint as durable evidence instead of continuing high-churn status sync.

## 2026-06-30 Delta (LUC-6427 Docs/Memory Loop)

Control evidence source: `pnpm softwarehouse:control-tick`
(`generatedAt: 2026-06-30T16:32:36.815Z`)

### Status Delta

- `ok` is `false` (blocked by error).
- `controlDecision` is `control_tick_failed` (blocked by error).
- `effectiveOperatingPosture` is `control_tick_failed` (blocked by error).
- `postureConsistent` is `true` (implemented and verified).
- `activeRunCount` and `liveRunCount` are both `0`, but the tick failed before
  deeper audit, source-control, architecture, and gate checks could run
  (present in report, behavior unknown).

### Current Gate Reality

- The failed tick's `controlBrief` includes delivery-allowed fields, but those
  are not sufficient operating proof because the required `liveRunJanitor` step
  failed first (blocked by error).
- `liveRunJanitor` failed after `262ms` with `ECONNREFUSED 127.0.0.1:54345`
  while connecting to the embedded Postgres endpoint (blocked by error).
- The local Paperclip API was not healthy through the agent path during this
  heartbeat: `http://127.0.0.1:3200/api/health` timed out and
  `http://localhost:3100/api/health` refused connection (blocked by error).

### Docs/Memory Actions

1. Added dated evidence note:
   `docs/status/2026-06-30-luc-6427-docs-memory-loop.md`.
2. Updated `.agents/state/active-mission.md` with the current blocked
   checkpoint and restore/rerun action.
3. Preserved fail-closed status: restore or restart the local Paperclip DB/API
   path, then rerun `pnpm softwarehouse:control-tick` before trusting the
   failed tick's apparent delivery-allowed fields.
