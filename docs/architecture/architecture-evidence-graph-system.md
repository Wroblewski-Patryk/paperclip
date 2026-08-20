# Architecture Evidence Graph System

Last updated: 2026-08-16

## Purpose

Use an architecture evidence graph when prose docs are no longer enough to know
where the project really stands.

The goal is a living proof system:

- meaningful features, routes, services, components, tests, documents, data
  models, workflows, events, agents, prompts, and configuration surfaces have
  stable node records;
- nodes link to dependencies, consumers, tests, docs, parent/child records, and
  evidence;
- function chains describe end-to-end execution from trigger to readback,
  side effects, tests, and documentation;
- missing records or missing evidence are treated as confidence gaps.

This system extends codebase maps, module docs, requirement matrices, and
module confidence ledgers. It does not replace them.

## Two Complementary Graphs

Paperclip uses two graph layers rather than forcing file inventory and live
operational assurance into one misleading status:

- the curated CSV registries below map architecture-significant files,
  functions, routes, tests, documents, and end-to-end chains;
- `softwarehouse/extension-utilization-registry.json` is the canonical
  Softwarehouse capability assurance graph. It names each extension's required
  implementation, integration, runtime probes, proof artifacts, dependencies,
  and downstream consumers.

`pnpm softwarehouse:extension-utilization` evaluates the assurance graph and
writes `report/softwarehouse-extension-utilization.latest.json`. Every
capability records the same `checkedAt` instant, its local four-dimensional
result, and its dependency-propagated result. A locally healthy consumer cannot
pass when a required capability fails. Missing relation endpoints, duplicate
relations, self-dependencies, and dependency cycles fail the audit.

The assurance graph is the answer to “is this Softwarehouse extension complete
and usable now?” The architecture registries answer “where is it implemented
and how is the detailed chain connected?” A behavior-changing task must update
both layers when their scope is affected; neither may be replaced by a new
parallel checklist.

## Source Of Truth

CSV registries are the machine-readable source of truth:

- `docs/architecture/registry/nodes.csv`
- `docs/architecture/registry/features.csv`
- `docs/architecture/registry/functions.csv`
- `docs/architecture/registry/components.csv`
- `docs/architecture/registry/api_routes.csv`
- `docs/architecture/registry/ui_elements.csv`
- `docs/architecture/registry/tests.csv`
- `docs/architecture/registry/agents.csv`
- `docs/architecture/registry/prompts.csv`
- `docs/architecture/registry/events.csv`
- `docs/architecture/registry/workflows.csv`
- `docs/architecture/registry/pages.csv`
- `docs/architecture/relations/dependencies.csv`
- `docs/architecture/relations/documentation-links.csv`
- `docs/architecture/relations/priority-test-links.csv`
- `docs/architecture/chains/chains.csv`

Registry owner and update contract:

- owner: CTO Architect (or delegated architecture-maintenance assignee);
- update in the same task as any behavior change touching routes, workflows,
  data model, tests, prompts, or docs in scope;
- do not merge behavior changes with stale registry/relations/chains rows.

Generated or project-specific files may include:

- `docs/architecture/nodes/*.md`
- `docs/architecture/chains/*.md`
- `docs/architecture/graphs/*`
- `docs/status/architecture-map-status.md`
- `docs/status/architecture-graph-drift.md`
- `docs/architecture/indices/*`

All generated graph exports are derived evidence. They support audits and drift
checks but never replace the canonical CSV files above.

Derived evidence outputs (for example scanner/export artifacts) are secondary
evidence, not source-of-truth:

- `docs/graphs/*`
- `docs/status/architecture-awareness-report.md`
- `docs/status/architecture-awareness-gap-register.md`
- `docs/status/*architecture*`

If a derived artifact conflicts with curated CSV registries, the curated CSV
records win and the scanner/export pipeline must be corrected.

## Record Contract

