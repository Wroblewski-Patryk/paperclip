# Evals and Regression Gates

Status: active softwarehouse operating contract
Date: 2026-07-04
Owner: 09 QVE with 09 TAE, 09 CRS, 09 DRE, 10 SPA, and 06 AIM

Evals are the durable memory of what Paperclip agents must keep doing correctly. They turn
experience from real work into repeatable checks before the same failure can return.

## Eval Types

| Type | Use when |
| --- | --- |
| `UNIT` | A small deterministic function, parser, policy helper, or service behavior can be checked directly. |
| `INTEGRATION` | Multiple Paperclip surfaces or product app layers must work together. |
| `PROMPTFOO` | Prompt or agent-instruction behavior needs repeatable prompt cases. |
| `LLM_JUDGE` | Human-like judgment is needed, with clear rubric and bounded examples. |
| `POLICY` | A workflow, permission, gate, or operating rule must be checked. |
| `REGRESSION` | A previous real failure must not recur. |

## When an Eval Is Required

Create or update an eval before closing work that changes or repairs:

- `AGENTS.md`, shared agent instructions, role instructions, prompts, skills, or routines
- policy gates, secrets access, workspace boundaries, approvals, budgets, or activation rules
- agent issue/task behavior, checkout/assignment behavior, blocker handling, or completion behavior
- adapter execution, tool access, command execution, artifact upload, or run-event parsing
- production deploy, Coolify/VPS handling, smoke testing, or monitoring behavior
- repeated failures, recovery-needed states, duplicate/circular tasks, or done-without-proof findings

## Regression Suite Rules

- Fixtures must be redacted and stable.
- Each eval must state expected behavior and judge criteria.
- Eval evidence must include an EvalRun result: `PASS`, `FAIL`, `FLAKY`, or `NEEDS_REVIEW`.
- `FLAKY` and `NEEDS_REVIEW` do not satisfy improvement-task closure.
- A failing eval creates or updates an AgentImprovementTask.
- A repeated real-world failure should be converted into a regression even if it starts as a manual
  policy check.

## Evidence Contract

Minimum eval evidence:

- eval name and type
- related agent or process
- source feedback or incident
- fixture or replay input path, when safe
- expected behavior
- judge criteria
- command, review, or policy check used
- EvalRun result and evidence refs

High-risk eval evidence also needs security and deployment/monitoring refs when the behavior touches
secrets, production, owner-linked credentials, external providers, paid services, or live trading.

## Improvement Task Close Gate

An AgentImprovementTask can move to `done` only when:

- the proposed change is implemented or explicitly replaced by a better one
- the affected docs, skills, prompts, policies, routines, or code are updated
- QVE or the delegated test owner records an EvalRun `PASS`
- CRS/SPA/DRE evidence exists when the change affects code quality, security, or deployment
- the issue handoff explains what changed and what future agents should do differently

If no executable test is possible, QVE must create a policy eval with a clear scenario and judge
criteria. The close gate is still EvalRun `PASS`.

## Stage 1 Regression Priorities

For Soar/Roost delivery, prioritize evals that prevent:

- agents stopping after reports instead of executable next work
- blocked items remaining blocked after the missing input exists
- parentless or unassigned delivery work
- broad work outside the approved Paperclip/Soar/Roost roots
- missing feature-slice traceability across docs, backend, frontend, workers, tests, and production
- unauthorized push, deploy, secret, paid-feature, or live-trading actions
- production smoke without redaction or without account-class clarity
