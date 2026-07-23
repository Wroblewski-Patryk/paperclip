# Softwarehouse Operating Processes

This file is the process registry for LuckySparrow Software House. It defines
the recurring company loops that keep projects moving without manual nudges.

The canonical lightweight operating standard for the department lives in
`docs/softwarehouse/`. Agents must use that standard for PDCA, APQC-style
process classification, Definition of Ready, Definition of Done, quality gates,
handoffs, security, release gates, ADRs, work reports, and continuous
improvement.

The current company target and priority policy live in
`docs/softwarehouse/15-autonomous-company-target.md`. This target is the tie
breaker when routines, project managers, or specialists must choose between
Soar, Roost, and Softwarehouse/system work.

The operating rule is:

`portfolio truth -> project control -> delivery split -> specialist work -> verification -> release gate -> memory -> portfolio truth`

The target closed-loop architecture is described in
`softwarehouse/autonomous-development-loop.md`. That document defines the
30-minute autonomous cycle, cycle ledger, work packet gate, release ledger,
monitoring continuation, learning outputs, and future Roost truth adapter.

Current posture:

- V1 local target: Soar and Roost are both active application completion lanes.
  Paperclip must keep their indexed known-state, event-chain, runtime-error,
  operational-readiness, project-truth, source-control, verification, and docs
  loops moving until each remaining gap is proven done, delegated, deferred, or
  blocked with owner/action.
- Soar is the first active sellable application lane. It owns production build
  provenance, protected smoke/auth proof, deploy/rollback evidence,
  security/QA evidence, and inspectable work products before sales claims.
- Roost/companycore is the second active sellable application lane. It should
  continue local implementation, known-state, source-control closure,
  project-truth gap repair, and milestone evidence in parallel with Soar when
  the work is owner-scoped and does not require protected production mutation.
  V2.1 Paperclip/Roost integration waits until Roost itself is working and the
  bridge boundary is accepted.
- V2.2 moves Paperclip to a dedicated VPS for server-side app creation and
  Coolify-mediated production deploys. Until then, local Paperclip remains the
  controller and VPS/Coolify facts are gated deploy evidence.
- V3 opens additional application projects after the Soar/Roost local+deploy
  loop proves it can run without silent idle, duplicate churn, or hidden
  blockers.
- Featherly, Nest, Aviary, LuckySparrow.ch, OpenJarvis, Obiekty, Paperclip
  product work, and other portfolio experiments are backlog/archived unless
  the board explicitly reopens them.
- Routines and managers must avoid churn: reuse canonical active issues,
  ignore status-sync-only wakeups, let janitor clean done/cancelled/in-review
  tails, and treat protected production gates as valid blocked outcomes until a
  fresh operator/credential fact or explicit board approval exists.
- Push, deploy, restart, secrets, paid/live accounts, destructive filesystem
  work, and irreversible production mutation remain explicitly gated for every
  project.

## Process Classes

Every issue should map to one process class from this file or from
`docs/softwarehouse/01-process-map.md`. If the process class is unclear, the
issue is in DISCOVERY until Product/PM/Portfolio can classify it.

