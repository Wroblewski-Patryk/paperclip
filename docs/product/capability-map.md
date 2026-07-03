# Capability Map

Last updated: 2026-06-19

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
| SH-CAP-001 | Project takeover baseline | Agents can scan a project before changing it. | Template backbone, project docs, history dirs, known-state refresh command. | implemented | `softwarehouse/autonomous-operating-model.md`, Soar `docs/status/known-state-readiness.md` | Apply to Roost when intake begins. |
| SH-CAP-002 | Hierarchical delegation | Work flows from portfolio/PM/lead roles into narrow specialist lanes. | Agent hierarchy, role instruction bundles, project managers for Soar/Roost. | implemented | `softwarehouse/agent-hierarchy.md`, `softwarehouse/instructions/roles/` | Keep one responsibility per issue/agent lane. |
| SH-CAP-003 | Architectural awareness | Agents can build and update a project graph of entities, relations, evidence, and gaps. | Architecture awareness layer script and graph exports. | implemented | `softwarehouse/architectural-awareness-layer.md`, `docs/graphs/architecture-awareness.json` | Run graph sync after meaningful project changes. |
| SH-CAP-004 | Evidence-first closure | Issues close only with proof, status, affected files, tests, and next blockers. | Shared instruction bundle and audit script. | implemented | `softwarehouse/instructions/shared/70-evidence-and-memory.md`, `scripts/audit-luckysparrow-softwarehouse.mjs` | Keep stale blocked/in-progress cleanup active. |
| SH-CAP-005 | Release/deploy governance | Coolify/VPS actions are gated, reversible, and redacted. | Coolify resource model, deploy safety instructions, secret placeholders. | implemented | `softwarehouse/coolify-resource-model.md`, `softwarehouse/instructions/shared/20-release-and-deploy-safety.md` | Reconcile `LUC-99` SHA/worker readiness. |
| SH-CAP-006 | Root portfolio radar | `/Aplikacje` shows project structure readiness and links to project docs. | Root index updater and audit drift check. | implemented | `/Aplikacje/APPLICATIONS_INDEX.md`, `scripts/install-root-applications-index-updater.mjs` | Refresh after each project audit/commit. |
| SH-CAP-007 | Autonomous routine posture | Routines keep maps, status, regression, docs, and PM supervision alive. | Active routine set in Paperclip. | implemented | `node scripts/audit-luckysparrow-softwarehouse.mjs` | Tune routines based on live blocked/runnable state. |
| SH-CAP-008 | Multi-project expansion | Soar and Roost can run as active local app lanes, while Aviary/Nest/Featherly stay prepared until explicitly activated. | Soar and Roost have project managers and workspace policies; future-app PMs exist but stay paused while parked. | implemented baseline | `pnpm softwarehouse:two-project-readiness`, `pnpm softwarehouse:executive-health` | Activate future PMs only when the board promotes that app into active delivery. |
| SH-CAP-009 | AI-agent talent management | The softwarehouse improves its own agents, role boundaries, skills, routines, and instructions from evidence. | CHRO, AID, talent policy, learning loop, and agent-development review roles exist. | implemented baseline | `softwarehouse/talent-and-capability-system.md`, `softwarehouse/agent-roster.json` | Keep AID/CHRO active for agent-quality issues; avoid broad new roles without measured trial evidence. |
| SH-CAP-010 | Dream-to-architecture intake | User dreams in project `docs/architecture` become interpreted product intent, architecture maps, implementation lanes, and verification proof. | Product, UX, CTO, Delivery, specialist, QA, Security, Ops, and Docs/Memory roles cover the path. | implemented baseline | `softwarehouse/pipeline-model.md`, `docs/softwarehouse/03-delivery-workflow.md` | Require PMs to start app work from project architecture/docs before coding. |
| SH-CAP-011 | Local-first runtime bridge | Local Paperclip can coordinate app work before VPS scaling, with Roost/CompanyCore integration treated as a future local/network bridge. | Local API, workspace policies, project docs, and Roost PM lane exist. | planned | `softwarehouse/paperclip-app-feature-backlog.md`, Roost project entry | Design a local Paperclip-to-Roost data bridge before making Roost the source of business truth. |

## Maintenance Rule

When a new software-house capability is added, update this map, the pipeline
registry, and the relevant agent instruction file.
