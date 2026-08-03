# Paperclip Softwarehouse Codex Context

Last updated: 2026-08-03

## 2026-08-03 Pre-start Decision And Organizational Metabolism

- Critical or protected agent-created work must carry a structured
  `executionPolicy.decisionContract`: value and cost of inaction, evidence and
  confidence, explicit resource bounds, stop/done-enough conditions,
  disposition, scope, reversibility, rollback, and post-change verification.
  The server enforces the gate; instructions alone are not the control.
- `later`, `monitor`, `accept_debt`, `reject`, `conditional`, `proposal`, and
  `escalate` are legitimate decisions. Uncertain hard-to-reverse work cannot
  self-authorize, and irreversible work must enter a governed proposal or
  escalation path.
- Active assumptions need provenance, confidence, review/expiry dates, and
  narrow invalidation of linked dependants. Unsupported or stale knowledge
  must be superseded or archived instead of silently propagating.
- `softwarehouse:organizational-evals` is the executable behavioral suite for
  objection, recurrence, authority under uncertainty, ownership, stopping
  boundaries, assumption hygiene, and project isolation. The outcome audit
  also reports organizational complexity as a signal, never a target.

## 2026-08-03 Outcome Integrity And Anti-Gaming Contract

- Queue depth, task/comment/document/commit/agent/run counts, and percent done
  are diagnostic signals only. The governing outcome is an observable
  owner/product state change or necessary risk/dependency reduction with
  inspectable evidence and independent review when required.
- The former rule requiring three planned worker lanes was a Goodhart/Cobra
  defect: it caused controllers to manufacture backlog. Each active product now
  keeps normally one smallest justified runnable next action. Further fan-out
  is just in time and needs an independent outcome, owner, evidence contract,
  dependency reason, and integration owner when the tree exceeds three open
  direct children.
- `pnpm softwarehouse:outcome-integrity` is the canonical live diagnostic for
  excessive fan-out, recurring work fingerprints, deep request trees, weak
  outcome contracts, missing typed evidence, comment-only evidence, and
  documentation-only technical closure. The control tick and Teachar consume
  it; indicators trigger investigation and repair, never new quotas.
- Three failed attempts without materially new evidence open one systemic
  cause/escalation path instead of another retry. Teachar supervision graduates
  reversibly from 30 minutes to 2 hours, daily, weekly, and finally `PAUSED`
  only through evidence-backed windows with mandatory readback and regression
  rollback.

## 2026-08-02 Delivery-Orchestration Repair

- 2026-08-03: a 19-hour CTO starvation deadlock exposed PID reuse and
  cancellation feedback. Detached-run recovery now compares the persisted and
  observed process start times, never signals a mismatched PID, and janitor
  cancellation suppresses automatic recovery. Live readback reached zero;
  keep the company paused until final maintenance verification and one
  deduplicated reopen action.

- Repair debt cannot remain report-only because active work keeps replenishing
  itself. Teachar now classifies every defect as `repair_now`,
  `drain_then_repair`, `owner_gate`, or bounded `accepted_defer`; two unchanged
  cycles escalate a material P0/P1 or run-affecting P2 defect to controlled
  drain, not a valid low-priority deferral.
- Until native support exists, company `paused` is used only as a compatibility
  admission freeze after a complete snapshot. Existing healthy runs are not
  cancelled; repair/restart waits for zero live/queued runs, then health and
  deduplicated recovery are proven before reopening. Do not mistake this for a
  native queue-preserving drain: current paused-company wakeups are skipped.
- Required native Paperclip mechanism is company/project-scoped
  `open -> draining -> maintenance -> reopening -> open`, with durable
  `deferred_by_maintenance` wakeups and visible activity/readback evidence.
- `paperclip-teachar` is a temporary bootstrap guardian. It may self-pause only
  after 14 continuous green days, fresh Paperclip-owned cycle/control evidence,
  project-specific accepted outcomes for every active application, no material
  Teachar repair during the window, a final decision packet, and confirmed
  `PAUSED` readback. Any critical regression resets the window.
- Current retirement state is `bootstrap_required`: the canonical autonomous
  cycle ledger is stale at 2026-07-02. The supervisor now checks freshness and
  uses the canonical Soar/Roost/Featherly registry instead of parked
  Aviary/Nest.
- The canonical versioned Teachar prompt is
  `softwarehouse/paperclip-teachar-prompt.md`; the live automation and report
  export must remain equivalent to it.