| Process | Owner | Cadence | Purpose | Output |
| --- | --- | --- | --- | --- |
| Company control loop | Portfolio Director | Daily | Decide active project focus, blocked state, and whether routines are producing useful movement. | Company status comment, escalations, next project-level decisions. |
| Architecture awareness graph sync | CTO Architect + Docs Memory Lead | Every 6 hours during active takeover | Keep canonical entities, relations, statuses, owners, dependencies, and proof links synchronized. | Graph exports, architecture health report, task/entity gap list. |
| App completion and browser review loop | Product Manager + UX/Frontend + QA | Every active version checkpoint | Convert architecture entities into user-facing flows, then prove whether each flow works in code, browser, configuration, auth, subscription, and integrations. | `app-completion-index`, screenshots/clickthrough proof, frontend/backend/config repair issues, review handoff. |
| App lifecycle intake | Portfolio Director + Product Manager + CTO Architect | When taking over or creating an app | Decide whether the app is takeover, repair, or greenfield; produce the minimum business/product/architecture/work-packet context before coding. | App lifecycle brief, active/deferred decision, known-state or greenfield plan, first worker-ready lanes. |
| Known-state harvester | Project Manager + Portfolio Director | Every control tick when no live work blocks it | Wake projects that are not understood yet, collect evidence, classify works/fails/unknown, and create narrow follow-ups before coding. | Project evidence lane, gap list, owner/proof follow-up issues. |
| Project no-stall loop | Project Manager | 30 minutes during active takeover | Keep the active project queue moving; no stale `in_progress` without live run. | Woken/reassigned/split/deferred/blocked issues. |
| Delivery gap loop | Engineering Delivery Lead | Every 60 minutes while active projects have no runnable lane | Turn failed proof and ambiguous parent issues into one-owner repair/proof lanes. | Child issues, dependency order, parent disposition. |
| Agent health and model governance | CTO Architect | Daily | Check adapter health, model policy, error states, Spark drift, and role/runtime alignment. | Health audit, repaired config, blockers. |
| Board janitor | Portfolio Director + Project Manager | Hourly | Run the live-run janitor first, then find stale issue state, missing owner, missing blocker, missing evidence, or done-without-proof. | Safe live-run cleanup, honest status updates, and routed follow-ups. |
| Regression evidence loop | QA Regression Lead | Daily, plus task-triggered | Refresh baseline proof and convert failures into repair lanes. | Evidence pack and failure-to-owner mapping. |
| Release/deploy gate | Ops Release Lead + Security Review Lead | Daily and before deploy | Verify source commit, Coolify/VPS state, secrets, rollback, smoke, and production risk. | Deploy readiness, NO-GO/GO evidence, rollback notes. |
| Release mutation permit | Ops Release Lead + Security Review Lead | Only when a release issue explicitly asks for it | Convert a blocked deploy/recovery gate into one narrow approved production operation with target resource, action, rollback, and proof. | Mutating operation result, rollback status, smoke evidence, parent unblock decision. |
| Source-control closure | Engineering Delivery Lead + Project Manager | Per completed implementation/docs lane | Ensure useful work is committed, push status is known, deploy impact is routed, and unrelated changes are not mixed. | Commit SHA, push disposition, verification proof, deploy handoff/blocker. |
| Docs/memory loop | Docs Memory Lead | Daily for active project, weekly for template | Keep docs, history, indexes, process registry, and template feedback aligned with real work. | Updated maps/indexes/ledgers and template candidates. |
| Longevity doctor/watchdog | CTO Architect + Portfolio Director | Hourly | Check local Paperclip health, restartRequired, WIP sanity, stale issues, project workspace policies, and snapshot export. | Doctor report, safe restart request if needed, no production mutation. |
| Longevity snapshot backup | Docs Memory Lead | Daily | Export redacted local state for agents, projects, issues, routines, goals, labels, live runs, and secret key metadata. | `report/longevity/*` JSON/Markdown snapshot without secret values. |
| Portfolio index refresh | Docs Memory Lead + Portfolio Director | After project audit, takeover prep, or meaningful status change | Keep `softwarehouse/portfolio/APPLICATIONS_INDEX.md` and `.csv` aligned with real project folders and docs roots. | Refreshed Paperclip-owned index from `node scripts/update-softwarehouse-portfolio-index.mjs`; no root-level generated indexes or updater under `/Aplikacje`. |
| AI-agent development review | AI Agent Manager + AI Agent Development Partner | Daily or after repeated failures | Review recent agent work for repeatable instruction, skill, routine, role, or tool/config lessons. | At most one applied low-risk durable update, up to three governed follow-ups, or an explicit no-change finding. |
| Retrospective loop | Portfolio Director + Docs Memory Lead | Weekly | Identify why agents stalled, repeated work, or missed proof; update process and instructions. | SOP changes, guardrail updates, role/routine adjustments. |
| Talent/capability loop | Portfolio Director + CTO Architect + Docs Memory Lead | Weekly or after repeated failures | Detect missing responsibilities, propose new roles or role splits, and retire ineffective boundaries. | Capability gap note, approval decision, onboarding checklist, or instruction/process update. |

## State Rules

- `in_progress` is valid only while a live run exists or an explicit short
  continuation path is active.
- Paperclip may run independent lanes in parallel according to agent/runtime
  limits. The company must not impose a global one-lane or five-lane cap.
