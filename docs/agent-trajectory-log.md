# Agent Trajectory Log

The trajectory log is the durable record of what an agent did during a run.

## Canonical Storage

- `heartbeat_run_events`: ordered run events, stream, level, message, payload, company, agent, run.
- `activity_log`: durable record of mutating control-plane actions.
- issue comments/documents/work products: human-readable summaries and outputs.

## Required Event Detail

Run events should preserve:

- tool calls and tool results when safe to store;
- files read or changed;
- commands executed;
- tests run and their exit state;
- errors, warnings, and blockers;
- risk decisions and approval requirements;
- next action and final report.

Secrets must never be printed into trajectory logs. Store secret references and provider health
evidence instead of values.
