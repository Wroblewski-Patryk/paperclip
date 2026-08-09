# Softwarehouse Intake Templates

Status: active baseline
Date: 2026-06-03
Owner: Product Lead

Use these templates at issue intake, handoff, review, and closure. They are the
default operator path until Paperclip has a dedicated issue-template picker in
the board UI.

## Default Intake Rule

Every new delivery issue should include:

- process class from `docs/softwarehouse/01-process-map.md`
- PDCA contract: PLAN, DO, CHECK, ACT
- Definition of Ready fields from `docs/softwarehouse/04-definition-of-ready.md`
- acceptance criteria
- risk and constraints
- verification or proof method
- receiver, reviewer, or next owner
- the `protected-credential-proof:v1` preflight when convergence, recovery,
  observability, or release proof may require protected access

If the request is incomplete, keep the issue in intake or discovery and fill the
missing fields from local docs before delegating implementation.

## Template Selection

| Work type | Template | Use when |
| --- | --- | --- |
| Task / handoff | `task-template.md` | Creating a standard Paperclip issue or child issue. |
| Bug / incident | `bug-report-template.md` | Recording a symptom, reproduction path, impact, and regression proof. |
| Feature | `feature-spec-template.md` | Describing user value, non-goals, behavior, contracts, and release impact. |
| QA proof | `qa-checklist-template.md` | Asking QA or test automation to verify acceptance criteria. |
| Release / deploy | `release-checklist-template.md` | Preparing or reviewing build, deploy, smoke, rollback, and release decision. |
| Work report | `work-report-template.md` | Closing any code, docs, proof, or coordination lane with evidence. |
| ADR | `adr-template.md` | Recording non-trivial architecture, integration, data, or security decisions. |
| Agent role | `agent-role-template.md` | Drafting or updating role responsibility files. |

## Paperclip Issue-Document Defaults

When a template is too large for the issue description, create an issue document
with a stable key:

| Document key | Template |
| --- | --- |
| `plan` | `task-template.md` or `feature-spec-template.md` |
| `bug` | `bug-report-template.md` |
| `qa` | `qa-checklist-template.md` |
| `release` | `release-checklist-template.md` |
| `work-report` | `work-report-template.md` |
| `adr` | `adr-template.md` |

Issue comments should link the document and state the next owner. Documents are
evidence; the issue status must still be set to `done`, `in_review`, `blocked`,
or `todo` according to the durable disposition.
