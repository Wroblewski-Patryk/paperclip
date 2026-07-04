# Delivery Workflow

Status: active baseline
Date: 2026-06-03
Owner: Engineering Delivery Lead

## Workflow States

Use these semantic states even when the Paperclip issue schema uses `backlog`, `todo`, `in_progress`, `in_review`, `done`, `blocked`, or `cancelled`.

| Semantic state | Paperclip status | Meaning |
| --- | --- | --- |
| INBOX / Intake | backlog | request exists but may be incomplete |
| DISCOVERY | todo | agent is collecting context and missing requirements |
| READY | todo | Definition of Ready is met |
| IN_PROGRESS | in_progress | live run is actively doing work |
| REVIEW | in_review | review owner is named |
| QA_TESTING | in_review | QA or test owner is proving behavior |
| STAGING / DEPLOY_READY | in_review | release gate is waiting or active |
| DONE | done | evidence exists and acceptance is met |
| BLOCKED | blocked | blocker, owner, and unblock action are named |
| NEEDS_HUMAN_DECISION | blocked | human decision is required and the exact question is stated |

## Kanban Standard

Paperclip issues are the Softwarehouse Kanban board. Goals define why work
exists, routines/procedures create or review repeatable work, and issues/tasks
carry the daily execution flow.

Kanban is the default planning and flow-management standard:

- visualize every meaningful work item as an issue or child issue;
- keep one accountable owner per executable issue;
- limit WIP by allowing `in_progress` only for live execution;
- keep parent/controller issues out of stale `in_progress`;
- pull the next task from `todo/backlog` only when the current lane has a
  durable disposition;
- make blockers first-class with owner, reason, unblock condition, and parent
  notification;
- use `in_review` for independent review, QA, security, ops, or PM acceptance;
- close as `done` only with inspectable evidence and acceptance.

Kanban manages flow. PDCA improves the process after the flow produces evidence
or exposes waste.

## Movement Rules

- No issue enters `in_progress` without a minimal plan.
- No issue enters `done` without evidence.
- No issue is abandoned without `BLOCKED`, `DELEGATED`, or `NEXT_ACTION`.
- Parent/controller issues should not stay in `in_progress`; leaf work owns live execution.
- Handoffs must name owner, layer, context files, expected output, verification, and blocker.

## PDCA Flow

1. PLAN: read goal, docs, issue context, risks, acceptance, and affected files.
2. DO: make the smallest coherent change or handoff.
3. CHECK: run targeted checks, build/test/lint/typecheck when relevant, compare with acceptance.
4. ACT: update docs, report evidence, create follow-up, or close.
