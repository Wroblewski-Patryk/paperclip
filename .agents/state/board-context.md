# Board Context

Last updated: 2026-07-15

## User Intent

The user wants Paperclip to become the control plane for LuckySparrow: an
autonomous softwarehouse that can create, maintain, verify, deploy, and later
sell or operate digital products with AI agents acting as an organized company.

The project is both product work and company-building work. The current proof
is V0: Paperclip remains the local Windows control plane while autonomously
creating, developing, deploying, and verifying Soar and Roost on VPS. Moving
Paperclip itself to VPS belongs to V1 built on this foundation.

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
ecosystem.

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

- Prefer repo-local memory for project context so older and newer chats can
  converge.
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
  delivery-to-VPS mission. It is also the intended application/tool layer for
  reusable digital company capabilities. Paperclip agents should ultimately
  consume those capabilities through governed MCP-first interfaces exposed by
  Roost, while Paperclip keeps authority, budgets, approvals, ownership, and
  execution evidence.
- The Roost/MCP direction is future architecture context and does not change
  current agent work or priorities. For now, agents build Roost according to
  its existing documentation. Paperclip-to-Roost integration begins only when
  the owner explicitly activates that later stage.
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

Historical Stage 0/v0 files remain as background only and should not override
the active Stage 1 delivery mission.
