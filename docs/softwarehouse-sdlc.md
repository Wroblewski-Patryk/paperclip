# Softwarehouse SDLC

This SDLC is the default operating contract for Paperclip Softwarehouse agents.

| Stage | Required output | Gate |
|---|---|---|
| Discovery | indexed symptoms, impacted apps, repro notes, source files, owners | issue exists and has a clear next action |
| Planning | implementation plan, risk notes, target verification | plan accepted or explicitly self-approved by policy |
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

For agent-authenticated work, the runtime issue API enforces a typed closure gate: `status: done` must include a
`completionEvidence` bundle with `testEvidence`, `reviewEvidence`, and `documentationEvidence`.
When the bundle declares `riskLevel: "high"`, it must also include `securityEvidence`,
`deploymentEvidence`, and `monitoringEvidence`. Each category must reference evidence attached to
the same issue through a same-request comment or an existing comment, document, attachment, or work
product.

Board-authenticated closure remains an explicit operator override. It may use legacy inspectable
evidence instead of a typed bundle, but cannot close a completely evidence-free issue.

Higher-risk work still needs the stage-specific review, deployment, security, and monitoring
evidence above as part of the broader operating flow, not just the close route.

## Status Vocabulary

Paperclip's canonical issue statuses remain `backlog`, `todo`, `in_progress`, `in_review`, `done`,
`blocked`, and `cancelled`. Softwarehouse lane labels or workflow metadata may expose the richer
operating vocabulary:

`BACKLOG`, `PLANNED`, `READY`, `RUNNING`, `BLOCKED`, `REVIEW_REQUIRED`, `QA_REQUIRED`,
`SECURITY_REQUIRED`, `READY_TO_DEPLOY`, `DEPLOYED`, `FAILED`, `DONE`.

The richer vocabulary is a stage overlay. It must not weaken the single-assignee issue model,
checkout lock, execution lock, activity logging, approval gates, or company scoping.

## Agent Improvement Flywheel

The SDLC uses the Agent Improvement Flywheel for self-correction:

AgentRun -> SafeTraceLog -> AgentFeedback -> AgentEval -> EvalRun -> AgentImprovementTask ->
process/code/instruction fix -> EvalRun PASS -> done.

Use `docs/agent-improvement-flywheel.md`, `docs/evals-and-regression-gates.md`,
`docs/safe-trace-logging.md`, and `docs/agent-feedback-loop.md` as the canonical contract.

Any change that alters agent behavior, prompts, shared instructions, skills, routines, policy gates,
workspace boundaries, secrets access, deployment behavior, or issue/task lifecycle behavior needs
eval or regression evidence scaled to risk.