- One agent has at most one active `in_progress` lane, but may have many planned
  `todo/backlog` lanes. Managers and leads are responsible for maintaining a
  useful ordered worker backlog at the lowest accountable layer.
- Each active controlled application track is evaluated independently for worker
  backlog health. Today that means Soar and Roost each need at least three
  legal worker-ready `todo/backlog` lanes, or an explicit legal blocker for
  every missing lane.
- Track fan-out must also respect the active product truth for that exact app.
  When the current truth says the remaining work is blocked, accepted deferral,
  external/non-blocking, or intentionally empty, routines must report that
  per-track hold reason and must not create duplicate product lanes just to hit
  a queue-depth target.
- `in_progress` worker execution is useful delivery evidence, but it does not by
  itself retire planned backlog starvation. A track with live worker execution
  is still weak when it lacks the required per-track `todo/backlog` depth.
- Coordination agents block only duplicate work, dependency conflicts, missing
  ownership/evidence, or unsafe production/secrets/live-account mutations.
- Parallel wakeups should preserve one accountable owner per lane and a clear
  evidence contract; dependent lanes wait for their upstream proof.
- Parent/controller issues should normally be `todo`, `blocked`, `in_review`,
  or `done`; they should not sit in stale `in_progress`.
- Before narrative board cleanup, run `node scripts/run-live-run-janitor.mjs`.
  Apply it only when the dry-run names closed-issue live-run tails or governor
  self-supervision loops. Do not use it to cancel ordinary active specialist
  work.
- A blocked issue must name the blocker, owner, and unblock action.
- A done issue must include proof or a link to proof.
- A production-impacting deploy/restart/rollback/env/database action must have
  a release mutation permit before execution. The permit is an issue or child
  issue that names the target project/environment/resource, exact action,
  expected source SHA or image, rollback path, smoke requirements, and secret
  redaction rule. It should be one operation, not a broad "fix deploy" bucket.
- Every task must link to architecture entities or explicitly request graph
  reconciliation before implementation.
- Unknown project state is runnable work. If a project lacks a current
  works/fails/unknown map, the PM or Portfolio Director must open a
  known-state evidence lane before implementation or polish.
- Active projects must maintain `docs/graphs/architecture-awareness.json`,
  `docs/graphs/architecture-awareness.csv`,
  `docs/graphs/architecture-proof-register.csv`,
  `docs/graphs/architecture-graph.md`,
  `docs/graphs/architecture-graph.mmd`,
  `docs/graphs/architecture-health.json`,
  `docs/status/architecture-awareness-report.md`,
  `docs/status/architecture-dependency-report.md`,
  `docs/status/architecture-ownership-report.md`, and
  `docs/status/task-synchronization-report.md`.
- Sellable apps must also maintain `docs/status/app-completion-index.json` and
  `docs/status/app-completion-index.md`. This index is the PM/QA queue for
  "what can a user actually do?" It must connect login, subscription,
  configuration, exchange API setup, backend/API behavior, frontend display,
  browser screenshot/clickthrough proof, tests, docs, and next owner/action.
- Sellable apps must also maintain the project-truth index family:
  `docs/status/event-chain-index.json`,
  `docs/status/runtime-error-index.json`,
  `docs/status/operational-readiness-index.json`, and
  `docs/status/project-truth-index.json`, plus their Markdown companions. These
  indexes are the first source of truth for whether agents know enough to work:
  event chains map each user flow across frontend, backend, workers, data,
  tests, and docs; runtime-error records failing probes and blocked functional
  items; operational-readiness records production/local parity gates; and
  project-truth names the first gap, owner, and next action. App-completion
  proof risks such as missing browser/clickthrough proof, missing test links,
  missing docs links, or implemented-without-fresh-proof are project-truth gaps,
  not advisory notes. A PM or specialist must not claim readiness from prose
  while this family is missing or reports unresolved gaps.
- A feature with a working backend but broken or unclear frontend remains
  unfinished. A feature visible in the frontend but missing backend,
  subscription entitlement, API-key configuration, or exchange proof also
  remains unfinished. Create the smallest repair/proof issue at the layer that
  owns the gap.
