# Board Context

Last updated: 2026-07-26

## 2026-07-26 Paperclip Repository Ownership Clarification

The owner clarified that this local Paperclip installation was obtained from
someone else's public repository. `HenkDz/paperclip` is not the owner's push
destination, and agents must not treat a configured remote as permission to
probe it with a write. `paperclipai/paperclip` is likewise an external
upstream. The owner-controlled repository is
`Wroblewski-Patryk/paperclip`, now configured as remote `owner`.

Standing autonomous push consent applies only to an owner-controlled,
positively verified repository and its intended release/deployment branch.
The owner's `main` appears to serve the existing VPS Paperclip and has no merge
base with the newer local history. Do not push local work to `owner/main` or
merge unrelated histories. Preserve `main`, verify its exact Coolify SHA and
backups, then publish a clean local candidate to a non-deployment branch and
rehearse migration under the repository-convergence plan.

Hindsight Memory is explicitly excluded from that convergence: existing
Softwarehouse memory mechanisms remain authoritative, avoiding duplicate token
cost and external-service registration. Historical VPS knowledge/tool code is
evaluated only as input to Roost. Use `Roost` in all current communication,
plans, issues, code, and UI; any older product label is historical evidence,
not an active name.

## 2026-07-26 Application And Business Lifecycle Direction

The owner clarified that autonomous delivery must be understood as a complete
business and software lifecycle, not only local code -> commit -> push ->
Coolify -> browser smoke. The durable operating contract is now
`PROC-SH-APPLICATION-LIFECYCLE` in
`docs/softwarehouse/19-autonomous-application-business-lifecycle.md`.

It joins strategic fit and opportunity validation with business framing,
product/UX acceptance, architecture/data/threat design, scoped implementation,
automated and user-flow proof, independent review, documentation and
operational readiness, meaningful source-control release, production
acceptance, support/observability, business outcome measurement, incidents,
and systemic learning. Deployment health never implies product or commercial
readiness by itself.

Paperclip owns live agents, work, policy gates, runs, approvals, blockers, and
evidence. Roost is the intended owner-facing company procedure/offering/KPI
projection. Product repositories retain product, architecture, source, test,
runbook, and release truth. The current hosted Roost integration remains
read-only, so the Roost procedure contract is `source_only` until a governed
owner surface/API publishes it with access, freshness, conflict, audit, and
browser proof.

## Current Checkpoint

The owner established a cross-project quality principle after comparing Roost
and Soar takeover debt: meaningful corrections must separate the immediate
local fix from recurrence prevention, and reusable causes should improve the
Softwarehouse rather than create copied workarounds in each application.
Paperclip's agent-owned issue close contract now has a local implementation
slice for that principle: every typed completion classifies learning as
`not_applicable`, `one_off`, or `systemic`; systemic completion must prove
implemented prevention or reference a non-cancelled same-company prevention
issue. This local change is verified but not yet committed, deployed, or
propagated to the live agent instruction bundles.

The owner clarified that application readiness needs one approachable,
version-aware Product Map covering user journeys, implementation layers,
dependencies, impacts, relations, evidence, deployment truth, blockers, and
next actions. The durable owner-facing projection should live in Roost as the
Offering/company knowledge plane, while Paperclip remains the live execution,
approval, issue, run, budget, blocker, and evidence-gate authority. Product
repositories remain authoritative for architecture, code, tests, release
contracts, and actual behavior. Every projected fact must carry its source,
exact release/SHA, observed/verified time, freshness boundary, and conflict or
supersession state. Paperclip issue `LUC-1831` completed the source/authority
matrix. The first Paperclip vertical slice is implemented locally: `Projects`
shows lifecycle, use boundary, local/deployed SHA comparison, Roost publication
state, and next gate; project Overview carries the same facts; Softwarehouse is
explicitly the Operations cockpit and links to the project map.

The Roost Product Map is still `source_only`, not a deployed UI. Backlog issues
`LUC-1832` and `LUC-1833` preserve the remaining integration work: a versioned
least-privilege Paperclip portfolio projection and the authenticated
owner-facing Product Map screen in Roost. Neither lane should start while the
current control snapshot reports `canStartNewLane=false`.

