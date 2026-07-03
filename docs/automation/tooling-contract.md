# Tooling Contract

Last updated: 2026-05-31

## Purpose

Define which commands, scripts, provider actions, and automations agents may
use inside LuckySparrow Software House.

This contract complements
`docs/operations/approval-aware-agent-command-flow.md`, the Softwarehouse
operating model, and the command catalog at
`docs/automation/agent-command-catalog.csv`.

## Safety Classes

| Class | Meaning | Default approval |
| --- | --- | --- |
| `safe_read` | Reads files, APIs, status, logs, or dry-run output. | No approval. |
| `safe_provider_read` | Reads external provider status or logs using approved read credentials. | No approval when credentials are already configured and output is redacted. |
| `repo_write` | Writes tracked project/repo files without touching external runtime. | No approval when a Paperclip issue grants the lane and workspace policy allows it. |
| `paperclip_write` | Writes Paperclip issues, comments, routines, labels, agent config, or local runtime metadata. | No approval when the assigned role owns the operation and the command is scoped. |
| `protected_prepare` | Records or prepares a protected action without executing it. | Approval required for the approval fact being recorded. |
| `secret_write` | Creates, binds, rotates, or reads secret metadata. Secret values remain hidden. | Approval required. |
| `protected_write` | Pushes, deploys, restarts, rolls back, mutates production resources, or changes live/paid accounts. | Explicit approval or release mutation permit required. |

Missing command classification means risky by default. If a command is not in
the catalog, agents must classify it in an issue comment before using it, or
route it to the responsible lead.

## Operating Rules

- Prefer read-only discovery before writes.
- Prefer project-native scripts and `pnpm softwarehouse:*` commands over ad hoc
  shell sequences.
- Run dry-run variants first when an `:apply` command exists.
- A dirty worktree does not block read-only commands, but it blocks push,
  deploy, protected mutation, and broad generated rewrites until classified.
- Do not read or print secret values. Secret metadata freshness is acceptable;
  secret contents are not.
- Do not bypass Paperclip APIs, project service boundaries, or Coolify/VPS
  release gates.
- `:apply` commands must leave evidence: command, result, changed files or
  issue IDs, residual risk, and next owner.
- Provider actions on Coolify/VPS are owned by Ops Release Lead. Credential
  handling is owned by Security Review Lead. Smoke design is owned by QA/Test
  Automation.

## Command Catalog Maintenance

When a new script, command route, provider action, MCP action, or automation is
exposed to agents:

1. Add it to `agent-command-catalog.csv`.
2. Assign a safety class.
3. Name the owner role.
4. Name the expected evidence.
5. State whether approval is required.

Agents should treat catalog maintenance as part of the change, not follow-up
cleanup.
