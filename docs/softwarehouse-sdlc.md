# Softwarehouse SDLC

This SDLC is the default operating contract for Paperclip Softwarehouse agents.

The authoritative end-to-end application and business procedure is
`PROC-SH-APPLICATION-LIFECYCLE` in
`docs/softwarehouse/19-autonomous-application-business-lifecycle.md`. The table
below is its compact engineering-stage projection, not a shorter alternative.

| Stage | Required output | Gate |
|---|---|---|
| Discovery | indexed symptoms, impacted apps, repro notes, source files, owners | issue exists and has a clear next action |
| Planning | implementation plan, risk notes, target verification, and protected-access prerequisite packet for production-bound lanes | plan accepted or explicitly self-approved by policy |
| Architecture | affected contracts, data flow, migrations, API/UI/worker impact | broad changes have architecture evidence |
| Implementation | scoped branch/worktree changes | no unrelated rewrites |
| Automated Tests | commands, results, failures, screenshots when relevant | no deploy without passing required tests or explicit blocker |
| QA | user-flow checks, regressions, app-level acceptance | QA evidence attached |
| Security Review | secrets, auth, permissions, data exposure, destructive action review | high-risk work cannot skip security |
| Code Review | review findings or approval record | review evidence attached before done |
| Documentation | changed operator/agent docs and evidence map | no done without docs evidence |
| Deployment | push/deploy record, Coolify/resource status, version/commit | deployment evidence attached |
| Monitoring | post-deploy health checks, logs, alarms, production smoke | monitoring evidence attached for high-risk deploys |
| Retrospective | what failed, what repeated, what changed in process | repeated failures create improvement tasks |
| Process Improvement | updated docs, scripts, policies, evals, or backlog | closes the PDCA loop with EvalRun PASS when an AgentImprovementTask exists |

Before Discovery, an activated application slice must also pass the lifecycle
direction, opportunity/problem validation, business framing, and product/UX
acceptance stages. After Monitoring, an owner-usable application must retain
an operating/support path, outcome metrics, incident handling, commercial-use
boundary, and a governed improve/maintain/pause/retire decision. Deployment is
therefore neither product acceptance nor commercial readiness by itself.

The runtime represents these concerns with three independent records:

- `issues` are executor tasks and may be `done` after their task evidence gate;
- `product_deliveries` are product changes and advance only through the delivery transition API;
- `product_outcomes` are real-world results and require independent evidence and acceptance.

A completed task, review document, commit, local test, or SHA never advances delivery or outcome
implicitly. Historical issues are not backfilled into delivery or outcome states unless the evidence
supports a deterministic inference; otherwise their delivery/outcome truth remains unknown.

Every stage transition records an accountable owner, current source, entry
fact, required output, gate state (`verified`, justified `not_applicable`,
`blocked`, `stale`, or `failed`), evidence reference, and next owner. Only the
first two gate states allow forward movement.

For agent-authenticated work, the runtime issue API enforces a typed closure gate: `status: done` must include a
`completionEvidence` bundle with `testEvidence`, `reviewEvidence`, `documentationEvidence`, and a
`learningDisposition`.
When the bundle declares `riskLevel: "high"`, it must also include `securityEvidence`,
`deploymentEvidence`, and `monitoringEvidence`. Each category must reference evidence attached to
the same issue through a same-request comment or an existing comment, document, attachment, or work
product.

The learning disposition makes the PDCA decision explicit without forcing a
new improvement issue for every delivery. Non-corrective work uses
`not_applicable`; a standard-risk isolated correction may use `one_off` with a
root-cause and recurrence rationale; a systemic correction must prove
implemented prevention or reference a separate non-cancelled same-company
prevention issue. High-risk corrective work cannot be dismissed as one-off.

Board-authenticated closure remains an explicit operator override. It may use legacy inspectable
evidence instead of a typed bundle, but cannot close a completely evidence-free issue.

