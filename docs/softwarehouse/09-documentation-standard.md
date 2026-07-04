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

## Knowledge Layering

Use `docs/softwarehouse/17-knowledge-governance.md` before adding broad memory.
Project-specific truth stays in the product repo. Paperclip memory should link
to product source-of-truth files and preserve only the company-level fact needed
for coordination.