- Live-run janitor treats postgres `CONNECT_TIMEOUT` as a transient direct-read
  outage and uses bounded API fallbacks for control data/comments. Never
  restart or broad-kill the canonical database for this condition.
- Soar, Roost, and Featherly are independent application projects. Each owns
  its project id, App PM chain, issues, repository documentation, status truth,
  release/deployment evidence, and Innovation-to-Products promotion decision.
  Shared specialists work through separate project issues and may not hold
  concurrent cross-project `in_progress` work.
- A company-level live run is no longer a global release lock. The selector
  may deliver a ready project while a different project is active when the
  target project, writer, and release owner are idle. Same-project writes stay
  serialized, and live run identity comes from one bounded issue catalog.
- Teachar uses a fast half-hour operational loop plus rotating deep audits
  after staleness or a concrete signal. Supervision timeout/cost is itself a
  reported defect; a heavyweight audit may not silently consume every cycle.
- The strict live isolation readback currently covers 107 active issues with
  zero blockers. Featherly alone has one explicit missing project-truth warning;
  no other application may supply that evidence.
- Release delivery is now an input to the next-legal-action selector. Clean, non-divergent, meaningful application batches with project-specific deployment readiness outrank docs, map refresh, planning, generic recovery, and backlog work. Live readback selects Roost release delivery at `2ef9fdc3` / 111 commits ahead.
- The recurring false Paperclip liveness alarm was caused by synchronous probes blocking the selector's own health request. Health probing is now sequenced first and successful live API readback defeats a stale timeout.
- Coolify readiness is project-specific. Legacy aggregate readiness is Soar-only; Roost requires its own `COOLIFY_ROOST_APP_ID` readback.
- DRE has a pinned, governed Playwright MCP runtime with 24 callable tools and verified isolated open/close cleanup. LUC-2349/LUC-2350 are closed. LUC-2340 then proved the remaining failure is protected-session persistence on the Coolify Projects route; LUC-2373 is the single current recovery owner. Never equate a skill attachment with a callable tool, and never create reciprocal source/recovery blocker links.
- Roost Product Map local evidence is green (`5/5` web, `6/6` server, production build), but LUC-1910 remains protected by the canonical isolated-QA/deployment chain. Standing consent authorizes a verified clean application push and normal auto-redeploy, not bypassing a hard gate or performing manual protected infrastructure actions.
- The `paperclip-teachar` automation prompt now includes delivery-debt, source/deployed-SHA, runtime drift, capability reality, and owner-visible Roost projection audits. The configured schedule is every 30 minutes.

## 2026-07-28 Canonical Portfolio Goal And Execution Ladder

- Canonical goal: `b74b43a1-efeb-43b2-8da2-4a6a5c967f76`. Paperclip owns the
  full path to deployed, observable, owner-usable applications; local code is
  not the terminal outcome.
- Persistent coordinator: `LUC-1909`. Ladder: `LUC-1910` authenticated Roost
  live map; `LUC-1911`/`LUC-1912` separated Featherly remediation;
  `LUC-1913` independent Soar release review; `LUC-1914` Soar owner/paper
  readiness.
- Roost must show exact project state and the complete `11 Innovation` ->
  `02 Products & Services` path behind authentication.
- Featherly must close detected risks through non-destructive prevention while
  any Git history rewrite remains a separately approval-gated destructive
  action.
- Soar is a decision-support and paper/sandbox trading product. Never claim
  guaranteed profit or perform real-money/live-order mutation without exact
  protected authorization.

## 2026-07-28 Featherly Activation

- The owner activated `C:/Personal/Projekty/Aplikacje/Featherly` as the third
  application lane alongside Soar and Roost.
- Featherly begins in takeover/security-hardening mode: map current truth,
  close dependency and application-security risks, repair reliability gaps,
  add tests and documentation, then produce review and release evidence.
- Local repo mutation is authorized through normal scoped Paperclip issues.
  Production/Coolify, secrets, destructive actions, and authentication-sensitive
  live checks remain gated until security, deployment, rollback, and monitoring
  evidence is inspectable.

## 2026-07-26 Paperclip Remote Ownership Boundary

- The local Paperclip installation originates from external public sources.
  Remotes `henkdz` (`HenkDz/paperclip`) and `upstream`
  (`paperclipai/paperclip`) are fetch/upstream references, not owner-controlled
  publication targets.
