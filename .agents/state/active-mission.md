# Active Mission

## 2026-07-04 Stage 1 Hard Delivery And Company Proof

Paperclip is now being used as the operating control plane for a practical
proof of LuckySparrow as an autonomous softwarehouse. Stage 0 setup is
historical. Current work is active Stage 1 delivery until Soar and Roost are
usable on VPS and Stage 2 can be considered.

## Hard Delivery Parent

- `LUC-25`: `00 General: Deliver Soar and Roost to Usable VPS Production`.

Critical children:

- `LUC-26`: delivery control.
- `LUC-27`: Soar build-to-production execution.
- `LUC-28`: Roost build-to-production execution.
- `LUC-29`: technical implementation routing and repo execution.
- `LUC-30`: VPS/Coolify deployment execution path.
- `LUC-31`: production readiness verification.
- `LUC-32`: security, secrets, and production safety gate.

Do not allow `LUC-25` to close for plans, preflight reports, or task-tree
creation. Done requires Soar and Roost to be created, verified, deployed to
VPS, and usable by the owner.

## Mission Interpretation

This goal is not only about two apps. It is the first full-company proof that
Paperclip agents can behave like a human softwarehouse:

- clear role ownership;
- top-down delegation and parent/child traceability;
- local implementation and review;
- evidence-based QA;
- safe deployment discipline;
- least-privilege secret and tool access;
- owner-facing Polish escalation through AIA;
- PDCA learning at individual, department, and company levels.

Agents should not stop at blockers by default. If a blocker can be converted
into safe executable work, create/route the next child issue. Escalate to the
owner only for genuine direction, risk, money, secrets, destructive
infrastructure, legal/customer commitments, or LIVE trading/order proof.

## Active Scope

Active products:

- Soar.
- Roost.

Allowed local workspace roots:

- `C:\Personal\Projekty\Aplikacje\Paperclip_Softwarehouse`
- `C:\Personal\Projekty\Aplikacje\Soar`
- `C:\Personal\Projekty\Aplikacje\Roost`

The parent `C:\Personal\Projekty\Aplikacje` folder is not an agent workspace.
Do not create root helper folders/indexes there, and do not delete or clean
sibling app folders without explicit owner approval.

Active work:

- architecture/source-of-truth checks;
- local implementation and repair;
- tests, review, and evidence;
- documentation/index updates;
- source-control classification and commit/push readiness;
- Coolify/VPS deployment path;
- production smoke/user-flow proof;
- governed learning/procedure updates.

Out of scope unless separately approved:

- marketing, sales, customer service;
- unrelated client work;
- Featherly, Aviary, Nest, and parked products;
- broad HR;
- executive proxy decisions;
- paid GitHub/cloud features;
- destructive infrastructure actions;
- raw secret exposure or secret value mutation;
- legal/customer/finance commitments;
- LIVE trading/order proof.

## Active App-Factory Core

- `00 AIA`, `01 CSO`, `02 CPO`, `02 UID`, `02 UXW`, `02 WPM`, `04 COO`,
  `04 DPM`, `04 DSM`, `06 AIM`, `07 CFO`, `08 CAO`, `09 CTO`, `09 TSA`,
  `09 EDL`, `09 CBE`, `09 FEW`, `09 DBE`, `09 IDE`, `09 RTE`, `09 TAE`,
  `09 QVE`, `09 CRS`, `09 DRE`, `10 CLO`, `10 SPA`, `11 CINO`, `11 IPM`,
  `11 SPM`, and `11 RPM`.

Paused/out of scope unless separately approved:

- `03 CRO`, `05 CCO`, `05 CSM`, `06 CHRO`, `06 POP`, `11 APM`, `11 FPM`,
  `11 NPM`, and `12 CEO`.

## Current Goal/Routine Posture

Goals:

- `00 General: v0 Softwarehouse Readiness - Achieved` is historical.
- `00 General: Stage 1 Softwarehouse Delivery to VPS` is active.
- `11 Innovation: Soar Delivery to Usable VPS Production` is active.
- `11 Innovation: Roost Delivery to Usable VPS Production` is active.

Routines:

- 9 app-factory routines are active.
- The old controlled-dry-run routine is paused/historical.

## Durable References

Read these first for current work:

- `.agents/state/softwarehouse-stage1-delivery-foundation.md`
- `.agents/state/current-focus.md`
- `.agents/state/softwarehouse-v1-goals-routines-audit.md`
- `.agents/state/softwarehouse-complementarity-audit.md`
- `.agents/state/softwarehouse-agent-role-readiness-audit.md`
- `.agents/state/softwarehouse-autonomous-delivery-architecture.md`
- `.agents/state/softwarehouse-task-lifecycle-contract.md`
- `.agents/state/softwarehouse-owner-interface-contract.md`
- `docs/softwarehouse/17-knowledge-governance.md`

Historical Stage 0 baseline remains in:

- `.agents/state/softwarehouse-stage0-foundation.md`
- `.agents/state/softwarehouse-v0-readiness-audit.md`
