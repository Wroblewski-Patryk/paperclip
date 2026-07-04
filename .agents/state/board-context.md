# Board Context

Last updated: 2026-07-04

## User Intent

The user wants Paperclip to become the control plane for LuckySparrow: an
autonomous softwarehouse that can create, maintain, verify, deploy, and later
sell or operate digital products with AI agents acting as an organized company.

The project is both product work and company-building work. The current proof
is whether agents can deliver Soar and Roost to usable VPS production while
preserving evidence, safety gates, learning, and a calm owner-facing board
view.

## Current Stage

Stage 1 is active.

Hard parent:

- `LUC-25`: `00 General: Deliver Soar and Roost to Usable VPS Production`.

Stage 1 continues until:

- Soar is usable by the owner on VPS.
- Roost is usable by the owner on VPS.
- Evidence exists for architecture alignment, implementation, local tests,
  review, security/secrets, deployment, production smoke/user-flow proof, and
  residual risks.
- Paperclip has learned from the work through governed PDCA packets/procedure
  updates.

Stage 2 begins only after Paperclip itself is ready to move to VPS and operate
with Roost as part of the autonomous company layer.

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
- Finish file-changing work with a commit. If a change is not ready to commit,
  explicitly record why it is blocked and which files remain dirty; do not leave
  completed work as an unexplained dirty worktree.

## Current Company Shape

- Paperclip is the control plane and product foundation.
- LuckySparrow Software House is the local autonomous company instance.
- Soar is the first active sellable/personal-capital app lane.
- Roost is the second active sellable app lane and part of the same hard
  delivery-to-VPS mission.
- Featherly, Aviary, Nest, and other app ideas remain parked unless explicitly
  activated.

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

Historical Stage 0/v0 files remain as background only and should not override
the active Stage 1 delivery mission.
