# Idea To Function Chain Playbook

Last updated: YYYY-MM-DD

## Purpose

Use this playbook to turn a product or architecture idea into a connected,
evidence-backed implementation path.

An idea is not ready for coding until it is described as a chain through the
application layers and classified against current code/proof reality.

## Idea Intake Shape

Every idea should answer:

| Field | Meaning |
| --- | --- |
| Idea ID | Stable identifier, for example `IDEA-001`. |
| Summary | One sentence. |
| User/operator value | Why this should exist. |
| Current owner | Product, architecture, module, or open decision owner. |
| Affected surfaces | UI, API, service, data, worker, agent, operations, UX, security. |
| Expected function chain | Trigger through final readback/evidence. |
| Current code status | Missing, partial, implemented, broken, unknown. |
| Current proof status | Not proven, local proof, browser proof, stage proof, production proof. |
| Risk | Low, medium, high, critical. |
| Next smallest task | Proof, design decision, implementation slice, or blocker. |

## Chain First, Code Second

Before implementation, sketch the chain:

```text
user/system trigger -> UI/component or API ingress -> client action/hook ->
API route -> controller/service -> domain function -> repository/data model ->
event/side effect -> readback/projection -> tests -> docs/evidence
```

For non-UI systems, replace the UI segment with the real trigger:

```text
schedule/webhook/message/job -> normalization -> policy/plan -> command ->
side effect -> audit/event -> readback -> tests -> docs/evidence
```

## Reality Classification

Use these statuses:

| Status | Meaning | Next action |
| --- | --- | --- |
| `missing` | No credible implementation found. | Design one vertical slice. |
| `partial` | Some chain nodes exist but key links are absent. | Fill or verify the missing links. |
| `implemented_not_verified` | Code appears present but proof is missing. | Create a verification task first. |
| `partially_verified` | Some scenarios pass; gaps are named. | Target the missing proof or failing scenario. |
| `verified_local` | Local proof exists. | Decide if stage/production proof is needed. |
| `verified` | Required proof exists for the target environment. | Avoid reopening unless scope changes. |
| `blocked` | External credential, decision, provider, or access is missing. | Record unblock owner/action. |
| `broken` | Fresh proof failed. | Create a narrow repair task. |

## Required Records

When an idea is accepted for work, create or update:

1. `docs/planning/idea-ledger.csv`
2. `docs/architecture/chains/chains.csv`
3. relevant `docs/architecture/registry/*.csv` rows
4. `docs/pipelines/pipeline-registry.md` if it introduces a new flow
5. module doc or module status row
6. task board / next steps

## Proof Rule

Do not let a feature jump from idea to "done" because code was written.

Completion requires proof appropriate to the chain:

- unit/integration tests for isolated logic
- API readback for backend behavior
- browser/mobile journey proof for UI behavior
- migration and persistence proof for data changes
- event/audit proof for side effects
- stage/production proof for deploy-sensitive behavior
- red-team or adversarial proof for AI/security-sensitive behavior

## Template

```text
Idea ID:
Summary:
Value:
Affected modules:
Affected layers:
Expected chain:
Current code status:
Current proof status:
Known blockers:
Risk:
Next smallest task:
Records to update:
Evidence path:
```