A fresh owner-readiness audit found that deployed availability is not the same
as complete user readiness. Soar public health/readiness and Web build-info pass
at `9d1801d9b023211d4446629aac7bd58def70322d`, but its sale-readiness contract
is still `NO-GO` with owner acceptance pending. Roost responds at deployed
commit `070b150f5477d701d462485aad8b91450d0c3d71` and remains approved only for a
guided owner-operated pilot, not self-serve or general availability. Roost is
73 local commits ahead of `origin/main`, so local and deployed truth must not
be conflated. The current Paperclip readiness snapshot is stale and disagrees
with the deterministic live situation about executing runs; stale or
conflicting data must fail closed instead of producing a green verdict.

The latest local supervision cycle is stable. Paperclip is clean at
`6d3592e3`, Soar is clean at local baseline commit `d3d163d83`, and Roost is
clean at local baseline commit `cfb5390c`. There are zero live runs and zero
pending approvals. Workspace-boundary and strict runtime-topology audits pass;
the topology audit only warns that the unrelated Docker Desktop engine is not
running.

The sale-readiness coordination state has advanced: `LUC-1787`, `LUC-1788`,
and Roost read-only canary `LUC-1799` are `done` with completion evidence.
Roost current-state files now consistently record the exact `X-API-Key`
handshake as proven rather than blocked. The next Roost architecture gap
triage `LUC-1827` remains parked in backlog.

The repeated recovery loop on `LUC-1513` and `LUC-1542` is closed. Their
obsolete recovery actions had reached 143/144 attempts despite successful
source runs; both were resolved from source truth, and the stale `LUC-1809`
action was resolved against first-class blocker `LUC-1810`. `LUC-1828` and
`LUC-1829` subsequently verified that the board and live-run state were clean.
`LUC-1829` is `done`; the reusable `LUC-1828` janitor lane returned to `todo`
after recording the completed pass in typed evidence.

The Soar protected provenance/redeployment chain is closed. `LUC-1819`,
`LUC-1818`, `LUC-1812`, `LUC-507`, and `LUC-448` are all `done` with
completion evidence. The authoritative live API/Web revision is
`9d1801d9b023211d4446629aac7bd58def70322d`; public health, readiness,
build-info, and source-aware smoke checks pass. There are zero pending
approvals and zero queued/in-progress Coolify deployments.

The API now embeds immutable release provenance at image build time. Coolify
build concurrency is deliberately `1` on the bounded 74 GB VPS, and
build-cache-only pruning is the approved emergency capacity lever. A broad
recursive `/app` ownership layer was replaced by scoped writable-directory
ownership. Two technical worker build helpers were cancelled during the disk
emergency without touching existing serving worker versions; any worker
revision reconciliation must proceed serially.

Local Softwarehouse V0 is achieved. `LUC-25` and the Soar/Roost hosted-product
delivery contract are complete; Paperclip intentionally remains local on
Windows. The protected credential-incident gate `LUC-972` completed on
2026-07-23 under the already-approved local-board scope. Seven managed
Coolify/Soar/Roost token/password families were rotated, old credentials were
revoked or rejected, and value-free post-rotation smokes passed. The durable
operator is `scripts/rotate-luc-972-credentials.ts`.

Current legal direction is local product maturation, not V1 company expansion:
keep Soar and Roost in `11 Innovation`, define versioned sale-readiness
contracts, burn down verified gaps Soar-first and Roost-second, and preserve
the human approval boundary. V1 remains the later migration of Paperclip to
VPS plus Roost-backed whole-company operations.

This program has completed its first contract pass: `LUC-1787` and
`LUC-1788` are `done`, and their evidence now drives bounded product-specific
follow-ups. The active maturation goals remain
`45d5d36a-8f83-4571-a9ac-bfd20a8bf9b1` for Soar and
`4c1390fd-d09a-45a3-9cfa-8aa9745f8988` for Roost. The obsolete Stage 1, Soar
VPS-delivery, and Roost VPS-delivery goals are marked `achieved`.

## User Intent

The user wants Paperclip to become the control plane for LuckySparrow: an
autonomous softwarehouse that can create, maintain, verify, deploy, and later
sell or operate digital products with AI agents acting as an organized company.

