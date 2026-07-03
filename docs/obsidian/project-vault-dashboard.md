# Paperclip_Softwarehouse Vault Dashboard

Updated: 2026-05-31

## Purpose

Use this as the first opened note in Obsidian. It makes the project readable for a human owner and for AI agents by connecting docs, graph files, function journeys, and cleanup work.

## Fast Routes

| Need | Open |
| --- | --- |
| Documentation map | [[documentation-map.md|Documentation Map]] |
| Docs README | _Missing: add README.md_ |
| Code/docs atlas | [[obsidian/code-to-docs-atlas.md|Code To Docs Atlas]] |
| Function journey hotlist | [[obsidian/function-journey-hotlist.md|Function Journey Hotlist]] |
| AI navigation | [[obsidian/ai-navigation-brief.md|AI Navigation Brief]] |
| Paperclip cleanup | [[obsidian/paperclip-cleanup-brief.md|Paperclip Cleanup Brief]] |

## Vault Inventory

- Markdown files: 110
- CSV files: 26
- JSON files: 4
- Canvas maps: 2
- Architecture registry nodes: 17
- Function chains: 2
- User action rows: not generated

## Folders

| Folder | Files | Entry |
| --- | --- | --- |
| . | 3 | [[documentation-map.md\|documentation-map.md]] |
| adapters | 9 | [[adapters/adapter-ui-parser.md\|adapters/adapter-ui-parser.md]] |
| api | 13 | [[api/activity.md\|api/activity.md]] |
| architecture | 3 | [[architecture/architecture-evidence-graph-system.md\|architecture/architecture-evidence-graph-system.md]] |
| automation | 2 | [[automation/guardrail-commands.md\|automation/guardrail-commands.md]] |
| cli | 3 | [[cli/control-plane-commands.md\|cli/control-plane-commands.md]] |
| companies | 1 | [[companies/companies-spec.md\|companies/companies-spec.md]] |
| decisions | 2 | [[decisions/README.md\|decisions/README.md]] |
| deploy | 10 | [[deploy/aws-ecs.md\|deploy/aws-ecs.md]] |
| graphs | 1 | [[graphs/architecture-graph.md\|graphs/architecture-graph.md]] |
| guides | 20 | [[guides/agent-developer/comments-and-communication.md\|guides/agent-developer/comments-and-communication.md]] |
| obsidian | 6 | [[obsidian/README.md\|obsidian/README.md]] |
| operations | 3 | [[operations/coolify-vps-deployment-contract.md\|operations/coolify-vps-deployment-contract.md]] |
| pipelines | 1 | [[pipelines/pipeline-registry.md\|pipelines/pipeline-registry.md]] |
| planning | 4 | [[planning/2026-05-27-full-takeover-audit-and-operating-baseline.md\|planning/2026-05-27-full-takeover-audit-and-operating-baseline.md]] |
| plans | 2 | [[plans/2026-03-13-issue-documents-plan.md\|plans/2026-03-13-issue-documents-plan.md]] |
| product | 5 | [[product/capability-map.md\|product/capability-map.md]] |
| quality | 1 | [[quality/quality-attribute-scenarios.md\|quality/quality-attribute-scenarios.md]] |
| releases | 2 | [[releases/release-template.md\|releases/release-template.md]] |
| specs | 2 | [[specs/agent-config-ui.md\|specs/agent-config-ui.md]] |
| start | 4 | [[start/architecture.md\|start/architecture.md]] |
| status | 13 | [[status/2026-05-27-architecture-graph-traceability-audit.md\|status/2026-05-27-architecture-graph-traceability-audit.md]] |

## Graph Status

Graph sources were found. Use the atlas and hotlist before code or docs changes.

### Node Types

| Type | Count |
| --- | --- |
| feature | 5 |
| api_route | 4 |
| page | 4 |
| workflow | 4 |

### Chain Statuses

| Status | Count |
| --- | --- |
| partially_verified | 1 |
| verified_local | 1 |

## Dataview: Open Tasks

```dataview
TASK
FROM ""
WHERE !completed
SORT file.path ASC
LIMIT 80
```
