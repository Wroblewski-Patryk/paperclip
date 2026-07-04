# Active Mission

## 2026-07-04 Stage 1 Hard Delivery And Company Proof

The active mission has moved beyond Stage 0 setup. Paperclip is now being used
as the operating control plane for a first practical proof of LuckySparrow as an
autonomous softwarehouse.

Hard delivery parent:

- `LUC-25`: `00 General: Deliver Soar and Roost to Usable VPS Production`.
- Critical children:
  - `LUC-26`: delivery control.
  - `LUC-27`: Soar build-to-production execution.
  - `LUC-28`: Roost build-to-production execution.
  - `LUC-29`: technical implementation routing and repo execution.
  - `LUC-30`: VPS/Coolify deployment execution path.
  - `LUC-31`: production readiness verification.
  - `LUC-32`: security, secrets, and production safety gate.

Mission interpretation:

- This goal is not only about two apps. It is the first full-company proof that
  Paperclip agents can behave like a human softwarehouse: clear roles,
  authority, responsibility, least-privilege access, evidence, review,
  deployment discipline, owner-facing escalation, and learning loops.
- Do not allow `LUC-25` to close for plans, preflight reports, or task-tree
  creation. Done requires Soar and Roost to be created, verified, deployed to
  VPS, and usable by the owner.
- Active scope is Soar/Roost app creation and delivery. Marketing, sales,
  customer service, unrelated client work, and parked product work for
  Featherly/Aviary/Nest remain out of scope unless the owner explicitly expands
  the mission.
- VPS/Coolify deployment is part of the target outcome. Still preserve gates
  for raw secrets, destructive infrastructure actions, paid features,
  legal/customer/finance commitments, and LIVE trading/order proof.
- Owner-facing decisions, blockers, and summaries should go through `00 AIA` in
  Polish. Internal reports and evidence may remain English-first.

Active app-factory core:

- `00 AIA`, `01 CSO`, `02 CPO`, `02 UID`, `02 UXW`, `02 WPM`, `04 COO`,
  `04 DPM`, `04 DSM`, `06 AIM`, `07 CFO`, `08 CAO`, `09 CTO`, `09 TSA`,
  `09 CBE`, `09 FEW`, `09 DBE`, `09 IDE`, `09 RTE`, `09 TAE`, `09 QVE`,
  `09 CRS`, `09 DRE`, `10 CLO`, `10 SPA`, `11 CINO`, `11 IPM`, `11 SPM`,
  and `11 RPM`.

Paused/out of scope unless separately approved:

- `03 CRO`, `05 CCO`, `05 CSM`, `06 CHRO`, `06 POP`, `11 APM`, `11 FPM`,
  `11 NPM`, and `12 CEO`.

## 2026-07-04 Stage 0 Softwarehouse Foundation

Current durable mission shifted to Stage 0 after the local Paperclip instance
was reset to a nearly clean state. Before enabling autonomous agents, configure
LuckySparrow Software House so it can work with less noise and better evidence.

Verified current instance:

- Base URL: `http://127.0.0.1:3200`.
- Company: `LuckySparrow`, id `ae26bb8b-8f5f-4a85-b341-78d4e1985975`, prefix
  `LUC`.
- Current board state is intentionally quiet: 38 agents, 6 projects, 0 issues,
  4 planned goals, 10 paused routines, 0 live runs, 18 company skills, 29
  company secrets.
- All 38 agents are intentionally paused for Stage 0 quiet mode. Do not resume
  agents until the owner approves Stage 1 or explicitly asks for a targeted
  unpause.
- Company skills are attached by role through desired-skill sync.
- Managed agent instruction bundles are present for all 38 agents and verified
  through the Paperclip instruction-bundle API with no warnings.
- Agent learning is configured as a governed packet/review loop at individual,
  department, and company levels. Agents may not self-edit their own
  instructions, skills, permissions, or routines.
- Only `06 AIM (AI Agent Manager)` has `permissions.canCreateAgents: true`.
  This agent is the department 06 governed AI-agent hiring manager.
- Department-owned work objects should use the canonical prefix convention
  `NN NazwaDziału - ...`; the source of truth is
  `.agents/state/softwarehouse-departments.md`.
- Projects are normalized to English department names:
  `00 General: Softwarehouse`, `11 Innovation: Soar`,
  `11 Innovation: Roost`, `11 Innovation: Aviary`,
  `08 Assets: Paperclip Worktrees`, and
  `00 General: WroblewskiPatryk`.
- Goals are normalized to English department names:
  `00 General: v0 Softwarehouse Readiness`,
  `11 Innovation: Stage 1 Soar Activation`, and
  `11 Innovation: Stage 1 Roost Activation`.
- Routines are normalized to English department names with the paused form:
  `NN Department - v1 Draft Paused - Element`; all 10 remain paused with disabled
  triggers.
- Runtime still contains old instruction/runtime folders for the previous
  company id `f13051a7-d0aa-4261-9254-d3ab90735de5`; do not blindly reuse them
  because agent ids differ.
- Secret provider `local_encrypted` is configured, but health warns the local
  key file permissions are `666`; AWS/GCP/Vault are not configured. Strict mode
  is enabled in `.paperclip/config.json`, and required secret names are tracked
  in `.agents/state/softwarehouse-secret-requirements.md`.
- Coolify Stage 0 base/login/read/deploy credentials, LuckySparrow team
  id/name, Soar resource ids, Roost app id, Soar/Roost production URLs, and
  Soar/Roost production test accounts are stored as Paperclip managed secrets.
  Coolify read/resource refs go to 16 deploy-capable or coordinating agents.
  Coolify login/deploy refs are restricted to `00 AIA`, `09 CTO`, `09 DRE`,
  `10 SPA`, and `12 CEO`. The Coolify read token was tested against live API
  endpoints.
