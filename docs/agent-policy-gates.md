# Agent Policy Gates

Policy gates prevent autonomous agents from calling work done when the company cannot verify it.

## Minimum Gates

- No deployment without relevant test evidence.
- No `done` without documentation evidence.
- No high-risk completion without security evidence.
- No production-impacting change without deployment and monitoring evidence.
- No destructive action without an approval record.
- No broad workspace/repository change without branch or worktree isolation.
- No task handoff without a summary and next action.
- No repeated failure without a process-improvement issue.

## Risky Actions

Risky actions include secrets, production deploys, Coolify/VPS config, database migrations, deletion,
force pushes, broad dependency upgrades, security/auth changes, and cross-repository rewrites.

## Enforcement Sources

Current enforcement is split across issue status rules, approvals, activity logging, budgets,
runtime permissions, and scripts. Agent-owned issue completion now has a hard API gate: when an
agent moves an issue to `done`, Paperclip inspects issue work products and requires test, docs, and
review evidence. If the issue is high risk, the same transition also requires security, deployment,
and monitoring evidence.

The remaining product gap is a broader gate service/read model that applies the same bundle
consistently to deployment, production smoke, supervisor review, and dashboard-visible mission
control flows. Until that exists, agents and supervisors must record any bypass as a blocker or
incident.