Every node record should include:

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | yes | Stable unique identifier. |
| `name` | yes | Human-readable name. |
| `type` | yes | Feature, page, component, hook, API route, service, data model, test, documentation, workflow, event, agent, prompt, config, etc. |
| `status` | yes | Implementation/proof state. |
| `layer` | yes | Frontend, backend, data, worker, testing, docs, agent-system, operations, fullstack, etc. |
| `module` | yes | Owning module or project area. |
| `feature` | yes | Parent feature or capability. |
| `description` | yes | What this node owns. |
| `file_path` | yes | Primary repo path or canonical doc path. |
| `related_files` | no | Supporting files separated by semicolons. |
| `parent_id` | no | Parent graph node. |
| `child_ids` | no | Child graph nodes separated by semicolons. |
| `depends_on` | no | Required upstream nodes. |
| `used_by` | no | Downstream consumers. |
| `tests_related` | no | Related test nodes. |
| `docs_related` | no | Related documentation nodes. |
| `risk_level` | yes | Low, medium, high, or critical. |
| `completion_percent` | yes | Evidence-backed completion estimate, not optimism. |
| `last_verified_at` | yes | ISO date of latest meaningful verification. |
| `verification_status` | yes | Evidence state. |
| `notes` | no | Caveats and residual risk. |

## Status Vocabulary

Use these statuses unless the project explicitly expands the vocabulary:

- `planned`
- `in_progress`
- `implemented`
- `implemented_not_verified`
- `partially_verified`
- `verified_local`
- `verified`
- `blocked`
- `broken`
- `missing`
- `deprecated`

No proof means no confidence. A node may exist as code, but if its tests,
runtime proof, connection proof, or documentation links are missing, it remains
`implemented_not_verified` or `partially_verified`.

## Function Chain Rule

Every user-facing or runtime-significant function should have a chain in
`docs/architecture/chains/chains.csv`.

Expected shape:

```text
UI trigger -> component -> hook/action -> API request -> backend route ->
controller/service -> repository/data model -> event/side effect ->
readback/projection -> tests -> docs
```

Agents must inspect the whole chain before answering "does this work?"

Correct workflow:

1. Find the feature node.
2. Follow its chain record.
3. Inspect every node and relation in the chain.
4. Check linked UI, API, data, tests, docs, events, agents, and side effects.
5. Report verified, partially verified, blocked, broken, or missing based on
   evidence.

Local file-only analysis is not sufficient for feature status.

## Missing-Connection Semantics

Treat these as graph defects:

- code exists without a node record;
- a feature node has no chain;
- an API route has no UI/API/test/doc relation where applicable;
- a node has no tests or explicit `not applicable` note;
- a docs node is missing for current architecture behavior;
- a relation references a missing node;
- a node points to a missing file.

## Maintenance Rule

Every new or changed function should update the graph in the same task:

1. add or update CSV node records;
2. add or update relation rows;
3. add or update function-chain rows;
4. regenerate graph files when tooling exists;
5. update requirement/module confidence when behavior or proof changed;
6. record residual missing links as `missing`, `blocked`, or
   `implemented_not_verified`, never as implicit success.

## Ownership And Update Contract

- Primary owner (registry integrity): CTO Architect
- Secondary owner (documentation linkage quality): Docs Memory Lead
- Supporting owners (test and runtime proof): QA Regression Lead and module
  owners for `server/`, `ui/`, and `packages/*`

Change policy:

1. Any task that changes architecture-significant behavior must update:
   - `docs/architecture/registry/*` rows for affected nodes;
   - `docs/architecture/relations/*` links for dependencies and docs;
   - `docs/architecture/chains/chains.csv` for affected end-to-end chains.
2. Scanner outputs under `docs/graphs/*` and `docs/status/*` must be treated as
   derived evidence snapshots and may not replace curated CSV edits.
3. If a relation references a missing node, fix the canonical CSV first and
   rerun scanners second.