Higher-risk work still needs the stage-specific review, deployment, security, and monitoring
evidence above as part of the broader operating flow, not just the close route.

## Production-Bound Lane Entry

Contract marker: `protected-access-lane-entry:v1`.

A lane is production-bound when its planned work can require deploy-status or
production readback beyond public unauthenticated health, protected smoke or
test-account proof, restore proof against protected runtime resources, or
secret-ref-backed runtime bindings for those checks.

During Planning, the parent lane or linked prerequisite issue must record the
complete packet before follow-on work opens for deploy, restore, governor, or
protected smoke:

- `readOnlyDeploymentStatusPath`: one read-only deployment-status access path
  and its responsible role;
- `nonDestructiveProtectedSmokeOrTestAccountPath`: one non-destructive protected
  smoke or test-account access path and its responsible role;
- `secretRefOrBindingAliases`: every required secret ref or binding alias by
  name only, never by value;
- `responsibleRoles`: the role that owns each binding confirmation or access
  path;
- `downstreamUnblockTargets`: the downstream lane or exact command/check each
  prerequisite unblocks;
- `blockerOwnershipIssue`: the first-class blocker or prerequisite child that
  owns every missing prerequisite.

An incomplete packet is a lane-entry defect. Do not fan out deploy, restore,
governor, or protected-smoke execution work until the missing prerequisite has
an owner-scoped issue and the production-bound parent is blocked on it.

## Status Vocabulary

Paperclip's canonical issue statuses remain `backlog`, `todo`, `in_progress`, `in_review`, `done`,
`blocked`, and `cancelled`. Softwarehouse lane labels or workflow metadata may expose the richer
operating vocabulary:

`BACKLOG`, `PLANNED`, `READY`, `RUNNING`, `BLOCKED`, `REVIEW_REQUIRED`, `QA_REQUIRED`,
`SECURITY_REQUIRED`, `READY_TO_DEPLOY`, `DEPLOYED`, `FAILED`, `DONE`.

The richer vocabulary is a stage overlay. It must not weaken the single-assignee issue model,
checkout lock, execution lock, activity logging, approval gates, or company scoping.

## Blocker Triage Without Starvation

Blocked delivery work is not ordinary executable work, but it must not disappear behind an
ever-present runnable backlog. The Softwarehouse blocked-triage controller may create one bounded
triage lane after a candidate has received no disposition update for six hours. The threshold is
configurable with `SOFTWAREHOUSE_BLOCKED_TRIAGE_MAX_WAIT_MS`.

The lane may classify the blocker, repair issue topology, or create at most one safe next-action
issue. It does not authorize deploys, production restarts, protected smoke, live account changes,
secret disclosure, or project-repository mutations. Existing exact-title and cooldown guards still
prevent duplicate triage churn, and the per-agent WIP guard decides whether the selected owner can
be woken immediately.

An unhealthy protected resource may remain visible as a blocker while its one-action recovery gate
waits for an explicit owner decision. Once that recovery issue already exists, the continuation
controller must preserve the gate and select a separate safe runnable lane; repeatedly invoking a
seeder that can only return `noop_existing_recovery_issue` is not constructive progress.

## Agent Improvement Flywheel

The SDLC uses the Agent Improvement Flywheel for self-correction:

AgentRun -> SafeTraceLog -> AgentFeedback -> AgentEval -> EvalRun -> AgentImprovementTask ->
process/code/instruction fix -> EvalRun PASS -> done.

Use `docs/agent-improvement-flywheel.md`, `docs/evals-and-regression-gates.md`,
`docs/safe-trace-logging.md`, and `docs/agent-feedback-loop.md` as the canonical contract.

Any change that alters agent behavior, prompts, shared instructions, skills, routines, policy gates,
workspace boundaries, secrets access, deployment behavior, or issue/task lifecycle behavior needs
eval or regression evidence scaled to risk.
