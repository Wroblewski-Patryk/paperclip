# Agent Feedback Loop

Status: active softwarehouse operating contract
Date: 2026-07-04
Owner: 04 DSM with 09 QVE, 10 SPA, 09 DRE, 06 AIM, and 00 AIA

The feedback loop converts observations about agent behavior into safer procedures, better evals,
and targeted improvement tasks.

## Feedback Sources

| Source | Typical trigger |
| --- | --- |
| `HUMAN` | Owner notes, approvals, corrections, or rejected actions. |
| `MODEL` | Supervisor detects inconsistency, weak reasoning, missing evidence, or poor handoff. |
| `QA` | Verification finds a broken user flow, missing regression, or incomplete acceptance proof. |
| `SECURITY` | Secrets, permissions, production, workspace, or sensitive-data rule is at risk. |
| `TEST` | Unit, integration, browser, smoke, or policy eval fails. |
| `MONITORING` | Stale run, blocked issue, recovery-needed state, deploy failure, or health regression. |

## Severity

| Severity | Meaning | Required response |
| --- | --- | --- |
| `LOW` | Minor friction or clarity gap. | Record feedback and improve docs/routine when useful. |
| `MEDIUM` | Work slowed, evidence weak, or handoff unclear. | Create or update eval when repeated or role-relevant. |
| `HIGH` | Delivery blocked, repeated failure, unsafe scope, or done-without-proof. | Create AgentImprovementTask and eval/regression gate. |
| `CRITICAL` | Secret exposure, destructive action, unauthorized production mutation, live trading risk, or major data loss. | Pause unsafe path, escalate to AIA/SPA/DRE, create improvement task and regression gate. |

## Triage Flow

1. Identify the source run, issue, agent, and affected process.
2. Write a redacted summary with evidence refs.
3. Classify severity and source.
4. Decide whether the feedback is one-off, repeated, policy-relevant, or high risk.
5. If repeated or high risk, create or update AgentEval.
6. If eval fails or the fix requires process change, create AgentImprovementTask.
7. Route the improvement to the smallest responsible owner.
8. Require EvalRun `PASS` before closing the improvement.

## Feedback Quality Bar

Good feedback is:

- specific about observed behavior
- linked to inspectable evidence
- redacted
- actionable
- assigned to a role or process owner
- connected to an eval when recurrence would be harmful

Weak feedback is:

- only emotional or vague
- missing evidence
- not connected to a run or issue
- hiding a blocker by marking work done
- asking every agent to change without a clear owner

## Non-Self-Editing Rule

Agents may recommend changes to their own prompts, skills, permissions, routines, or policy gates,
but they must not self-edit those surfaces directly. Route those changes through:

- 06 AIM for agent configuration and activation policy
- 09 QVE or 09 TAE for eval and regression proof
- 10 SPA for security and secrets policy
- 04 DSM for procedure updates
- 00 AIA for owner-facing decisions

## Required Handoff for Codex or Improvement Owner

An improvement handoff must include:

- source issue and run
- redacted trace summary
- feedback summary and severity
- affected agent/process
- expected behavior
- eval or regression requirement
- files/docs/skills/routines to inspect
- evidence required before closure

## Stage 1 Focus

During Soar/Roost delivery, feedback should improve:

- task creation and parent/child traceability
- Kanban movement and blocker resolution
- feature-slice architecture indexing
- local verification before deploy
- production smoke and Coolify observation
- owner-linked integration testing without leaking secrets
- repeated recovery-needed agent behavior
- clear Polish owner-facing decision summaries from AIA
