# Agent Policy Gates

Policy gates prevent autonomous agents from calling work done when the company cannot verify it.

## Roost projection activation gate

The Product Map publisher is disabled unless explicitly enabled with company-scoped source and ingest credentials. Credentials must pass pinned loopback-source/public-HTTPS-ingest validation and are never persisted in the outbox or telemetry. Enabling or changing protected ingest, pushing a product candidate, and triggering production redeploy remain deployment/security gates. Pending/dead outbox rows and stale feed lag are evidence, not authority to retry outside the bounded scheduler.

## Minimum Gates

- No deployment without relevant test evidence.
- No `done` without documentation evidence.
- No high-risk completion without security evidence.
- No production-impacting change without deployment and monitoring evidence.
- No destructive action without an approval record.
- No broad workspace/repository change without branch or worktree isolation.
- No task handoff without a summary and next action.
- Agent assignment is limited to a direct child. Broad `tasks:assign` grants do not bypass the
  reporting hierarchy; lateral routing requires the admitted ProductDelivery fast-path contract.
  The deterministic admission controller records its decision and the system applies an admitted
  proposal. A leaf uses `work_proposal`, escalation, or an upward delegation report.
- Codex execution uses explicit permission classes: `read_only`, `project_write`, `review_test`,
  `integration`, `deployment`, and `system_maintenance`. The former `observe`, `review`,
  `workspace_write`, and `privileged_local` values remain input aliases during migration and are
  normalized before authorization. Sandbox/approval bypass is valid only for
  `system_maintenance` and remains forbidden in authenticated deployments.
- Every heartbeat run that reaches execution must carry the deterministic admission decision that
  authorized its claim. A queued legacy or retry record may be undecided, but it cannot start until
  claim-time admission has been persisted.
- A supervision intervention requires its own admission decision, one bounded change, one explicit
  test, a rollback plan, and an observation window. A root cause cannot close until an enabled,
  verified native safeguard and a passed observation window are durable.
- Hierarchy health records rolling per-role context usage and diagnostic breaches above 250,000 raw
  input tokens per run. A breach is not a permission grant or proof of a bounded context packet;
  enforcement must remain fail-closed where a task declares a smaller explicit budget.
- Autonomous delegation is bounded to 8 direct children, 4 distinct agents per problem, and depth
  6. Child work remains in the parent's project, parent loops are rejected, and creating a child
  never transfers or closes the parent's responsibility.
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
- No issue status, commit, review, document, local test, or local SHA may implicitly advance a
  `product_delivery` or `product_outcome`. Delivery transitions require their own evidence, and
  outcome acceptance requires an independently accepted outcome after observed production health.

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

`dangerouslyBypassApprovalsAndSandbox` defaults to false. A local-trusted workstation may retain an
explicit exception where non-interactive Codex execution technically requires it, but every such run
emits `agent.sandbox_bypass_used`. Authenticated/VPS deployments reject the flag instead of copying
the local exception.

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

## Runtime Session and Outcome Gates

- Session runtime limits are cumulative across one adapter session and are
  evaluated by the control plane before invocation and during streamed local
  execution. Prompt text and adapter output are not policy inputs.
- `stopped_by_session_budget` is fail-closed and creates a critical native
  supervision finding; a new session or an audited owner policy change is the
  only recovery path.
- `accepted` product outcomes require every required typed predicate to be
  present, passed, fresh, and unexpired.
- Manual acceptance is never relabeled as fully accepted. It is stored as
  `accepted_with_risk`, requires an identified board owner, lists the exact
  failed predicates, expires, and remains visible in decision evidence.
- Native watchdog cycles cannot report green while a severe active finding,
  orphan execution lock, evidence-free completion, untyped accepted outcome,
  cost telemetry gap, or external-only shadow signal remains.

## Autonomy Envelope Gate

- `SHADOW` and `RECOMMEND` never dispatch work.
- `LIMITED_AUTO` and `AUTO` are granted per action class, not globally.
- The candidate must remain eligible at atomic recheck and its evidence must be
  within TTL.
- Only low-risk, existing, locally scoped work is in the default dispatch
  envelope. Production, secret, destructive, or broad cross-system actions are
  excluded.
- Unknown execution cost, stale source state, an achieved linked goal, medium or
  high risk, or confidence below threshold yields `GATHER_EVIDENCE`.
- Dispatch is idempotent and bounded to one owner wake. `ACCEPTED` does not imply
  live execution or successful outcome.
- An `unsafe` evaluator verdict or observed outcome regression immediately
  downgrades the action class to `SHADOW`.
- Oracle agreement is calibration evidence only. It cannot substitute for
  independent ProductOutcome verification.

### Board-authorized canary exception to execution stage

`AUTHORIZED_CANARY` is the only bootstrap path from a SHADOW/RECOMMEND decision
to execution. It is not a policy bypass: the envelope must remain enabled, the
decision must still be an active recommendation, typed issue intent must be
`ACTIVE` and unexpired, risk must be low, scope/environment/cost uncertainty
must match, verification must be at least `INDEPENDENT_INTERNAL`, and no active
warning/critical interrupt may apply. Authorization is board-only, expiring,
execution-counted, concurrency-bounded, audited, and consumed atomically.

Unknown monetary value may be accepted only as `UNKNOWN_BOUNDED` with a hard
cost ceiling and maximum call count. A reported zero is `ZERO_REPORTED` until
provider semantics prove `VERIFIED_ZERO`. Liveness stall, failed verification,
budget breach, duplicate, interrupt, or stale atomic recheck stops the canary;
there is no unbounded rescue retry.

Learned policies use `PROPOSED -> EXPERIMENTAL -> ACTIVE` with reversible
`SUSPECT`, `ROLLED_BACK`, `SUPERSEDED`, and `RETIRED` states. Every version names
provenance, scope, expected effect, confidence, review owner/date, and rollback
condition. Policy exceptions are explicit, owned, risk-accepted, evidenced, and
expiring; they are never hidden permanent bypasses.