The project is both product work and company-building work. The current proof
is V0: a complete local autonomous softwarehouse for creating and finishing
applications. Paperclip remains the local Windows control plane while agents
autonomously create, develop, deploy, verify, and maintain Soar and Roost; the
products may run on VPS. V0 is not expected to operate the whole business.
Moving Paperclip itself to VPS and activating broad business departments belong
to V1 built on this foundation.

The owner wants completion capability proved in sequence rather than portfolio
expansion by issue volume. Soar is the first completion priority because its
remaining functional scope is expected to be small. After Soar is genuinely
owner-usable, the same operating model should finish Roost and then the owner's
other already-started applications according to their existing visions. Only
after the Softwarehouse repeatedly proves that it can finish those applications
should it be trusted to create a new application from zero.

The expected operating behavior is self-propelling: a product problem is owned
by its PM, classified, delegated to the appropriate specialist unit, passed
through any required implementation, test, review, security, deployment,
monitoring, and documentation units, then integrated by the PM. An unfinished
product must retain a live run, runnable owned task, or resolvable first-class
blocker. Recurring manual Codex/board nudges are evidence that the operating
model is incomplete, not a normal way to run the company.

## Current Stage

V0 local-control-plane and hosted-product delivery is active.

V0 continues until:

- Local Windows Paperclip can autonomously plan, implement, test, review,
  document, and close source-control work for Soar and Roost in the three
  approved local repositories.
- Soar and Roost are deployed to VPS, usable there, and can be iterated through
  evidence-backed push, redeploy, monitoring, and smoke/recovery cycles.
- Local control loops remain live without duplicate work, unexplained stalls,
  missing agent instructions, unsafe workspace mutation, or manual Codex
  supervision as a normal requirement.
- Model routing, quota/budget gates, evidence, recovery, backup/restore, and
  Windows runtime supervision have inspectable local proof.
- Known V0-required tooling gaps are closed or explicitly accepted by the
  owner with bounded impact.

`LUC-25`, `00 General: Deliver Soar and Roost to Usable VPS Production`,
remains the hard V0 product-delivery parent. Its VPS scope applies to Soar and
Roost, not to hosting Paperclip itself.

V1 begins only after V0 is accepted and Roost is sufficiently complete for the
company layer to make sense. V1 covers moving Paperclip itself to VPS and
connecting the hosted control plane with Soar and the wider Roost-backed
ecosystem. Autonomous business-plan, CRM, sales, marketing, finance, HR,
customer-success, provider-write, and external-communication operations are
V1 scopes, not requirements for local Softwarehouse V0 acceptance.

Canonical V0 implementation plan:
`doc/plans/2026-07-22-local-softwarehouse-v0-implementation.md`.

The first implementation gate completed on 2026-07-22. `LUC-1554` and its
implementation/eval/review chain (`LUC-1562`, `LUC-1563`, `LUC-1565`) are
done with fresh evidence. New Project Truth gaps must now be runnable blocking
children of `LUC-27` or `LUC-28`; detached, blocked, or backlog-only copies do
not count as live work. The reviewed local packet must be committed separately
from durable state/memory updates before automatic Soar-first dispatch resumes.

## Desired Collaboration

- Speak naturally and keep project context alive across chats.
- Treat phrases like "zapisz do dziennika", "przeanalizuj tę rozmowę",
  "zapisz sobie do pamięci", and similar Polish requests as explicit
  instructions to use `.agents/skills/paperclip-project-memory/SKILL.md`.
- Help manage Paperclip as a living company system: priorities, agents,
  routines, blockers, evidence, docs, releases, deployment gates, and learning.
- Keep the user's larger vision visible while verifying local facts before
  code, production, money, or security-sensitive actions.

## Operating Preferences

- Treat Paperclip UX/UI as a coherent operational product, not a collection of
  isolated gray admin panels. Preserve information density and every existing
  function, but prefer shared surface, hierarchy, empty-state, and status
  patterns that make the interface calmer and more pleasant to use.
- Use the configured company brand color as a contrast-safe orientation accent
  for selected navigation, focus, key links/actions, and graph emphasis. Do not
  replace semantic success, warning, error, blocked, or live colors with the
  company accent. Earlier ORG graph screenshots from June 2026 are a positive
  reference for compact dark nodes, slim colored rails, explicit status chips,
  and restrained luminous relationship cues; default graph framing must still
  keep nodes readable.
