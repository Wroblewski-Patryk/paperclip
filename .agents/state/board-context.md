# Board Context

Last updated: 2026-07-22

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
