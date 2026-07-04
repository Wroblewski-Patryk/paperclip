# Softwarehouse Agent Role Readiness Audit

Last updated: 2026-07-04

Source: Paperclip API checks, managed instruction bundle inspection,
conversation requirements, and Stage 1 activation state.

## Verdict

Agent role configuration is strong enough for active Stage 1 app-factory work.

Current estimated readiness: about 95%.

The remaining gap is not "more documentation before start"; it is real behavior
calibration while agents deliver Soar and Roost to usable VPS production under
`LUC-25`.

## Current Stage 1 Role Posture

Active app-factory core:

- `00 AIA`;
- `01 CSO`;
- `02 CPO`, `02 UID`, `02 UXW`, `02 WPM`;
- `04 COO`, `04 DPM`, `04 DSM`;
- `06 AIM`;
- `07 CFO`;
- `08 CAO`;
- `09 CTO`, `09 TSA`, `09 CBE`, `09 FEW`, `09 DBE`, `09 IDE`, `09 RTE`,
  `09 TAE`, `09 QVE`, `09 CRS`, `09 DRE`;
- `10 CLO`, `10 SPA`;
- `11 CINO`, `11 IPM`, `11 SPM`, `11 RPM`.

Paused/out of current scope:

- `03 CRO`, `05 CCO`, `05 CSM`, `06 CHRO`, `06 POP`, `11 APM`, `11 FPM`,
  `11 NPM`, `12 CEO`.

## Verified Strengths

- 38 agents exist.
- 38/38 agents use `codex_local`.
- 38/38 agents point at local Codex model configuration.
- 38/38 agents have a role scope.
- 38/38 agents have a working profile using Big Five-style traits.
- 38/38 agents include shared company, standards, learning, hiring,
  secrets/deploy, flow, department, resource, product architecture,
  delegation, closure, gap detection, procedure, owner-interface, and
  cost/token/context references.
- Only `06 AIM (AI Agent Manager)` can create agents.
- Soar and Roost are the only active product lanes for Stage 1 delivery.
- Featherly, Aviary, and Nest remain parked until owner activation.
- Paperclip exposes cost, budget, and quota endpoints.
- The local Codex CLI wrapper responds to `--version`.

## Main Gaps To Calibrate During Stage 1

1. Runtime behavior and role handoffs.
   The active test is whether agents keep routing concrete implementation,
   verification, deploy, and evidence work until `LUC-25` is genuinely done.

2. Assignment authority enforcement.
   `reportsTo` is correctly configured and shared instructions now require
   reporting-tree routing, but the live access layer still grants broad
   `tasks:assign` to all 38 agents. This is acceptable as a compatibility
   posture during active Stage 1 only if agents obey the chain-of-command
   contract. Future hardening should migrate specialists toward
   `tasks:assign_scope` and add an audit for direct cross-department
   assignments that bypass managers.

3. Monetary budget policy.
   Paperclip can report budgets/costs/quota, but hard company/agent limits
   remain an owner decision. CFO should surface practical recommendations from
   observed Stage 1 usage.

4. Role/personality calibration.
   Working profiles are present and role-aligned, but actual behavior should be
   adjusted through governed learning packets if Stage 1 reveals recurring
   issues.

5. Product-specific playbooks.
   Agents know to start from Soar/Roost `docs/architecture`; deeper playbooks
   should be created from actual delivery findings rather than invented.

## What "100%" Requires

- Soar and Roost reach owner-usable VPS production.
- AIA can summarize owner-facing decisions/blockers in Polish without noise.
- Parent/child reporting stays coherent under active delivery pressure.
- Evidence gates prevent false completion.
- Production/deploy/secret/cost gates are respected while still allowing
  necessary delivery progress.
- Learning packets improve routines/procedures/instructions after failures.

## Operating Decision

Do not create new permanent agents just because a theoretical softwarehouse
could be larger. Use the active 29-role app-factory core, observe real gaps,
and let `06 AIM` propose hiring only through the hiring procedure when a
concrete repeated gap appears.

## Role Placement Review - UX/UI/Product/Technology

The current placement of `02 UXW`, `02 UID`, and `02 WPM` under `02 CPO` is
correct for Stage 1.

Rationale:

- `02 CPO` owns product shape, acceptance quality, UX direction, and product
  handoff standards.
- `02 UXW` owns flows, interaction quality, view maps, and design acceptance.
- `02 UID` owns visual interface quality, layout evidence, UI screenshots, and
  visual consistency.
- `02 WPM` owns web product requirements, user value, non-goals, acceptance
  criteria, and release slices.

These are product/design accountabilities, not technology implementation
accountabilities. They should collaborate closely with `09 FEW`, `09 QVE`, and
`09 CTO`, but they should not report to `09 CTO` unless the role is changed
from product/design authority into engineering implementation.

Recommended operating model:

- keep `02 UXW`, `02 UID`, and `02 WPM` under `02 CPO`;
- route implementation work to `09 CTO`/`09 FEW` through the reporting tree;
- route visual/UX acceptance back to `02 CPO` and the relevant product PM;
- if repeated design-system engineering gaps appear, let `06 AIM` evaluate a
  new hybrid role rather than moving UX/UI into Technology prematurely.

This preserves a useful tension: Product defines and accepts the user
experience; Technology implements and proves it.