- Takeover, repair, and greenfield app work converge into the same evidence
  system. Existing apps start with known-state maps and app-completion indexes.
  New apps start with a business/product/architecture lifecycle brief, then
  create the same indexes before broad implementation.
- Run `pnpm softwarehouse:architecture-lifecycle` before project intake,
  known-state refresh, and control-loop decisions; run
  `pnpm softwarehouse:architecture-lifecycle:apply` only when refreshing graph
  exports is safe for the affected repositories.
- Done issues do not jump directly to `in_progress`.
- Implementation/docs lanes are not complete until they record files changed,
  verification evidence, commit SHA or explicit no-commit reason, push status,
  deploy impact, residual risk, and next owner.
- Non-trivial fixes must follow plan-design-build-verify:
  PM/Product writes human-readable intent and acceptance, CTO/UX maps
  architecture or interaction contracts, one specialist builds the smallest
  scoped change, QA/Ops proves behavior, and PM/Docs integrates the parent
  decision. This is a role split, not a model split; Codex-backed agents can
  execute every phase.
- Every task that changes user-visible behavior must return upward for review:
  the builder comments with files changed, proof command, screenshot/browser
  evidence when relevant, config/subscription/integration impact, commit status,
  residual risk, and the named reviewer. The parent/PM then accepts, requests
  fixes, or routes QA/UX/Ops/Security follow-up. Do not let "done, changed the
  button color" bypass review when it affects a user flow.
- After a project status/docs-root change, refresh the Paperclip-owned
  portfolio index with `node scripts/update-softwarehouse-portfolio-index.mjs`
  and verify the softwarehouse audit reports `rootPortfolioDrift: []`.
- Agents may commit their own scoped work when `commitPerCompletedTask` is
  enabled and verification/blocker evidence is recorded. Push requires explicit
  branch/remote/source-ref intent and must not imply production mutation without
  Ops/Security release approval.
- To resume a done routine/controller/checkpoint issue, use explicit reopen
  intent (`reopen`/`resume`) so status moves to `todo`, then let a live run
  claim it into `in_progress`.
- A routine issue is a checkpoint. Close it when the checkpoint is complete;
  the routine itself owns recurrence.
- If the company is below the target confidence level and no active work exists,
  the responsible PM or Delivery Lead must create or restart the next smallest
  proof/repair lane.
- If no `todo` or `in_progress` lane exists for an unfinished active project,
  the PM/Delivery Lead must treat that as a flow incident: either prove every
  remaining item is a real blocker with owner/action/next review, create the
  smallest safe non-production proof/repair lane, or assign the exact operator
  decision to `local-board`.
- If a parent/project target is unfinished and leaf specialists have little or
  no queued work, the next manager action is not routine monitoring. It is to
  split the parent into worker-ready issues, create the missing map/design lane
  that makes splitting safe, or block the parent with the specific external
  dependency.
- Repeated blockers, repeated fixes, or vague ownership must become a capability
  gap note. Do not create a new active agent without the hiring gate in
  `softwarehouse/talent-and-capability-system.md`.
- Local longevity routines may write redacted snapshots and Paperclip process
  issues. They must not push, deploy, restart production apps, mutate paid/live
  accounts, or export secret values.

## Active Routine Posture

Keep the core Softwarehouse and active-project routines enabled when their
triggers are enabled. An `active` routine with all schedule triggers disabled is
manual/library posture, not active autonomous work.