- Never attempt an autonomous push to either external repository. Standing
  push consent applies only after the owner's separate Paperclip repository
  and intended branch/deployment binding are positively identified.
- The owner identified `Wroblewski-Patryk/paperclip`; it is configured locally
  as remote `owner`. Its `main` is `52209941` and appears to be the source of
  the healthy VPS service at `paperclip.luckysparrow.ch`.
- Local HEAD and `owner/main` have no merge base. Never push local HEAD to
  `owner/main`, merge unrelated histories, or repoint Coolify. Follow
  `doc/plans/2026-07-26-paperclip-owner-repository-convergence.md`: preserve
  production, publish the clean local lineage later on a non-deployment
  branch, keep Hindsight retired, selectively adapt useful hosted behavior to
  current Roost contracts, rehearse state migration, and cut over with
  backup/rollback/SHA/browser evidence. Roost is the current product name;
  older labels in historical sources must not be reused.
- Paperclip issue `LUC-1896` tracks the convergence lane in backlog.
- The owner made Paperclip local-only. The obsolete first-attempt deployment at
  `paperclip.luckysparrow.ch` is authorized for exact-target decommission to
  recover VPS capacity; local Paperclip stays on `3200`/`54329`.
- This authorization does not include any other VPS resource. Soar, Roost, and
  every other existing or started application/project/domain/database/volume
  must remain untouched. `LUC-1897` and `LUC-1898` are done: exact application
  `tcf6zwrsz3x5cjtyx9in8aj2` and exclusive volume
  `7cff7696bb5136cb1e0025ac` were removed, all other Coolify inventory remained,
  local Paperclip/Soar/Roost probes passed, and the hosted Paperclip domain now
  returns HTTP 503.
- Do not push the full local Paperclip history yet. Size checks pass, but a
  redacted Gitleaks `8.30.1` scan found 37 historical candidates in docs/tests/
  smoke/sandbox-provider paths. `LUC-1896` must classify or sanitize them before
  publishing a non-deployment owner branch.

## 2026-07-26 Autonomous Application Lifecycle

- The active company-wide procedure is `PROC-SH-APPLICATION-LIFECYCLE`,
  version 1.0, in
  `docs/softwarehouse/19-autonomous-application-business-lifecycle.md`.
- The procedure covers strategic fit, problem validation, business/product/UX
  acceptance, architecture and threat design, delivery planning,
  implementation, automated and browser proof, independent review,
  documentation/operations, release decision, meaningful commit/push,
  Coolify/VPS deployment, production acceptance, support/observability,
  business outcomes, incidents, and learning.
- Paperclip remains the live execution/evidence authority; Roost owns the
  owner-facing company procedure/offering/KPI projection; product repositories
  own versioned product, architecture, source, test, and release truth.
- The shared lifecycle instruction was synchronized to all 39 local agent
  bundles. Agent-instruction, operating-standard, and strict runtime-topology
  audits pass.
- The Roost repository contains a `source_only` projection contract. Do not
  call it live on the VPS until an authenticated owner surface/API publishes
  version 1.0 with freshness, conflicts, evidence, and access-denial proof.

## 2026-07-25 Product Map Archive Checkpoint

- The product/OS implementation baseline before this memory checkpoint is
  Paperclip `2e5e07ca`; Soar is clean at `d3d163d83` and Roost at
  `3f8850c2`. The Paperclip Product Map, learning disposition gate, unified
  agent identity/UI work, and the owner-facing Roost Product Map are committed
  locally. Run a fresh source-control audit for the later memory-commit SHA.
- `LUC-1831`, `LUC-1833`, and `LUC-1834` are `done`. `LUC-1832` is the only
  remaining Product Map integration lane: a versioned read-only portfolio
  projection from Paperclip to Roost. It is intentionally `backlog` and
  unassigned for a subsequent governed work cycle.
- Roost exposes the locally verified owner route
  `/areas?area=00-ogolny&view=product-map`. Its build and browser
  navigation/reload proof pass, but commit `3f8850c2` has not been pushed or
  deployed. The public Roost build remains
  `070b150f5477d701d462485aad8b91450d0c3d71`; the public Soar build remains
  `9d1801d9b023211d4446629aac7bd58def70322d`.
- Paperclip is healthy on the strict local topology `3200`/`54329`, with one
  registered dev service and no live agent runs. Workspace-boundary and
  runtime-topology audits pass; parked/external sibling warnings and missing
  Docker Desktop inventory are non-blocking and no sibling was modified.
