# Softwarehouse V1 Goals And Routines Audit

Last updated: 2026-07-12

Purpose: verify whether Paperclip goals and routines now guide the current
Stage 1 app-factory mission without pulling the company back to Stage 0
quiet/dry-run behavior.

## Verdict

The goals/routines layer is now aligned with active Stage 1 delivery.

Configuration readiness is high, but delivery readiness is still blocked by
source-control, deployment-provenance, worker-health, and credential-rotation
gates. See `docs/status/softwarehouse-full-configuration-audit-2026-07-12.md`.

The remaining gap is behavioral proof: agents must keep converting blockers
into executable work until Soar and Roost are usable on VPS. Configuration now
points in the right direction, but real closure evidence is still pending.

## Current Goal Tree

Governance source of truth:
`.agents/state/softwarehouse-goal-routine-governance.md`.

| Goal | Status | Owner | Purpose |
| --- | --- | --- | --- |
| `00 General: v0 Softwarehouse Readiness - Achieved` | Achieved | `00 AIA` | Historical Stage 0 readiness baseline. |
| `00 General: Stage 1 Softwarehouse Delivery to VPS` | Active | `00 AIA` | Current company-proof goal. Continue until Soar/Roost are usable on VPS and Stage 2 can be considered. |
| `11 Innovation: Soar Delivery to Usable VPS Production` | Active, child of Stage 1 delivery | `11 SPM` | Soar from current state to owner-usable VPS production with evidence. |
| `11 Innovation: Roost Delivery to Usable VPS Production` | Active, child of Stage 1 delivery | `11 RPM` | Roost from current state to owner-usable VPS production with evidence. |

## Current Hard Issue Tree

- `LUC-25`: hard parent for Soar/Roost usable VPS production.
- `LUC-26` through `LUC-32`: delivery control, Soar, Roost, technical
  implementation, VPS/Coolify deployment, verification, and security/secrets
  gates.
- Descendant issues may be created when they are concrete executable work and
  preserve traceability under `LUC-25`.

## Current Routine Set

Active routines:

| Routine | Owner | V1 purpose |
| --- | --- | --- |
| `00 General: Owner Direction and Proposal Review` | `00 AIA` | Convert owner notes/direction into Polish proposals, routed work, memory updates, or clarifying questions. |
| `04 Operations: Portfolio Truth and Project Index Review` | `04 COO` | Keep active lanes, repo paths, parked apps, and task hygiene aligned. |
| `04 Operations: PDCA Learning and Company Memory Review` | `04 COO` / `04 DSM` | Turn run lessons into governed memory/procedure/instruction improvements. |
| `06 People: Agent Hiring and Governance Review` | `06 AIM` | Handle hiring/role-change requests through governed AI workforce path. |
| `07 Finance: Cost, Quota, and Budget Review` | `07 CFO` | Review cost/quota/budget constraints and avoid unavailable paid-resource assumptions. |
| `09 Technology: Evidence Gate and Definition of Done Review` | `09 QVE` | Prevent completion without inspectable evidence and parent synthesis. |
| `09 Technology: Source Control and Deploy Readiness Review` | `09 DRE` | Check repo, branch, push, Coolify, and production-smoke readiness before deploy-impacting work. |
| `10 Legal: Secrets Coolify and VPS Access Readiness Review` | `10 SPA` | Verify secret refs, least privilege, and production mutation gates. |
| `[Softwarehouse] Continuation watchdog` | `09 CTO` | Every five minutes, select one legal next action and reuse its idle recurring `todo` issue without duplicate issue churn. |
| `[Softwarehouse] Longevity doctor and watchdog` | `09 CTO` | Audit health, source control, evidence, routines, and recovery posture hourly. |
| `[Softwarehouse] Longevity snapshot backup` | `04 DSM` | Preserve a daily redacted control-plane snapshot. |
| `[Softwarehouse] Organizational learning loop` | `04 DSM` | Convert repeated failures into bounded process improvements. |
| `[Softwarehouse] AI-agent development review` | `06 AIM` | Review agent effectiveness without waking paused HR roles. |

Paused routines:

- `00 General - v1 Draft Paused - Controlled Activation Dry Run`, because the
  controlled dry run has completed and is no longer the current operating mode.
- `00 General: Softwarehouse Liveness and Active Work Review`, because its
  purpose is superseded by the continuation and longevity watchdogs.

## Current Activation Rule

Stage 1 is active. Do not restart from the controlled dry-run sequence unless
the owner explicitly asks for a rollback.

Current rule:

1. Keep `LUC-25` as the hard parent until Soar/Roost are usable on VPS.
2. Allow app-factory agents and routines to continue local implementation,
   verification, deployment-readiness, and governed learning.
3. If work stalls after a report/preflight, create or prompt concrete next
   executable child issues under `LUC-25`.
4. Keep marketing, sales, customer service, broad HR, parked app PMs, and CEO
   proxy roles paused unless separately approved.
5. Preserve gates for raw secrets, destructive infrastructure, paid resources,
   legal/customer/finance commitments, and LIVE trading/order proof.

## Product Lifecycle Note

Soar and Roost remain under `11 Innovation` while they are being validated and
proven. Once an app is usable, supportable, deployable, and commercially
meaningful, agents should propose a governed move to `02 Product: AppName`
using `.agents/state/softwarehouse-innovation-to-product-lifecycle.md`.

## Current Verification Snapshot

Verified after Stage 1 delivery reconfiguration:

- Stage 1 delivery goal active.
- Soar/Roost delivery goals active.
- v0 readiness goal marked achieved.
- 13 app-factory/longevity routines active.
- Old controlled dry-run and superseded liveness routines paused.
- 30 in-scope agents idle/running.
- 9 out-of-scope agents paused.
- `LUC-25` plus delivery children active/open.
- New live issue titles normalized to English department prefixes.