- `[Softwarehouse] Autonomy governor`
- `[Softwarehouse] Delivery gap loop`
- `[Softwarehouse] Gate freshness watcher`
- `[Softwarehouse] Stale board janitor`
- `[Softwarehouse] Agent health and model governance`
- `[Softwarehouse] Architecture awareness graph sync`
- `[Softwarehouse] App completion map and browser review loop`
- `[Softwarehouse] Docs and memory loop`
- `[Softwarehouse] Human decision inbox steward`
- `[Softwarehouse] Company value-stream governance`
- `[Softwarehouse] Product acceptance gate review`
- `[Softwarehouse] CTO technical acceptance gate review`
- `[Softwarehouse] Template feedback sweep`
- `[Softwarehouse] AI-agent development review`
- `[Softwarehouse] Organizational learning loop`
- `[Softwarehouse] Longevity doctor and watchdog`
- `[Softwarehouse] Longevity snapshot backup`
- `[Softwarehouse] Local disk-space and backup-retention guard`
- `[Softwarehouse] Subscription business readiness controller`
- `[Soar] Daily project status refresh`
- `[Soar][PM] No-stall queue expeditor`
- `[Soar] Regression evidence sweep`
- `[Soar] V1 audit-to-completion controller`
- `[Soar] Gap register and repair lane refresh`
- `[Soar] Coolify production deploy health sweep`
- `[Soar] Security and account-access gate sweep`
- `[Soar] Production performance and server health watch`
- `[Soar] Authenticated production acceptance and performance sweep`
- `Roost CompanyCore readiness and milestone review`
- `[Roost] Production health and authenticated acceptance evidence sweep`
- `[Roost][DRE] Coolify deploy provenance and rollback evidence sweep`

Cadence anchors for flow-critical routines:

- `[Softwarehouse] Autonomy governor`: every 30 minutes.
- `[Softwarehouse] Delivery gap loop`: every 60 minutes while active projects
  have no runnable lane.
- `[Soar][PM] No-stall queue expeditor`: every 30 minutes as a lightweight
  route/split/wake pulse.
- `[Soar] Gap register and repair lane refresh`: every 3 hours while Soar is
  below honest V1 readiness.
- `[Soar] V1 audit-to-completion controller`: every 3 hours while Soar is below
  honest V1 readiness.

Pause, disable, or keep manual-only unless a project phase explicitly needs
them:

- routines for deferred apps such as Featherly, Nest, Aviary,
  LuckySparrow.ch, OpenJarvis, and Obiekty;
- broad innovation/portfolio routines with disabled triggers;
- legacy duplicate review routines superseded by the active Softwarehouse
  review/learning loops;
- Soar or Roost routines whose only output would be status-sync comments
  without new blocker movement, evidence, routing, or review disposition.

All other routines are a paused library. They may be run manually or activated
temporarily when a project phase needs them, but the core posture above is the
normal autonomous heartbeat. Bootstrap/configuration scripts must preserve this
posture instead of collapsing the company into a single-project lane.

When a production/operator gate blocks deploy work, the softwarehouse must keep
non-production lanes moving: PM status, architecture/map drift, regression
evidence, gap-register maintenance, security/account-safety review, docs/memory,
and template feedback. These lanes must not touch deploy, secrets, live data, or
production accounts without a release/security approval path.

Roost/companycore is an active V1 completion lane, not a parked readiness-only
stream. Aviary, Nest, Featherly, LuckySparrow.ch, OpenJarvis, Obiekty,
Paperclip product work, and other portfolio experiments stay paused/backlog
until the board explicitly reopens them for V3 or a named exception. Before
opening large Roost specialist batches, PMs must verify project-manager lanes,
workspace policies, no stale `in_progress`, no shared specialist WIP conflicts,
and unresolved project gates.

The AI-agent development review is a lightweight daily scan owned by AIM/AID.
It may apply one low-risk durable improvement or produce a no-change finding.
The heavier talent/capability loop remains evidence-triggered during the Soar
pilot and should run when a recurring organizational gap needs approval,
staffing, or role-boundary decisions. CHRO remains paused for broad
human-capital work unless the board explicitly reopens that scope.

## Cost Rules

- Use `gpt-5.5` for primary Paperclip agent work.
- Use `gpt-5.5` with `low` effort for the configured `cheap` lane when the local Codex runtime is billed through a ChatGPT account:
  docs/status/triage and status-only recovery loops.
- Use `high` effort for normal coding, QA, product, PM, and ops work.
- Use `xhigh` only for architecture, trading/runtime, security, and AI-runtime
  decisions where a wrong answer is expensive.
- Do not substitute the cheap lane for source-work continuations. If the
  primary Codex lane is quota-blocked, leave the work paused/waiting until
  quota returns instead of moving code work to a weaker model.
- Do not use Spark models in this local softwarehouse; they have been unreliable
  in Paperclip runs.

## Runtime Auth Rules

- Prefer local Codex login for this workstation. Paperclip should seed managed
  agent `CODEX_HOME` from the shared local Codex home (`CODEX_HOME` env var or
  `~/.codex`) instead of forcing `OPENAI_API_KEY` on every agent.
