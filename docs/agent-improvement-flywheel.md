# Agent Improvement Flywheel

Status: active softwarehouse operating contract
Date: 2026-07-04
Owner: 09 QVE with 09 SPA, 09 DRE, 04 DSM, 06 AIM, and 00 AIA

The Agent Improvement Flywheel turns agent work into durable process quality. A failed
run, weak handoff, missing evidence, unsafe action, repeated blocker, or poor decision must
not disappear into chat history. It must become a redacted trace, feedback, an eval or
regression gate, and when needed an improvement task.

This document is the configuration and policy contract. Runtime tables or API endpoints may
implement it later, but agents must follow the model immediately through Paperclip issues,
comments, work products, docs, and activity evidence.

## Data Model Contract

### SafeTraceLog

| Field | Meaning |
| --- | --- |
| `trace_id` | Stable id for the safe trace record. |
| `run_id` | Source AgentRun or heartbeat run id. |
| `task_id` | Related Paperclip issue/task id. |
| `agent_id` | Agent that produced the run. |
| `event_type` | Run event class such as start, tool, error, blocker, evidence, completion. |
| `tool_name` | Tool name when relevant, without raw payloads. |
| `redacted_summary` | Human-readable safe summary of what happened. |
| `files_touched` | Workspace-relative files changed or inspected. |
| `commands_run` | Commands run, redacted and summarized. |
| `tests_run` | Tests/checks run and result summary. |
| `warnings` | Non-fatal issues, assumptions, or missing evidence. |
| `errors` | Failures or exceptions, redacted. |
| `risk_flags` | Safety tags from `docs/safe-trace-logging.md`. |
| `evidence_refs` | Links to work products, issue comments, screenshots, logs, commits, or docs. |
| `created_at` | Creation timestamp. |

### AgentFeedback

| Field | Meaning |
| --- | --- |
| `feedback_id` | Stable feedback id. |
| `run_id` | Source run id. |
| `task_id` | Related issue/task id. |
| `source` | `HUMAN`, `MODEL`, `QA`, `SECURITY`, `TEST`, or `MONITORING`. |
| `severity` | `LOW`, `MEDIUM`, `HIGH`, or `CRITICAL`. |
| `summary` | What was good, weak, wrong, unsafe, missing, or repeated. |
| `evidence_refs` | Inspectable proof. |
| `suggested_fix` | Concrete improvement path. |
| `created_at` | Creation timestamp. |

### AgentEval

| Field | Meaning |
| --- | --- |
| `eval_id` | Stable eval id. |
| `name` | Clear eval name. |
| `related_agent_id` | Agent or role being evaluated. |
| `related_task_type` | Task class covered by the eval. |
| `source_feedback_id` | Feedback that created or updated the eval. |
| `eval_type` | `UNIT`, `INTEGRATION`, `PROMPTFOO`, `LLM_JUDGE`, `POLICY`, or `REGRESSION`. |
| `input_fixture_path` | Fixture path, prompt case, issue example, or safe replay input. |
| `expected_behavior` | Required behavior. |
| `judge_criteria` | Objective pass/fail criteria. |
| `status` | Draft, active, deprecated, or blocked. |
| `last_run_at` | Last execution timestamp. |

### EvalRun

| Field | Meaning |
| --- | --- |
| `eval_run_id` | Stable eval execution id. |
| `eval_id` | Eval that was run. |
| `agent_id` | Agent under test. |
| `run_id` | Related AgentRun, when the eval is replayed from a run. |
| `result` | `PASS`, `FAIL`, `FLAKY`, or `NEEDS_REVIEW`. |
| `score` | Numeric score where the eval supports scoring. |
| `failure_summary` | Redacted failure explanation. |
| `evidence_refs` | Test output, screenshots, work products, commits, or issue comments. |
| `created_at` | Creation timestamp. |

### AgentImprovementTask

| Field | Meaning |
| --- | --- |
| `improvement_task_id` | Stable improvement task id. |
| `source_run_id` | Run that exposed the problem. |
| `source_feedback_id` | Feedback that justified the task. |
| `source_eval_id` | Eval that failed or must be added. |
| `affected_agent_id` | Agent or role needing improvement. |
| `affected_process` | Process, policy, skill, tool, prompt, routine, or documentation path. |
| `problem_summary` | Short explanation of the recurring or high-impact problem. |
| `proposed_change` | Proposed repair. |
| `priority` | Priority based on severity, recurrence, and delivery impact. |
| `status` | Backlog, ready, running, blocked, review-required, or done. |
| `implementation_handoff_path` | Issue, doc, branch, work product, or Codex handoff path. |
| `created_at` | Creation timestamp. |
| `completed_at` | Completion timestamp, only after the close gate passes. |

## Operating Pipeline

1. An agent executes an AgentRun.
2. Paperclip or the supervising role records a SafeTraceLog.
3. Human, model, QA, security, test, or monitoring feedback creates AgentFeedback.
4. QVE, SPA, DRE, DSM, or AIM creates or updates an AgentEval.
5. The eval joins the relevant regression suite.
6. If feedback is severe, repeated, or the eval fails, create an AgentImprovementTask.
7. Codex or the assigned improvement owner receives a handoff containing:
   - problem summary
   - redacted trace summary
   - feedback summary
   - eval and expected behavior
   - files, policies, skills, prompts, or routines to inspect
   - required evidence before closure
8. The owner fixes the process, instruction, skill, tool, prompt, test, or runtime behavior.
9. The eval must produce EvalRun `PASS`.
10. Only then may the AgentImprovementTask move to `done`.

## Role Ownership

| Role | Responsibility |
| --- | --- |
| `00 AIA` | Routes owner-facing decisions, prevents silent unresolved blockers, and ensures important feedback reaches the correct owner. |
| `04 DSM` | Maintains procedure quality and converts repeated workflow friction into process changes. |
| `06 AIM` | Owns agent configuration, role boundaries, hiring/activation policy, and non-self-editing improvement paths. |
| `09 QVE` | Owns eval quality, regression gates, evidence quality, and PASS/FAIL interpretation. |
| `09 TAE` | Builds executable tests and fixtures when an improvement requires automation. |
| `09 CRS` | Reviews code/process changes for maintainability and regression risk. |
| `09 DRE` | Turns deployment/runtime/monitoring failures into safe traces, feedback, and regression evidence. |
| `10 SPA` | Owns security, secrets, raw trace restrictions, and high-risk policy gates. |

## Closure Rules

- No repeated failure may be treated as "just noise" without feedback and a decision.
- No AgentImprovementTask may close without EvalRun `PASS`.
- If an executable eval is impossible, QVE must create a policy or procedure eval with explicit judge criteria.
- Prompt, AGENTS.md, policy-gate, routine, permission, adapter, and agent behavior changes require eval or regression evidence.
- Raw logs must not be stored in normal traces. Use the restricted RawTraceVault policy in
  `docs/safe-trace-logging.md` only when safe traces are insufficient.

## Stage 1 Use

During Stage 1 Soar/Roost delivery, the flywheel applies to:

- blocked issues that remain blocked after the missing input is available
- recovery-needed agent runs
- repeated unassigned or parentless work
- duplicate/circular task trees
- missing end-to-end evidence
- workspace boundary escapes
- unsafe production, secret, deploy, paid-feature, or live-trading attempts
- "done" claims based only on plans or reports

The desired result is not more bureaucracy. The desired result is that each meaningful failure
makes the next autonomous cycle safer, clearer, and more likely to finish.
