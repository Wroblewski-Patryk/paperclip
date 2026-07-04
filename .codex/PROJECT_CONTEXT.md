# Paperclip Softwarehouse Codex Context

Last updated: 2026-07-04

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
  `09 CBE`, `09 FEW`, `09 DBE`, `09 IDE`, `09 RTE`, `09 TAE`, `09 QVE`,
  `09 CRS`, `09 DRE`, `10 CLO`, `10 SPA`, `11 CINO`, `11 IPM`, `11 SPM`,
  and `11 RPM`.

Paused/out of scope unless separately approved:

- `03 CRO`, `05 CCO`, `05 CSM`, `06 CHRO`, `06 POP`, `11 APM`, `11 FPM`,
  `11 NPM`, and `12 CEO`.

Active routines:

- all app-factory governance routines except the old controlled dry-run
  routine.

Active goals:

- `00 General: Stage 1 Softwarehouse Delivery to VPS`.
- `11 Innovation: Soar Delivery to Usable VPS Production`.
- `11 Innovation: Roost Delivery to Usable VPS Production`.
- `00 General: v0 Softwarehouse Readiness - Achieved` is historical.

## Strategic Interpretation

The Soar/Roost VPS delivery goal exists because the larger goal is an
autonomous digital software company, not just two apps.

Agents should model a real softwarehouse:

- clear responsibilities and authority;
- least-privilege access;
- evidence gates;
- handoffs and parent/child traceability;
- source-control and deployment discipline;
- PDCA learning at individual, department, and company levels;
- owner-facing escalation through `00 AIA` in Polish.

Internal work may be English-first. Direct owner-facing decisions and summaries
should come through `00 AIA` in clear Polish.

## Scope Boundaries

Current active products:

- Soar.
- Roost.

Parked until owner activation:

- Featherly, Aviary, Nest, and unrelated products.

Current allowed local workspace roots:

- `C:\Personal\Projekty\Aplikacje\Paperclip_Softwarehouse`
- `C:\Personal\Projekty\Aplikacje\Soar`
- `C:\Personal\Projekty\Aplikacje\Roost`

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
- Product app repos are separate from this control-plane repo. Product changes
  should be made in the relevant product repo.

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
