# Documentation Standard

Status: active baseline
Date: 2026-06-03
Owner: Docs Memory Lead

Documentation is part of delivery. It should make future work faster and safer.

## Project Documentation Baseline

Prefer the project's existing structure. If none exists, aim for:

- `README.md`
- `docs/architecture.md`
- `docs/setup.md`
- `docs/deployment.md`
- `docs/testing.md`
- `docs/changelog.md`
- `docs/known-issues.md`
- `docs/adr/`
- `docs/runbooks/`
- `docs/qa/`

## Authority Contract

Every active application must provide:

- `docs/README.md` as the single human and agent front door;
- `docs/documentation-contract.json` as the machine-readable authority map;
- a bounded `defaultAgentContext` containing only current product,
  architecture, and status entrypoints.

The authority map must keep five meanings separate:

| Meaning | Canonical home | Rule |
| --- | --- | --- |
| Owner intent | `docs/product/` after capture and confirmation | Describes what the owner wants the product to do and for whom. A chat remains input until captured. |
| Assumption | `docs/product/assumptions.md` when a durable register is needed, or the project's declared open-decisions source | A hypothesis with provenance, status, review trigger, and dependants. It is never implementation authority while pending or conflicting. |
| Product contract | `docs/product/` | Approved user behavior, journeys, scope, non-goals, and acceptance boundary. |
| Architecture contract | `docs/architecture/` plus declared ADR/decision sources | Explains how the approved product is realized and which technical constraints implementation must preserve. |
| Observed truth | declared project-truth/status source plus code, tests, and runtime evidence | Records what exists and works now; it cannot silently redefine owner intent. |

For a new application, create `docs/documentation-contract.json`, one bounded
product entrypoint, one architecture entrypoint, and one observed-state
entrypoint before broad implementation. Create `docs/product/assumptions.md`
only when unresolved hypotheses actually exist; an empty assumptions register
is optional and must not become documentation ceremony.

Legacy owner ideas already stored in `docs/architecture/` remain valuable. On
first use, classify the relevant statement as approved product intent,
approved architecture, unresolved assumption, superseded material, or a
conflict. Move or link it to the narrowest canonical home instead of deleting
history or letting one paragraph carry several meanings indefinitely.

Every autonomous implementation candidate must contain the machine-readable,
human-readable `softwarehouse-product-intent-trace:v1` block defined in
`softwarehouse/instructions/shared/15-product-intent-from-architecture.md`.
Run `pnpm softwarehouse:product-intent-traceability` to inspect the portfolio.
Missing traceability routes one bounded PM reconciliation lane; it never
authorizes implementation and never just becomes a report-only warning.

Classify durable material as exactly one of `canonical`, `derived`,
`historical`, or `ephemeral`. A file location or the phrase "source of truth"
does not grant authority. New documents require a named owner and consumer,
authority class, update trigger, and supersession/link relationship. Prefer
updating an existing canonical source.

Default context must stay within its declared byte budget. History, generated
graphs, Obsidian navigation, task packets, evidence, and append-only agent state
are task-specific inputs. Active planning/state files larger than 250 KiB must
be compacted into a bounded current snapshot with history preserved outside the
default reading path.

Run `pnpm softwarehouse:documentation-hygiene` for the fast portfolio audit.
The audit must not report green when truth is stale, source is ahead of its
release branch, production identity is unknown, or the default context exceeds
budget.

## ADR Requirement

Create an ADR for non-trivial architecture decisions, data model changes, integration boundaries, deployment architecture, or security-affecting decisions.

ADR path:

`docs/adr/ADR-0001-title.md`

ADR fields:

- Status
- Context
- Decision
- Consequences
- Alternatives considered
- Related files / tasks

## Documentation Update Rules

- update docs when behavior, setup, deployment, commands, architecture, or known issues change
- record a no-doc-change reason when no docs are needed
- prefer additive updates over wholesale replacement
- keep evidence links and dates concrete
- classify durable knowledge as current truth, decision, evidence, lesson, or
  archive before adding it to operating memory
- do not promote run artifacts, CSV/JSON exports, or old issue comments into
  current truth unless an accountable owner records why they are still valid
- do not count a plan, report, map, or documentation-only commit as product
  progress unless documentation itself is the requested deliverable

## Knowledge Layering

Use `docs/softwarehouse/17-knowledge-governance.md` before adding broad memory.
Project-specific truth stays in the product repo. Paperclip memory should link
to product source-of-truth files and preserve only the company-level fact needed
for coordination.