- The aggregate Softwarehouse status snapshot is stale and fail-closed.
  Fresh direct checks prove clean source control and healthy runtime, but
  `projectRepoMutationAllowed=false` and `protectedDeliveryAllowed=false`
  remain the safe routing facts until a new governed control cycle.
- Commercial truth is unchanged: Soar is `NO-GO`; Roost is limited to a
  guided pilot. Healthy endpoints and local UI completion do not establish
  subscription or public sale readiness.
- No push, VPS deployment, protected mutation, or thread archive was performed
  in this checkpoint.

## 2026-07-24 Current State

- Local supervision is stable: Paperclip `6d3592e3`, Soar `d3d163d83`, and
  Roost `cfb5390c` are clean. Soar is one local commit ahead of `origin/main`;
  no new product push was performed in this cycle.
- `LUC-1787`, `LUC-1788`, and Roost canary `LUC-1799` are `done` with
  completion evidence. Roost current-state memory consistently treats the
  scoped `X-API-Key` handshake as proven.
- Obsolete recovery actions for `LUC-1513` and `LUC-1542` were resolved after
  143/144 repeated attempts. `LUC-1809` was resolved against first-class
  blocker `LUC-1810`; janitors then verified clean state. `LUC-1829` is
  `done`; reusable janitor lane `LUC-1828` is `todo` with the completed pass
  preserved in typed evidence.
- API health is `ok`; live runs and pending approvals are both `0`.
  Workspace-boundary and runtime-topology audits pass.
- The protected Soar provenance/redeployment chain (`LUC-1819`, `LUC-1818`,
  `LUC-1812`, `LUC-507`, `LUC-448`) is complete with evidence.
- The authoritative deployed Soar API/Web revision is
  `9d1801d9b023211d4446629aac7bd58def70322d`. Public `/health`, `/ready`,
  `/api/build-info`, and the source-aware deployment smoke pass.
- Soar commit `9d1801d9` embeds a validated immutable API source revision at
  image build time, supports canonical Coolify/GitHub SHA aliases, and removes
  the broad recursive `/app` ownership layer. It is pushed to `main`.
- The 74 GB VPS reached full disk during concurrent image builds. Use only
  bounded build-cache pruning for emergency recovery, keep Coolify build
  concurrency at `1`, and reconcile worker revisions serially. Existing
  serving workers were not stopped when two technical build helpers were
  cancelled.
- Coolify app 3 must retain one non-preview dynamic `SOURCE_COMMIT` row with
  value `$SOURCE_COMMIT`; do not recreate duplicate rows or permanently pin a
  release SHA in the environment.
- Pending approvals: `0`. Queued/in-progress Coolify deployments: `0`.
  Paperclip remains local on strict ports 3200/54329; do not expand to hosted
  Paperclip or whole-company V1 without a separately governed transition.

## 2026-07-23 Current State

- Local Softwarehouse V0 is achieved; `LUC-25`, Soar, and Roost hosted-product
  delivery are complete. Paperclip stays local on strict ports 3200/54329.
- Protected incident gate `LUC-972` is done under approval
  `1f7d1a94-2759-4ffd-81e0-35634c05865a`: seven Coolify/Soar/Roost
  credential families were rotated, both old Coolify tokens were revoked, old
  product passwords were rejected, and new-access smokes passed without
  deploy/restart/push. No raw values entered source or evidence.
- Durable value-redacting operator:
  `scripts/rotate-luc-972-credentials.ts`; Paperclip work product
  `077a3069-32fb-419e-b081-12cb839c50a9`.
- Paperclip automatically resumed the dependent security/learning/governor
  lanes. The first Soar-first, Roost-second sale-readiness contract pass is now
  complete: `LUC-1787` and `LUC-1788` are `done`. Both products remain in
  `11 Innovation`; three completed delivery goals are `achieved`.
- Do not start hosted Paperclip or whole-company V1 operations without a new
  governed transition.

## What This Workspace Is

This repository is the user's local Paperclip Softwarehouse control-plane
workspace. Paperclip is being used and developed as the operating layer for an
autonomous software company: agents as employees, issues as work objects,
artifacts as evidence, routines as operating cadence, and board/operator
governance as the safety layer.

## Read First

For repository work, follow `AGENTS.md` first. Then read:

1. `doc/GOAL.md`
2. `doc/PRODUCT.md`
3. `doc/SPEC-implementation.md`
4. `doc/DEVELOPING.md`
5. `doc/DATABASE.md`

For current Softwarehouse operating context, read:

1. `.agents/state/board-context.md`
2. `.agents/state/active-mission.md`
3. `.agents/state/current-focus.md`
4. `.agents/state/softwarehouse-stage1-delivery-foundation.md`
5. `.agents/state/softwarehouse-v1-goals-routines-audit.md`
6. `.agents/state/softwarehouse-complementarity-audit.md`
7. `.agents/state/project-journal.md`

Use `.agents/skills/paperclip-project-memory/SKILL.md` when the user asks to
save context, update the diary, analyze old chats, or improve durable operating
memory.

## North Star

Help the user build and run LuckySparrow Software House as an autonomous
software company on top of Paperclip. The system should make autonomous agents
more capable, governable, inspectable, and commercially useful while keeping
human board control over risk, production, budget, and direction.

## Current Stage 1 State

V0 means a complete local autonomous softwarehouse for application creation
and completion, not a locally operated version of every future company
department. Paperclip stays on Windows in V0 while Soar and Roost may be
delivered to VPS. Hosting Paperclip and activating broad business-plan, CRM,
sales, marketing, finance, HR, customer-success, provider-write, and external
communication operations belong to V1. The canonical implementation contract
is `doc/plans/2026-07-22-local-softwarehouse-v0-implementation.md`.

The current owner priority is completion capability, not portfolio expansion:
finish Soar first, then Roost, then the owner's other already-started
applications according to their established visions. Creating a new application
from zero comes only after the Softwarehouse repeatedly proves it can finish
existing products without recurring manual Codex/board nudges. `LUC-1554` and
its implementation/eval/review chain completed on 2026-07-22. `LUC-27` and
`LUC-28` are the persistent product-completion parents; new Project Truth work
must be dispatched as a runnable blocking child of the matching parent.

The current verified gap report is
`docs/status/2026-07-20-paperclip-v0-holistic-audit.md`. Read it before broad
V0 closure work. The July 18 conversation handoff remains historical context.
The current report records the Soar Redis/permission blocker, credential
rotation and provenance chain, 59 product-truth gaps, active source-control
packets, full-instance restore gap, longevity routine-title repair, and bounded
queue reconciliation. The active Redis recovery confirmation is LUC-1524;
LUC-1387 is historical authorization-path evidence.
Treat every live count as a dated snapshot and re-verify it before mutation.

Paperclip has moved beyond Stage 0 configuration. The active Stage 1 mission is
to prove LuckySparrow as a practical autonomous softwarehouse by delivering two
real applications, Soar and Roost, to usable VPS production.

Current hard delivery parent:

- `LUC-25`: `00 General: Deliver Soar and Roost to Usable VPS Production`.

Do not close this parent for plans, preflights, reports, or a child issue tree.
Done means Soar and Roost are created, verified, deployed to VPS, and usable by
the owner with inspectable evidence.

Critical children:

- `LUC-26`: delivery control.
- `LUC-27`: Soar build-to-production execution.
- `LUC-28`: Roost build-to-production execution.
- `LUC-29`: technical implementation routing and repo execution.
- `LUC-30`: VPS/Coolify deployment execution path.
- `LUC-31`: production readiness verification.
- `LUC-32`: security, secrets, and production safety gate.

## Current Active Company Scope

Active app-factory roles:

- `00 AIA`, `01 CSO`, `02 CPO`, `02 UID`, `02 UXW`, `02 WPM`, `04 COO`,
  `04 DPM`, `04 DSM`, `06 AIM`, `07 CFO`, `08 CAO`, `09 CTO`, `09 TSA`,
  `09 EDL`, `09 CBE`, `09 FEW`, `09 DBE`, `09 IDE`, `09 RTE`, `09 TAE`,
  `09 QVE`, `09 CRS`, `09 DRE`, `10 CLO`, `10 SPA`, `11 CINO`, `11 IPM`,
  `11 SPM`, and `11 RPM`.

Paused/out of scope unless separately approved:

- `03 CRO`, `05 CCO`, `05 CSM`, `06 CHRO`, `06 POP`, `11 APM`, `11 FPM`,
  `11 NPM`, and `12 CEO`.

Active routines:

- nine bounded Softwarehouse controllers: continuation, autonomy, gate
  freshness, longevity, stale-board cleanup, daily model/agent governance,
  daily backup, organizational learning, and AI-agent development review;
- older broad department review routines and the controlled dry-run routine
  are intentionally paused because the bounded controllers supersede them.

Active goals:

- `00 General: Stage 1 Softwarehouse Delivery to VPS`.
- `11 Innovation: Soar Delivery to Usable VPS Production`.
- `11 Innovation: Roost Delivery to Usable VPS Production`.
- `00 General: v0 Softwarehouse Readiness - Achieved` is historical.

## Strategic Interpretation

The Soar/Roost VPS delivery goal exists because the larger goal is an
autonomous digital software company, not just two apps.

Roost is the intended reusable application/tool layer for that company. As its
capabilities become usable and governed, Paperclip agents should consume them
through MCP-first interfaces. Paperclip remains the company control plane;
Roost does not replace issue ownership, permissions, approvals, budgets, or
evidence gates.
The owner activated this direction on 2026-07-22. A bounded read-only canary
from local Paperclip to hosted Roost may be planned and verified during V0 as a
transition aid, using a least-privilege secret ref and one accountable agent.
This does not authorize broad writes, provider mutations, direct database
access, or priority drift away from finishing Soar first and Roost second.
Canonical boundaries are in
`docs/softwarehouse/18-roost-company-knowledge-plane.md`.

Agents should model a real softwarehouse:

- clear responsibilities and authority;
- least-privilege access;
- evidence gates;
- handoffs and parent/child traceability;
- source-control and deployment discipline;
- PDCA learning at individual, department, and company levels;
- owner-facing escalation through `00 AIA` in Polish.

The organizational-orientation program composes these controls into a shared
operating picture. `CompanySituation` is used by the board dashboard and issue
heartbeat context. Its deliberation layer now has typed, auditable assumptions,
commitments, and decisions with review timing and supersession. Its first
forecast layer reports a confidence-labelled historical-throughput range without
creating a deadline. The next foundation adds explicit flow-capacity queues,
source-backed outcome and causal observations, freshness-bounded external
signals, and a validation-gated path that promotes learning into named skills,
procedures, templates, evals, routines, policies, or issues. Continue from
`doc/plans/2026-07-15-organizational-orientation-system.md`; do not replace it
with disconnected time, priority, memory, or trust features.

Internal work may be English-first. Direct owner-facing decisions and summaries
should come through `00 AIA` in clear Polish.

## Scope Boundaries

Current active products:

- Soar.
- Roost.
- Featherly (takeover and security hardening).

Parked until owner activation:

- Aviary, Nest, and unrelated products.

Current allowed local workspace roots:

- `C:\Personal\Projekty\Aplikacje\Paperclip_Softwarehouse`
- `C:\Personal\Projekty\Aplikacje\Soar`
- `C:\Personal\Projekty\Aplikacje\Roost`
- `C:\Personal\Projekty\Aplikacje\Featherly`

Do not create generated files, scripts, indexes, or scratch folders directly
under `C:\Personal\Projekty\Aplikacje`. Do not delete or clean sibling app
folders. When in doubt, report the path as a boundary issue and leave it
untouched. Run `pnpm run softwarehouse:workspace-boundary-audit` after changing
project/routine/workspace configuration.

Out of scope unless separately approved:

- marketing, sales, customer service;
- unrelated client work;
- broad HR;
- paid GitHub/cloud features;
- destructive infrastructure actions;
- raw secret exposure or secret value mutation;
- legal/customer/finance commitments;
- LIVE trading/order proof.

## Resource And Safety Notes

- The owner does not have a paid GitHub plan. Do not assume paid GitHub
  features, paid Actions capacity, Advanced Security, paid runners/packages,
  enterprise-only controls, paid GitHub AI features, or notification-heavy
  automation.
- Secrets are stored through Paperclip managed secret refs. Do not write raw
  secret values in memory, issue comments, logs, docs, or final responses.
- Coolify/VPS deployment for Soar/Roost is part of the current outcome, but it
  must remain evidence-led and non-destructive.
- Local disk capacity is a control-plane invariant. Current policy is 10 GiB
  database backups with an 8 GiB free-space guard, 5 GiB/14-day terminal run
  logs, and 1 GiB/14-day rotated server logs. Verify bytes on disk rather than
  trusting configuration alone.
