# Agent Governance

Agent governance is the answer to "who is allowed to do what, where, and with which evidence."

## AgentOperatingRecord

Paperclip stores the operating record as a projection over `agents`, recent runs, issues, activity,
budgets, permissions, and work products.

| Requested field | Current source |
|---|---|
| `agent_id`, `name`, `role`, `department`, `owner` | `agents` plus org/reporting metadata |
| `responsibility_scope` | `agents.capabilities`, role docs, assigned projects |
| `autonomy_level` | agent/runtime metadata and control policy |
| `allowed_tools`, `allowed_repositories`, `allowed_file_paths` | permissions, runtime config, workspace policy |
| `forbidden_file_paths`, `allowed_actions`, `risky_actions` | control policy and role docs |
| `approval_required_for` | approvals, governed action policy, runtime config |
| `current_tasks`, `recent_runs`, `recent_commits`, `recent_prs` | issues, heartbeat runs, activity/work products |
| `test_pass_rate`, `failed_actions`, `security_flags` | evidence map, run results, security evidence |
| `last_review_at`, `last_retrospective_at` | supervisor reviews, retrospective issues |
| `improvement_suggestions` | PDCA/process-improvement issues |

## Autonomy Levels

- `PLAN_ONLY`: may inspect and propose.
- `EDIT_WITH_REVIEW`: may edit in a scoped workspace, but needs review before completion.
- `PR_WITH_REVIEW`: may branch, test, commit, and open PRs, but needs review before merge/deploy.
- `DEPLOY_WITH_APPROVAL`: may prepare deployment and request approval.
- `FULL_AUTONOMY_SANDBOX_ONLY`: may complete full loops only inside an approved sandbox.

Production deploys, secrets, destructive file operations, and broad dependency/config changes remain
governed actions unless a narrower policy explicitly allows them.
