# Capability Map

Last updated: 2026-08-10

## Purpose

This map names what the local software-house instance must be able to do for
application projects. It describes organizational capability, not only UI
features.

## Capability Hierarchy

```text
Capability -> Process -> Agent role -> Paperclip issue/routine -> Project files -> Evidence -> Status
```

## Capabilities

| Capability ID | Capability | Operator value | Current implementation | Status | Evidence | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| SH-CAP-001 | Project takeover baseline | Agents can scan a project before changing it. | Template backbone, documentation contracts, project-truth indexes, history dirs, and known-state refresh for Soar, Roost, and Featherly. | implemented | `softwarehouse/autonomous-operating-model.md`, `scripts/build-project-truth-indexes.mjs` | Keep indexes synchronized with authoritative project docs. |
| SH-CAP-002 | Hierarchical delegation | Work flows from portfolio/PM/lead roles into narrow specialist lanes. | Agent hierarchy, role instruction bundles, and active product managers for Soar, Roost, and Featherly. | implemented | `softwarehouse/agent-hierarchy.md`, `softwarehouse/instructions/roles/` | Keep one responsibility per issue/agent lane. |
| SH-CAP-003 | Architectural awareness | Agents can build and update a project graph of entities, relations, evidence, and gaps. | Architecture awareness layer script and graph exports. | implemented | `softwarehouse/architectural-awareness-layer.md`, `docs/graphs/architecture-awareness.json` | Run graph sync after meaningful project changes. |
| SH-CAP-004 | Evidence-first closure | Issues close only with proof, status, affected files, tests, and next blockers. | Shared instruction bundle and audit script. | implemented | `softwarehouse/instructions/shared/70-evidence-and-memory.md`, `scripts/audit-luckysparrow-softwarehouse.mjs` | Keep stale blocked/in-progress cleanup active. |
| SH-CAP-005 | Release/deploy governance | Coolify/VPS actions are gated, reversible, and redacted. | Coolify resource model, deploy safety instructions, secret placeholders. | implemented | `softwarehouse/coolify-resource-model.md`, `softwarehouse/instructions/shared/20-release-and-deploy-safety.md` | Reconcile `LUC-99` SHA/worker readiness. |
| SH-CAP-006 | Workspace boundary control | Stage 1 agents stay inside the approved active roots and never create helper artifacts directly under `/Aplikacje`. | Boundary audit script, archived parked projects, and explicit no-delete policy for sibling app folders. | implemented | `scripts/audit-softwarehouse-workspace-boundaries.mjs`, `pnpm run softwarehouse:workspace-boundary-audit` | Run after project/routine/workspace configuration changes and before widening autonomy. |
| SH-CAP-007 | Autonomous routine posture | Routines keep maps, status, regression, docs, and PM supervision alive. | Active routine set in Paperclip. | implemented | `node scripts/audit-luckysparrow-softwarehouse.mjs` | Tune routines based on live blocked/runnable state. |
| SH-CAP-008 | Multi-project expansion | Soar, Roost, and Featherly run as isolated active local app lanes while other experiments remain parked. | Three product managers, canonical singleton workspaces, project-aware classification, and cross-project isolation audit. | implemented | `softwarehouse/agent-roster.json`, `pnpm softwarehouse:cross-project-isolation-audit` | Preserve application identity and do not reactivate parked streams without owner scope. |
| SH-CAP-009 | AI-agent talent management | The softwarehouse improves its own agents, role boundaries, skills, routines, and instructions from evidence. | CHRO, AID, talent policy, learning loop, and agent-development review roles exist. | implemented baseline | `softwarehouse/talent-and-capability-system.md`, `softwarehouse/agent-roster.json` | Keep AID/CHRO active for agent-quality issues; avoid broad new roles without measured trial evidence. |
| SH-CAP-010 | Dream-to-architecture intake | User dreams in project `docs/architecture` become interpreted product intent, architecture maps, implementation lanes, and verification proof. | Product, UX, CTO, Delivery, specialist, QA, Security, Ops, and Docs/Memory roles cover the path. | implemented baseline | `softwarehouse/pipeline-model.md`, `docs/softwarehouse/03-delivery-workflow.md` | Require PMs to start app work from project architecture/docs before coding. |
| SH-CAP-011 | Local-first runtime bridge | Local Paperclip coordinates app work and exposes a bounded portfolio projection to Roost without transferring operational truth. | Versioned read-only projection, authenticated publisher/outbox, conflict/staleness state, and tests. | implemented | `server/src/services/roost-bridge-portfolio.ts`, `server/src/services/roost-product-map-publisher.ts` | Keep Paperclip as operational projection and Roost as durable intent/policy target. |
| SH-CAP-012 | Organizational orientation | Board and agents can share a bounded, sourced operating picture instead of independently reconstructing company state. | Deterministic `CompanySituation`, role-scoped heartbeat orientation, governed records, observations, outcomes, external signals, and deduplicated learning ingestion. | implemented baseline | `server/src/services/company-situation.ts`, `server/src/services/organizational-records.ts`, `server/src/services/organizational-observations.ts`, `scripts/run-softwarehouse-learning-loop.mjs`, `skills/paperclip/scripts/paperclip-organizational-memory.mjs`, `doc/plans/2026-07-15-organizational-orientation-system.md` | Calibrate promotion quality from validated evidence; keep records explicit and learning ingestion bounded. |
| SH-CAP-013 | Admission control | Work admission can drain, pause, reopen, and replay deferred wakes without losing evidence or bypassing safety. | Company/project controls are enforced in heartbeat paths and the current company control is evidence-backed and open. | implemented | `server/src/services/admission-control.ts`, `server/src/services/heartbeat.ts` | Keep reopen evidence and replay results inspectable. |
| SH-CAP-014 | Native supervision | Recurrent failures become findings, root causes, safeguards, interventions, and observation windows rather than repeated manual repair. | Native watchdog/daily cycles run at startup and periodically; shadow comparisons measure divergence. | implemented | `server/src/services/native-supervision-engine.ts`, `/api/companies/:id/supervision/snapshot` | Resolve attention-required comparisons through evidence, never by suppressing mismatches. |
| SH-CAP-015 | Calibrated autonomy decisions | The system can recommend, authorize only inside a graduated envelope, evaluate outcomes, interrupt unsafe work, and reconcile execution. | Decision model v2.1 has live samples, one evaluator class, an active constraint, and a RECOMMEND envelope. No automatic dispatch is claimed without canary or graduation. | calibrating | `server/src/services/autonomy-decision.ts`, `scripts/evaluate-autonomy-graduation.mjs` | Accumulate independent verdicts and accepted outcomes; do not fabricate execution volume. |
| SH-CAP-016 | ProductDelivery ledger | App work is traced from intent through implementation, review, integration, deployment observation, and independent outcome acceptance. | Persisted deliveries, tasks, transitions, outcomes, assignment fast path, and stalled-delivery supervision are active. | implemented | `server/src/services/deliveries.ts`, `scripts/run-autonomous-development-cycle.mjs` | Expand only through real, source-traceable product outcomes. |
| SH-CAP-017 | Inspectable work products | Deliverables are accessible from the board and grouped so one noisy issue cannot hide the rest of the portfolio. | Company artifacts default to task stacks, support search/filter/pagination, and attach to issue work products. | implemented | `ui/src/pages/Artifacts.tsx`, `server/src/services/company-artifacts.ts`, `doc/AGENT-ARTIFACTS.md` | Keep generated artifacts attached and deduplicated. |
| SH-CAP-018 | Extension completion gate | Additional solutions cannot silently stop at code, configuration, or an unused screen. | Machine-readable registry audits implementation, integration, live use, and proof during every control tick. | implemented | `softwarehouse/extension-utilization-registry.json`, `pnpm softwarehouse:extension-utilization` | Repair or explicitly retire any capability that falls below the gate. |

## Maintenance Rule

When a new software-house capability is added, update this map, the pipeline
registry, the relevant agent instruction file, and
`softwarehouse/extension-utilization-registry.json`. A capability is not
complete until all four audited dimensions pass: implementation, integration
with a real consumer, live runtime evidence, and inspectable proof. Partial
work must be repaired or explicitly retired; file or endpoint existence alone
is never completion evidence.