- Run `scripts/configure-softwarehouse-local-codex-auth.mjs` after
  bootstrapping agents; it removes `OPENAI_API_KEY` bindings so Codex can use
  local login/session auth.
- Use `scripts/configure-softwarehouse-runtime-secrets.mjs` only when the
  desired mode is explicit OpenAI API-key billing for agents.
- If any agent fails with Codex auth warnings, treat the softwarehouse as
  structurally configured but not executable until local Codex login or API-key
  auth is repaired.

## Escalation Rules

- Escalate to the user only for secrets, irreversible production mutation,
  paid account/subscription mutation, LIVE exchange mutation, legal/commercial
  decisions, or destructive repository actions.
- Reversible production operations may proceed only inside an explicit release
  mutation permit issue. If the action cannot be proven reversible, or if the
  permit does not name rollback and smoke evidence, Ops must leave it blocked
  with the missing approval/evidence field.
- Escalate to Portfolio Director when a project cannot move because ownership,
  priority, or project scope is unclear.
- Escalate to CTO when architecture, data model, or cross-layer contract is
  unclear.
- Escalate to Ops/Security when deploy, Coolify, credentials, auth, API keys,
  production accounts, or live-risk boundaries are involved.

## Soar V1 Target Loop

Soar remains the active pilot until V1 is either:

- verified enough for the current release target,
- explicitly reduced with owner/date/reason,
- or blocked by a concrete external decision.

The current V1 work should keep cycling through:

`known-state scan -> gap register -> repair lane -> verification -> deploy/smoke gate -> docs/index update -> PM decision`

No UI polish phase is allowed while protected/browser proof and runtime/deploy
evidence are still ambiguous.

The current implementation of this loop must be index-driven:

`architecture-awareness -> app-completion -> event-chain -> runtime-error -> operational-readiness -> project-truth -> first gap repair lane -> verification -> source-control -> push/deploy proof -> docs refresh`

If a project is unfinished and `project-truth-index` has a first gap, the next
manager action is to route that gap to the right owner. If the index itself is
missing or stale, the next action is to refresh or repair the index, not to
write another narrative status update.
`app-completion-index.json` may cap `priorityReviewItems` so agents are not
flooded. Agents must use `counts.riskItems`,
`counts.appCompletionRiskItems`, and `counts.priorityReviewTruncated` as the
real known backlog state; `priorityReviewItems` is only the next routable
queue. Likewise, `project-truth-index.json` reports `totalGaps` for known
backlog and `indexedGaps`/`indexedAppCompletionGaps` for materialized rows.
App-completion routing is boundary-based: API endpoints, visible UI
pages/views/screens, and explicit non-file product capabilities may become
completion lanes. Scanner-labelled backend routes, code-file features,
components below a visible screen, internal functions, and modules are
implementation details and receive test/documentation proof through their
owning boundary; they must not create one autonomous issue per symbol or file.
The JSON `candidatePolicy` is a versioned routing contract. The dispatcher
refreshes a stale contract before routing work, but defers that refresh while
another live run could be writing either product workspace.
`scripts/run-project-truth-gap-dispatcher.mjs` is the mandatory bridge from the
index to execution: it creates or preserves one owner-scoped Paperclip issue for
the first indexed gap. A critical runtime gap such as a public 503 routes to
Deployment & Reliability/Ops for Coolify/VPS/runtime diagnosis and onward
repair, verification, documentation, source-control, deploy, and monitor
handoff. A safety gate may restrict mutation, but it must not end the chain; the
agent must create the exact next owner issue or permit request and keep the gap
alive until proof or a concrete assigned blocker exists.

## Roost V1 Target Loop

Roost follows the same V1 completion loop as Soar:

`known-state scan -> project-truth index -> repair/proof lane -> verification -> source-control closure -> gated deploy/readiness proof -> docs/index update -> PM decision`

Roost work should move whenever the next action is local, reversible, and
owner-scoped. Protected Paperclip/Roost integration, production deploy, secrets,
and live company-data mutation wait for V2.1/V2.2 gates, but they must not stop
local app repair, proof, documentation, or source-control closure.
