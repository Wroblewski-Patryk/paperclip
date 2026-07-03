# Documentation Map

Updated: 2026-05-27

This is the main entrypoint for the canonical Softwarehouse Operating System
Paperclip project/workspace instance: the local autonomous software-house layer
that coordinates agents working on application projects under
`C:/Personal/Projekty/Aplikacje`.

Current docs describe the operating system and canonical rules. Historical
task files, old plans, audits, proof artifacts, release packets, and raw
generated outputs belong in `history/`, not in canonical `docs/`.

## Current Documentation Status

- Latest operating baseline (LUC-259): `docs/planning/2026-05-27-full-takeover-audit-and-operating-baseline.md`
- V1 acceptance test matrix for SPEC gates (LUC-270): `docs/planning/2026-05-27-v1-acceptance-test-matrix.md`
- Latest architecture-awareness report: `docs/status/architecture-awareness-report.md`
- Current gap register and owner lanes: `docs/status/architecture-awareness-gap-register.md`
- Project consolidation note (2026-05-27): LUC-269 was moved from archived duplicate `Paperclip_Softwarehouse` project into canonical `Softwarehouse Operating System` with canonical local workspace binding.
- Canonical status updates should be logged under `docs/status/` and linked here.

## Choose A Map

| Need | Go to |
| --- | --- |
| Product intent, scope, roadmap, user value, limits | `docs/product/problem-statement.md`, `docs/product/capability-map.md` |
| Durable decisions and ADRs | `docs/decisions/README.md` |
| System shape, contracts, modules, architecture truth | `softwarehouse/architectural-awareness-layer.md`, `docs/graphs/architecture-graph.md` |
| End-to-end user/system flows across layers | `docs/pipelines/pipeline-registry.md` |
| Deploy, smoke, rollback, release gates, operator proof | `docs/operations/service-topology.md`, `softwarehouse/coolify-resource-model.md` |
| Coordinator startup, active state, validation, proof lookup | `softwarehouse/autonomous-operating-model.md`, `softwarehouse/operating-processes.md` |
| Agent hierarchy, responsibilities, instruction bundles | `softwarehouse/agent-hierarchy.md`, `softwarehouse/instructions/` |

## Choose A Work Route

| Situation | Start With | Then Check | Close By Updating |
| --- | --- | --- | --- |
| New coordinator chat or continuation | `softwarehouse/autonomous-operating-model.md` | Paperclip audit, Soar project state, active issues/routines | issue comments, project docs, root index |
| Product or scope question | `docs/product/problem-statement.md` | `docs/product/capability-map.md`, idea ledger, current focus | product docs or open decisions |
| New idea or feature concept | `docs/planning/idea-to-function-chain-playbook.md` | pipelines, architecture graph, module docs | idea ledger, chain registry, next task |
| Architecture or ownership change | `softwarehouse/architectural-awareness-layer.md` | graph exports, agent roster, role boundaries | architecture docs, graph CSVs |
| Feature-chain or impact analysis | `docs/architecture/architecture-evidence-graph-system.md` | `docs/architecture/registry/*.csv`, `docs/architecture/relations/dependencies.csv`, `docs/architecture/chains/chains.csv` | graph registries, status exports |
| Runtime, worker, agent, or side-effect change | `docs/operations/service-topology.md` | pipelines, tests, operations runbooks | architecture, runtime playbook, evidence |
| Release, deploy, rollback, or production proof | `docs/operations/environment-matrix.md` | operations runbooks, system health, release history | operations docs, system health, release evidence |
| Need proof for a claim | `history/history-overview.md` | `history/evidence/`, `history/releases/`, `history/audits/` | task record and relevant state file |

## Current Source Of Truth

| Path | Role | Primary entry |
| --- | --- | --- |
| `docs/product/` | Product scope, users, capabilities, success metrics, and limits for this software-house instance. | `docs/product/problem-statement.md` |
| `docs/decisions/` | Accepted, rejected, proposed, and superseded decisions. | `docs/decisions/README.md` |
| `docs/architecture/` | Canonical graph, traceability, capability mapping, and architecture-awareness exports. | `docs/architecture/architecture-evidence-graph-system.md` |
| `softwarehouse/` | Operating model, hierarchy, role instructions, routines, Coolify model, and autonomous governance. | `softwarehouse/README.md` |
| `docs/pipelines/` | End-to-end organizational and engineering flows across intake, graph, delegation, proof, and closure. | `docs/pipelines/pipeline-registry.md` |
| `docs/planning/` | Idea intake, work packages, and project improvement queue. | `docs/planning/idea-ledger.csv` |
| `docs/operations/` | Living local runtime, Paperclip instance topology, Soar/Coolify gates, smoke, rollback, and operator runbooks. | `docs/operations/service-topology.md` |
| `docs/releases/` | Release trains, release scopes, validation gates, and release evidence index. | `docs/releases/release-train.md` |
| `docs/quality/` | Quality attribute scenarios and non-functional release gates. | `docs/quality/quality-attribute-scenarios.md` |
| `docs/automation/` | Tooling and command safety contracts for agents and operators. | `docs/automation/tooling-contract.md` |
| `history/` | Completed audits, task evidence, proof packets, and operational memory snapshots. | `history/history-overview.md` |

## Historical Lookup

Use `history/history-overview.md` when reconstructing what happened before.

Historical files can support claims, but they do not replace current docs. If a
historical file describes current behavior, promote the distilled truth into
the owning current document and link back to the historical evidence.

## Useful Documentation Standard

A current doc is useful only if a future reader can answer:

1. what source owns this truth;
2. which code, route, module, workflow, operation, or product decision it
   affects;
3. what evidence proves the current status;
4. which graph, pipeline, module, or ledger row must change when this truth
   changes.

If a file mainly answers "what happened before", move it to `history/` or link
to the historical record from the current owner doc.

## Maintenance Rule

Every feature, route, module, data model, pipeline, deployment behavior, agent
behavior, or test coverage change must update the matching traceability docs in
the same task.

## Obsidian Vault Layer

Start at `docs/obsidian/project-vault-dashboard.md` for Obsidian navigation, AI read order, graph/chain review, and Paperclip cleanup delegation.