- Prefer repo-local memory for project context so older and newer chats can
  converge.
- When Codex or a Paperclip agent discovers a unique, reusable environment,
  runner, process-ownership, or coordination lesson that affects more than one
  task, promote it proactively into repository memory and the canonical shared
  agent-instruction source. When safe, sync the live agent bundles and verify
  the readback; do not leave the lesson only in a chat transcript.
- Prefer Paperclip issues/work products for issue-specific execution evidence.
- Keep high-risk actions gated: raw secrets, destructive infrastructure, paid
  resources, legal/customer/finance commitments, and LIVE trading/order proof.
- VPS/Coolify deployment for Soar/Roost is part of the current target outcome,
  but should still be evidence-led and non-destructive.
- Treat Paperclip as the control-plane repo and each product app as its own
  repo. Product changes should happen from the product repo, not the
  Paperclip_Softwarehouse repo.
- Avoid broad rewrites and context churn. Capture what matters, then keep
  moving.
- Extend autonomy in this order: first Paperclip company/agent/routine
  configuration, second an update-safe Paperclip plugin/add-on, and only third
  a separate application layer. Do not add LangGraph or another orchestration
  runtime when native Paperclip contracts can enforce the required behavior.
- For this Codex chat, "commit my finished changes" means changes in the
  Paperclip_Softwarehouse control-plane repo unless the owner explicitly says
  otherwise. Soar and Roost are product repos: their commits should normally be
  made by the Paperclip agents responsible for building/managing those apps,
  because they own the evidence gates and know when product work is ready.
- When Soar/Roost are dirty, this Codex should monitor, classify, and report the
  state, but should not commit product-agent work by default. If a product repo
  remains dirty because an agent is active or work is blocked, state the owner,
  reason, and relevant files instead of silently cleaning it up.
- Owner standing deployment preference as of 2026-07-11: constructive
  Soar/Roost delivery pushes that satisfy the existing DRE/SPA/QVE evidence
  gates may proceed without asking again when the expected effect is a normal
  Coolify auto-redeploy. After such a push, agents must verify the redeploy,
  resource health, production reachability, and relevant smoke/readback
  evidence, then report any failure as a concrete recovery issue. This standing
  direction does not authorize force-push, manual deploy, restart, rollback,
  protected smoke beyond the approved proof path, live account mutation, paid
  resource changes, or secret disclosure.
- Owner reaffirmation as of 2026-07-26: do not pause to ask which meaningful,
  evidence-backed commits should be pushed. When a coherent application batch
  has real constructive changes, a clean/non-divergent branch, relevant test
  evidence, and a known normal Coolify auto-redeploy path, push it
  autonomously. Then follow the release through Coolify/VPS, verify the public
  production surface in a browser, record the deployed SHA and evidence, and
  continue the local-to-remote delivery loop across all affected layers.

## Current Company Shape

- Paperclip is the control plane and product foundation.
- LuckySparrow Software House is the local autonomous company instance.
- Soar is the first active sellable/personal-capital app lane.
- Roost is the second active sellable app lane and part of the same hard
  delivery-to-VPS mission. It is also the intended company knowledge and
  management plane: twelve department systems plus company orchestration over
  shared engines for records, tables, tasks, pipelines, procedures, resources,
  knowledge, relations, metrics, decisions, integrations, and audit.
- Paperclip remains the agent control plane. It owns agents, execution,
  assignments, runs, routines, budgets, approvals, and evidence gates. It
  should use Roost through governed API/MCP interfaces rather than integrating
  ClickUp, Google Drive, and every future company tool directly into core.
- Product repositories remain the source of truth for product intent,
  architecture, code, tests, deployment contracts, and actual behavior. Roost
  consolidates and relates those sources without silently replacing them.
- The owner activated the Paperclip-to-Roost direction on 2026-07-22. A bounded
  local-Paperclip-to-hosted-Roost read-only canary may be planned and proved
  during V0 when it helps the transition, but it must not displace the
  Soar-first/Roost-second completion mission or authorize broad writes,
  provider mutation, direct database access, or secret disclosure.