- Resource access matrix is tracked at
  `.agents/state/softwarehouse-resource-access-matrix.md`.
- Product architecture index is tracked at
  `.agents/state/softwarehouse-product-architecture-index.md`; Soar/Roost work
  must begin with repo-specific `docs/architecture` source-of-truth checks.
- Autonomous delivery architecture is tracked at
  `.agents/state/softwarehouse-autonomous-delivery-architecture.md`; Stage 1
  work must follow parent/child reporting, duplicate prevention, PDCA,
  commit/push/Coolify/production-smoke closure, and governed learning packets.
- Architecture gap analysis is tracked at
  `.agents/state/softwarehouse-architecture-gap-analysis.md`; current guidance
  is to use controlled activation of existing agents before hiring new roles.
- Procedure system and task lifecycle contract are tracked at
  `.agents/state/softwarehouse-procedure-system.md` and
  `.agents/state/softwarehouse-task-lifecycle-contract.md`; Stage 1 agents must
  create/update tasks only through goal/procedure/parent/child/evidence/retro
  chains.
- Owner interface contract is tracked at
  `.agents/state/softwarehouse-owner-interface-contract.md`; owner-facing
  direct communication should go through `00 AIA` in Polish, with clear
  decision packets, while internal company reports, evidence, and cross-agent
  work may remain English-first.
- Recommended first Stage 1 action is tracked at
  `.agents/state/softwarehouse-stage1-recommended-first-action.md`: controlled
  Soar dry run before broad agent activation.
- Resource policy is tracked in `.agents/state/softwarehouse-resource-policy.md`:
  no paid GitHub plan is available, so Stage 1 agents must not assume paid
  GitHub features, paid Actions capacity, Advanced Security, paid runners,
  enterprise-only controls, paid GitHub AI features, or notification-heavy
  email-generating automation.
- Cost/token policy is tracked in
  `.agents/state/softwarehouse-cost-token-policy.md`: Paperclip exposes
  budget/cost/quota surfaces and Codex quota windows, but hard company/agent
  budgets are not configured yet. Stage 1 should start with a controlled dry
  run and then decide budget limits from evidence.
- Agent role readiness is tracked in
  `.agents/state/softwarehouse-agent-role-readiness-audit.md`: 38/38 agents
  have role scopes, Big Five-style working profiles, and shared context refs,
  but readiness is estimated at about 94% rather than 100% until runtime,
  skill, cost, and behavior calibration are proven.
- Long-horizon app portfolio is Soar, Roost, Featherly, Aviary, and Nest.
  During Stage 0 and initial Stage 1, only Soar and Roost are active.
  Featherly, Aviary, and Nest remain parked; do not create Paperclip work for
  them until they are on VPS and the owner activates them.
- V1 goals/routines readiness is tracked in
  `.agents/state/softwarehouse-v1-goals-routines-audit.md`: the Stage 1
  controlled activation dry-run goal exists, Soar/Roost activation goals are
  linked under it, 9 V1 draft routines are paused, and all routine triggers are
  disabled.
- Innovation-to-product lifecycle is tracked in
  `.agents/state/softwarehouse-innovation-to-product-lifecycle.md`: app
  projects live in `11 Innovation` while they are being validated, then move to
  `02 Product` once usable, supportable, deployable, and ready to sell or grant
  access.
- Agent activation governance is tracked in
  `.agents/state/softwarehouse-agent-activation-governance.md`: `00 AIA` owns
  activation decisions and task routing, has `canAssignTasks: true`, but normal
  agent access cannot directly resume/pause agents. Actual lifecycle changes
  require owner/Codex board action or an approved activation bridge.
- Owner direction/proposal loop is tracked in
  `.agents/state/softwarehouse-owner-direction-proposal-loop.md`: the owner
  provides direction/notes/approvals, AIA consolidates Polish proposals or
  questions, and approved execution flows through the company hierarchy.
- Overall complementarity audit is tracked in
  `.agents/state/softwarehouse-complementarity-audit.md`: current Stage 0
  estimate is about 97%, with remaining proof deferred to a controlled Stage 1
  dry run.
- Goal/routine governance is tracked in
  `.agents/state/softwarehouse-goal-routine-governance.md`: AIA owns intake and
  routing, CEO owns company-level fit/priority, COO owns routine/process
  coherence, department owners own department goals/routines, and owner approval
  gates Stage 1 activation and high-risk changes.
- Paperclip operating mechanics are tracked in
  `.agents/state/softwarehouse-paperclip-operating-mechanics.md`: agents must
  understand paused/wakeup behavior, routine triggers, goal/project/issue
  hierarchy, evidence/artifact gates, approval paths, and that the V1 dry run is
  a controlled activation-and-monitoring proof rather than broad autonomy.

Stage 0 gates live in `.agents/state/softwarehouse-stage0-foundation.md`.
Codex in this chat should drive v0 directly and must not create Paperclip
issues/tasks for Paperclip agents unless the owner explicitly asks.
The owner has approved creating routines only as non-running assets: routine
`status: paused` with triggers `enabled: false`. Do not start broad autonomous
work until secrets policy/value entry, Soar/Roost activation gates, and full
backup/export evidence are ready enough for a board-approved Stage 1 start.
Current v0 coverage audit lives at
`.agents/state/softwarehouse-v0-readiness-audit.md`; draft Stage 1 activation
packets live at `.agents/state/stage1-activation-soar.md` and
`.agents/state/stage1-activation-roost.md`.

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
