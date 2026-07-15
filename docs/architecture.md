# Paperclip Softwarehouse Architecture

Paperclip Softwarehouse is a local autonomous software company running on the Paperclip control
plane. The company is not a loose collection of agents: it is a governed delivery system where every
agent, task, run, event, artifact, policy decision, deployment, and retrospective remains company
scoped and inspectable.

## Canonical Runtime Primitives

| Softwarehouse concept | Paperclip V1 primitive | Evidence path |
|---|---|---|
| AgentOperatingRecord | `agents`, runtime config, permissions, budget fields, metadata, recent runs and activity | `packages/db/src/schema/agents.ts` |
| AgentTask | `issues`, issue hierarchy, labels, approvals, comments, documents, work products | `packages/db/src/schema/issues.ts` |
| AgentRun | `heartbeat_runs` | `packages/db/src/schema/heartbeat_runs.ts` |
| AgentRunEvent / trajectory log | `heartbeat_run_events`, `activity_log` | `packages/db/src/schema/heartbeat_run_events.ts` |
| AgentEvidence | `issue_work_products`, issue docs, attachments, approvals, deployment/monitoring artifacts | `packages/db/src/schema/issue_work_products.ts` |
| SafeTraceLog / AgentFeedback / AgentEval / EvalRun / AgentImprovementTask | Current policy contract implemented through issues, comments, work products, docs, and evidence; future runtime tables may make these first-class | `docs/agent-improvement-flywheel.md` |
| SupervisorReview | issue approvals, thread interactions, supervisor issues, activity entries | `doc/SPEC-implementation.md` |
| ControlPolicy | agent/project/company runtime config, approvals, budgets, docs in this section | `docs/agent-policy-gates.md` |
| CompanySituation | Deterministic company-scoped projection over goals, projects, issues, agents, approvals, and budget incidents | `server/src/services/company-situation.ts` |
| OrganizationalRecord | Typed assumption, commitment, or decision with lifecycle, owner, evidence, review timing, and supersession | `packages/db/src/schema/organizational_records.ts` |

## Operating Flow

Discovery -> Planning -> Architecture -> Implementation -> Automated Tests -> QA -> Security
Review -> Code Review -> Documentation -> Deployment -> Monitoring -> Retrospective -> Process
Improvement -> Planning.

Each stage must either attach evidence or record a blocker with the next owner. Empty loops are a
control-plane failure, not a valid result.

Agent self-correction follows the Agent Improvement Flywheel: every meaningful failed or weak run
should produce a redacted trace, feedback, eval/regression gate, and improvement task when needed.
No improvement task closes without EvalRun `PASS`.

## Local Deployment Boundary

V1 targets local trusted development first. Project applications such as Soar and Roost are built
locally by agents, committed to git, pushed, deployed through Coolify, and verified through
production health checks. Paperclip must keep the local state and production-facing evidence aligned.

## Mission Control Contract

Mission Control must answer these questions without guessing:

- What is the active mission, when was the operating picture observed, and which facts need attention now?
- Which agents exist, what are they allowed to do, and what are they blocked by?
- Which tasks are active, stale, blocked, review-required, deployable, or done?
- Which functions/features have evidence from backend through worker through frontend?
- Which production resources deployed successfully, failed, or need operator approval?
- Which repeated failures created process-improvement tasks?
- Which agent failures have safe traces, feedback, evals, and passing regression evidence?

`CompanySituation` is the orientation-layer read model. It combines sourced control-plane facts with
clearly labelled organizational records and a bounded historical-throughput forecast. Forecasts retain
sample size, confidence, and limitations; they do not become deadlines. Decisions do not grant authority
or bypass approvals, budgets, or evidence gates. The complementary roadmap for remaining capacity,
outcome learning, and external grounding lives in
`doc/plans/2026-07-15-organizational-orientation-system.md`.