- Restart verification must count actual listeners and server process trees;
  the dev-service registry may be clean while an older child still owns port
  3200. Never stop a server while a run is active unless the run has logically
  completed and the canonical cancel path is used with an audit record.
- The canonical local topology is exactly one checkout each for
  Paperclip_Softwarehouse, Soar, Roost, and Featherly. Paperclip uses strict port 3200 and
  its canonical embedded PostgreSQL uses strict port 54329; collisions fail
  closed. Verify with `pnpm run softwarehouse:runtime-topology-audit`.
- This Windows 11 / PowerShell 5.1 host is one bounded workstation. Do not
  overlap repo-wide validations, serialize the full process table, broad-kill
  process names, or retry a timed-out test before its verified PID tree is gone.
- The July 20 runner closure proved full `pnpm test` green in 5,963.8 seconds.
  Windows fixture cleanup must protect the live canonical database from the
  current 54329 listener, terminate only an owned PID tree (including late
  `io_worker` descendants), and require stable no-listener snapshots. Node
  scripts should launch pnpm through `process.execPath` plus `npm_execpath`.
- Product app repos are separate from this control-plane repo. Product changes
  should be made in the relevant product repo.
- Canonical active-app identity lives in
  `scripts/lib/softwarehouse-project-registry.mjs`. Do not recreate local
  Soar/Roost/Featherly maps in generic orchestration code.
- `pnpm softwarehouse:cross-project-isolation-audit` is the fail-closed source
  and live-state guard for project ids, workspaces, PM cwd/lead, routine and
  issue bindings, and PM secret namespaces. Aggregate evidence may summarize
  typed project rows but may not substitute for project-specific facts.

## Historical Baseline

Stage 0/v0 setup is complete enough to be historical. Background files:

- `.agents/state/softwarehouse-stage0-foundation.md`
- `.agents/state/softwarehouse-v0-readiness-audit.md`
- `.agents/state/softwarehouse-stage1-recommended-first-action.md`

These files explain how the foundation was configured. They should not override
the active Stage 1 delivery mission.

## Collaboration Notes

- The user wants a warm, high-context collaborator, not a stateless code
  executor.
- Preserve useful context in files when asked; do not assume conversation
  memory alone will survive.
- Treat "zapisz do dziennika", "przeanalizuj i zapisz", and similar Polish
  phrases as requests to update durable memory.
- Keep notes concise and inspectable; avoid secrets and unverified claims.

## 2026-08-03 - Current autonomy checkpoint

- Native admission control is open at version 11 after a second bounded
  drain/reopen closed the pre-fix blocked-queue tail. Its replay inspected 4,
  queued exactly 1 legal continuation, rejected 3, and failed 0. Replay state
  is persisted on the control row; supervisory automation must compare only
  events inside the current drain/reopen window.
- Deferred wake replay must re-read issue state. Never enqueue historical work
  for an issue that is currently blocked, terminal, or missing; preserve the
  current dependency graph as the authority for whether work is actionable.
- Periodic source-scoped recovery is subject to the same dependency authority.
  It must not rearm an old recovery action while its source issue is `blocked`;
  completion of the actual blocker supplies the next admissible signal.
- Orphaned blocker repair is executable, not documentary: when all linked
  blockers are done the target returns to `todo` and its assigned agent is
  woken with current comment evidence. Regression coverage is in commit
  `7115b032`.
- The Roost protected browser/session capability chain is complete through
  LUC-2373/LUC-2375/LUC-2376 and LUC-2340/LUC-2338/LUC-2337. LUC-2336 has
  resumed the approved isolated QA-resource creation step. The Coolify-valid
  environment name is `roost-qa`, not the rejected two-character name `qa`.
  LUC-2336 is done: application `Roost QA LUC-2153` exists at the pinned
  candidate SHA, Exited, with auto-deploy off, zero deployments, and a distinct
  database volume namespace. LUC-2154 owns secrets and controlled deployment
  and has a fresh live `in_progress` run after the version-11 reopen.
- Keep production Product Map delivery fail-closed until the remaining
  LUC-1910 QA/release gates and protected ingestion bindings are satisfied.
- LUC-2452 disproved the unsubstantiated interaction-handler defect: the live
  agent contract accepts targetless `request_confirmation` payloads (201) and
  rejects malformed ones as validation errors (400). Commit `b6886ba1` records
  the exact route regression and API shape; require captured requests before
  promoting future transient status claims into systemic defects.
