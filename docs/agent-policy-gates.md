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
- No agent behavior, prompt, skill, routine, policy, permission, or `AGENTS.md`
  change without eval or regression evidence.
- No AgentImprovementTask closure without EvalRun `PASS`.
- No normal trace log may contain raw secrets, tokens, passwords, owner credentials,
  private provider payloads, or unredacted sensitive prompts.

## Risky Actions

Risky actions include secrets, production deploys, Coolify/VPS config, database migrations, deletion,
force pushes, broad dependency upgrades, security/auth changes, and cross-repository rewrites.

## Enforcement Sources

Current enforcement is split across issue status rules, approvals, activity logging, budgets,
runtime permissions, and scripts. Agent-owned issue completion has a hard API minimum gate: when an
agent moves an issue to `done`, Paperclip requires inspectable completion evidence through one of:

- a completion comment in the same update;
- an issue document;
- an attachment; or
- a work product.

That route does not yet validate typed evidence bundles such as `TEST`, `REVIEW`, `DOCS`,
`SECURITY`, `DEPLOY`, or `MONITORING`.

The stronger Softwarehouse bundle remains an operating and review requirement: normal work should
carry `TEST`, `REVIEW`, and `DOCS` evidence, and applicable high-risk work should also carry
`SECURITY`, `DEPLOY`, and `MONITORING` evidence before the work is treated as truly complete. The
remaining product gap is a broader gate service/read model that validates that bundle consistently
for issue closure, deployment, production smoke, supervisor review, and dashboard-visible mission
control flows. Until that exists, agents and supervisors must record missing bundle categories as a
blocker, review finding, or incident instead of claiming product-enforced coverage.

## Agent Improvement Flywheel

The canonical improvement loop is defined in:

- `docs/agent-improvement-flywheel.md`
- `docs/evals-and-regression-gates.md`
- `docs/safe-trace-logging.md`
- `docs/agent-feedback-loop.md`

Every meaningful agent failure should produce, in order:

1. a redacted SafeTraceLog or equivalent issue/work-product evidence;
2. AgentFeedback from human, model, QA, security, test, or monitoring source;
3. an AgentEval or regression gate when recurrence would be harmful;
4. an AgentImprovementTask when the eval fails, severity is high, or the problem repeats;
5. EvalRun `PASS` before the improvement can close.

Clearing a red/error/recovery-needed state is not enough. The root cause, prevention path, and
future regression signal must be captured unless the feedback owner explicitly classifies the event
as a one-off low-risk false alarm.
