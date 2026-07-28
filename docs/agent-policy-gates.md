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
- No application release may treat deployment health as product acceptance or
  commercial readiness; the declared user journey, operating owner, use
  boundary, and applicable business gates must also be current.
- No application lifecycle transition may proceed from `blocked`, `stale`, or
  `failed` evidence. Only `verified` and justified `not_applicable` are green.
- No production-bound lane may open deploy, restore, governor, or protected-smoke
  follow-on work before its protected-access prerequisite packet is complete.

The complete lifecycle and gate ownership matrix is
`docs/softwarehouse/19-autonomous-application-business-lifecycle.md`.

## Protected-Access Lane-Entry Gate

Contract marker: `protected-access-lane-entry:v1`.

Before follow-on work opens for a production-bound lane, the parent issue or a
linked prerequisite issue must contain all stable packet fields:

- `readOnlyDeploymentStatusPath`: one read-only deployment-status path and its
  responsible role;
- `nonDestructiveProtectedSmokeOrTestAccountPath`: one non-destructive protected
  smoke or test-account path and its responsible role;
- `secretRefOrBindingAliases`: required secret-ref or binding aliases by name
  only;
- `responsibleRoles`: owners for access and binding confirmation;
- `downstreamUnblockTargets`: exact deploy, restore, smoke, command, or release
  targets unblocked by each prerequisite;
- `blockerOwnershipIssue`: a first-class blocker or owner-scoped prerequisite
  child for every missing item.

The failure mode is fail-closed: an incomplete packet prevents downstream issue
creation. A prose warning without blocker ownership does not satisfy this gate.

## Risky Actions

Risky actions include secrets, production deploys, Coolify/VPS config, database migrations, deletion,
force pushes, broad dependency upgrades, security/auth changes, and cross-repository rewrites.

## Enforcement Sources

Current enforcement is split across issue status rules, approvals, activity logging, budgets,
runtime permissions, and scripts. Agent-owned issue completion has a hard API minimum gate: when an
agent moves an issue to `done`, Paperclip requires a typed `completionEvidence` bundle. The board
keeps its V1 override authority, but even a board override needs a completion comment or existing
same-issue document, attachment, work product, or comment.

- Normal completions must provide `testEvidence`, `reviewEvidence`, and `documentationEvidence`.
- Agent completions must classify learning as `not_applicable`, `one_off`, or `systemic`.
- A systemic classification must prove implemented prevention or reference a
  non-cancelled same-company prevention issue.
- A high-risk correction cannot use the `one_off` classification.
- High-risk completions must also provide `securityEvidence`, `deploymentEvidence`, and
  `monitoringEvidence`.
- Each evidence category must reference same-issue evidence via `request_comment`, `comment`,
  `document`, `attachment`, or `work_product`.
- Missing bundles or refs to nonexistent issue evidence are rejected with `422`.

The stronger Softwarehouse bundle remains an operating and review requirement: normal work should
carry `TEST`, `REVIEW`, and `DOCS` evidence, and applicable high-risk work should also carry
`SECURITY`, `DEPLOY`, and `MONITORING` evidence before the work is treated as truly complete. The
remaining product gap is a broader gate service/read model that evaluates those bundle categories
consistently outside the issue-close route as well, including deployment, production smoke,
supervisor review, and dashboard-visible mission-control flows. Until that broader read model
exists, agents and supervisors must still record missing non-route evidence as a blocker, review
finding, or incident instead of claiming end-to-end product-enforced coverage.

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
