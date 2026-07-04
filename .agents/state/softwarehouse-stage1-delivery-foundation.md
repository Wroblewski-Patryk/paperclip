# Softwarehouse Stage 1 Delivery Foundation

Last updated: 2026-07-04

Purpose: define the current Stage 1 operating state after Stage 0 configuration
was superseded by active autonomous delivery work.

## Stage 1 Mission

Paperclip is now running the first practical proof of LuckySparrow as an
autonomous softwarehouse. The proof is not "agents can write reports"; the
proof is that the company can deliver real applications through its operating
structure.

Hard parent issue:

- `LUC-25`: `00 General: Deliver Soar and Roost to Usable VPS Production`.

This parent must remain open until Soar and Roost are created, verified,
deployed to VPS, and usable by the owner.

## Stage Model

- Stage 0: historical configuration foundation. Achieved enough to start Stage
  1; do not use Stage 0 quiet-state rules as current operating rules.
- Stage 1: current. Autonomous app-factory delivery of Soar and Roost through
  Paperclip, with evidence, guarded deployment, and learning loops.
- Stage 2: future. Move Paperclip itself to VPS and operate with Roost as the
  company layer once Soar/Roost and Paperclip are ready.

## Active Scope

Active products:

- Soar.
- Roost.

Active work types:

- product/architecture/source-of-truth reconciliation;
- local implementation and repair;
- local tests and verification;
- review and evidence capture;
- documentation/index updates;
- safe source-control classification and commit/push readiness;
- Coolify/VPS deployment path for Soar/Roost;
- production smoke/user-flow proof;
- governed learning and procedure updates.

Out of scope unless separately approved:

- marketing, sales, and customer-service work;
- unrelated client work;
- Featherly, Aviary, Nest, and other parked product implementation;
- destructive infrastructure actions;
- raw secret exposure or secret value mutation;
- paid GitHub/cloud feature use;
- legal/customer/finance commitments;
- LIVE trading/order proof.

## Active App-Factory Core

The active core should include:

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

Paused unless separately approved:

- `03 CRO`;
- `05 CCO`, `05 CSM`;
- `06 CHRO`, `06 POP`;
- `11 APM`, `11 FPM`, `11 NPM`;
- `12 CEO`.

## Active Routine Posture

Active app-factory routines:

- `00 General: Owner Direction and Proposal Review`;
- `00 General: Softwarehouse Liveness and Active Work Review`;
- `04 Operations: Portfolio Truth and Project Index Review`;
- `04 Operations: PDCA Learning and Company Memory Review`;
- `06 People: Agent Hiring and Governance Review`;
- `07 Finance: Cost, Quota, and Budget Review`;
- `09 Technology: Evidence Gate and Definition of Done Review`;
- `09 Technology: Source Control and Deploy Readiness Review`;
- `10 Legal: Secrets Coolify and VPS Access Readiness Review`.

Historical/paused:

- `00 General - v1 Draft Paused - Controlled Activation Dry Run`.

Stage 1 cadence as of 2026-07-04:

- `00 General: Softwarehouse Liveness and Active Work Review`: every 30 minutes.
- `09 Technology: Evidence Gate and Definition of Done Review`: twice hourly.
- `09 Technology: Source Control and Deploy Readiness Review`: hourly.
- `04 Operations: PDCA Learning and Company Memory Review`: every 2 hours.
- `04 Operations: Portfolio Truth and Project Index Review`: every 2 hours.
- `00 General: Owner Direction and Proposal Review`: every 2 hours.
- `10 Legal: Secrets Coolify and VPS Access Readiness Review`: every 4 hours.
- `07 Finance: Cost, Quota, and Budget Review`: twice daily.
- `06 People: Agent Hiring and Governance Review`: twice daily.

These routines are intentionally faster than the original weekly Stage 0 draft
cadence because Stage 1 is active delivery. They should stay scoped to
Soar/Roost app creation, evidence, safety, cost awareness, and learning loops.
If routine-created work becomes noisy, duplicative, or circular, tighten the
cadence or pause the specific routine instead of broadening the backlog.

## Done Conditions

`LUC-25` is done only when all are true:

- Soar is deployed on VPS and usable by the owner.
- Roost is deployed on VPS and usable by the owner.
- Each app has inspectable architecture, implementation, local test, review,
  security/secrets, deployment, production smoke/user-flow, and residual-risk
  evidence.
- AIA provides an owner-facing Polish summary with exact URLs/status, evidence,
  remaining risks, and any manual decisions.
- Learning/procedure updates or proposals exist for material failures found on
  the path.

## Escalation

Agents should not stop at blockers by default. They should convert blockers
into concrete child issues when they can act safely. Escalate to the owner only
when the decision is genuinely about direction, risk, money, secrets,
destructive infrastructure, legal/customer commitments, or LIVE trading/order
proof.
