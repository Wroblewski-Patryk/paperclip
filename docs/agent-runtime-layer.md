# Agent Runtime Layer

The runtime layer turns assigned work into observable execution.

## AgentTask

`issues` are the canonical AgentTask implementation. A task must have a company, title, status,
priority, ownership state, optional parent/goal/project linkage, and enough context for the next
agent to continue without guessing.

Required task behavior:

- single assignee;
- atomic checkout semantics;
- issue hierarchy for decomposition;
- blocker relationships for dependencies;
- execution workspace/project linkage for code work;
- activity logging for mutating actions.

## AgentRun

`heartbeat_runs` are the canonical AgentRun implementation. A run captures the agent, source,
status, start/end time, process/session metadata, result payload, usage, error, next action, and
context snapshot.

Softwarehouse run types:

- `PLAN`
- `EXECUTE`
- `REVIEW`
- `QA`
- `SECURITY`
- `DOCS`
- `DEPLOY`
- `RETRO`

Runs should produce a final report or a structured blocker. A run that exits without a result,
next action, or blocker is considered operational noise and should be investigated.

## Worker Flow

Backend, worker, frontend, deployment, and monitoring changes must be indexed as linked issues,
runs, events, and evidence records. The goal is not a percentage estimate; the goal is traceability
from symptom to fix to verification to deployment.