- Soar and Roost remain in `11 Innovation` while they have internal/test users
  but are not ready to sell responsibly. Their transition to `02 Product` is
  governed by an explicit sale-readiness contract, not by registration or
  deployment alone.
- Featherly, Aviary, Nest, and other app ideas remain parked unless explicitly
  activated.

## Organizational Orientation Direction

The owner wants the agents to act as complementary parts of one autonomous
organization rather than as independent task executors. Paperclip should make
implicit human operating concepts explicit and inspectable: shared reality,
attention, time, causality, intent, commitments, decisions, uncertainty,
opportunity cost, capacity, reversibility, trust, collaboration norms, closure,
memory, learning, and external grounding.

This direction is coherence-first rather than deadline-first. In particular,
Paperclip should help agents make steady, goal-aligned progress on Soar and
Roost without imposing an artificial one-week completion promise. The canonical
architecture and delivery sequence is recorded in
`doc/plans/2026-07-15-organizational-orientation-system.md`.

Managers should maintain rolling, evidence-backed worker queues rather than a
fixed task count. `todo` means runnable work; `backlog` is reserve inventory.
While an active product target remains unfinished, each track should normally
have at least one runnable worker lane and a small planned reserve, subject to
per-agent WIP, same-repository serialization, protected gates, and real
dependencies.

## Current Stage 1 Operating Model

- Active app-factory core: strategy, product/design, operations/docs, agent
  governance, cost/asset support, technology delivery, QA/review/test,
  security/legal, deployment/reliability, and Soar/Roost product ownership.
- Out-of-scope roles remain paused: marketing, sales, customer service, broad
  HR, parked app PMs, and CEO proxy work.
- Direct owner-facing communication should go through `00 AIA` in Polish.
- Internal company reports, evidence, and cross-agent assets may remain
  English-first.
- Agents should not stop at preflight/report-only work. If the app is not
  owner-usable, they should route the next concrete child issue under `LUC-25`
  unless a true owner decision is required.

## Durable Policies

- Department map and naming convention:
  `.agents/state/softwarehouse-departments.md`.
- Secret requirements:
  `.agents/state/softwarehouse-secret-requirements.md`.
- Resource access matrix:
  `.agents/state/softwarehouse-resource-access-matrix.md`.
- Product architecture index:
  `.agents/state/softwarehouse-product-architecture-index.md`.
- Autonomous delivery architecture:
  `.agents/state/softwarehouse-autonomous-delivery-architecture.md`.
- Procedure and task lifecycle:
  `.agents/state/softwarehouse-procedure-system.md` and
  `.agents/state/softwarehouse-task-lifecycle-contract.md`.
- Owner interface:
  `.agents/state/softwarehouse-owner-interface-contract.md`.
- Stage 1 delivery foundation:
  `.agents/state/softwarehouse-stage1-delivery-foundation.md`.
- Knowledge governance:
  `docs/softwarehouse/17-knowledge-governance.md`.
- Roost company knowledge plane and integration boundary:
  `docs/softwarehouse/18-roost-company-knowledge-plane.md`.

Historical Stage 0/v0 files remain as background only and should not override
the active Stage 1 delivery mission.

## 2026-07-25 - Product Map board truth

- `LUC-1831`, `LUC-1833`, and `LUC-1834` are done with implementation and
  verification evidence. The Paperclip implementation baseline before the
  archive-memory commit is `2e5e07ca`; Soar is clean at `d3d163d83` and Roost
  at `3f8850c2`.
- `LUC-1832` is the only remaining Product Map integration lane. It owns a
  versioned read-only Paperclip-to-Roost portfolio projection and remains
  intentionally unassigned in `backlog` for the next governed work cycle.
- The owner-facing Roost route
  `/areas?area=00-ogolny&view=product-map` is locally built and
  browser-verified. It is not on the VPS: public Roost still reports
  `070b150f5477d701d462485aad8b91450d0c3d71`, while local Roost is
  `3f8850c2`.
- Product readiness remains evidence-scoped: Soar is `NO-GO`; Roost is
  guided-pilot-only. Healthy public probes are not commercial acceptance.
- No push or deployment occurred. The aggregate Softwarehouse status snapshot
  is stale and fail-closed; fresh source-control/runtime audits pass, no agent
  runs are live, and project mutation plus protected delivery remain disabled.
