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
| OrganizationalObservation | Source-backed outcome, causal finding, external signal, or learning candidate with freshness and governed promotion | `packages/db/src/schema/organizational_observations.ts` |

## Operating Flow

Discovery -> Planning -> Architecture -> Implementation -> Automated Tests -> QA -> Security
Review -> Code Review -> Documentation -> Deployment -> Monitoring -> Retrospective -> Process
Improvement -> Planning.

Each stage must either attach evidence or record a blocker with the next owner. Empty loops are a
control-plane failure, not a valid result.

## Durable Workflow Semantics

Paperclip and Codex provide the softwarehouse workflow runtime without adding a second orchestration
engine. Useful graph-workflow semantics are expressed through existing, inspectable primitives:

| Workflow capability | Softwarehouse implementation |
|---|---|
| Durable process state | Company-scoped issues, statuses, parent/child links, dependencies, documents, and work products |
| Work step / node | A single owned issue executed by an agent run with an explicit evidence contract |
| Conditional transition | Autonomy governor and next-legal-action selector applying permissions, WIP, project, source-control, budget, and protected-action gates |
| Checkpoint and resume | Persisted issue/run state, run events, comments, monitor fields, routine origin data, and recurring issue reuse |
| Retry and recovery | Bounded routine triggers, issue-event wakeups, watchdogs, stale-run cleanup, and explicit recovery issues |
| Human interrupt | `blocked`/`in_review`, approvals, owner interactions, and protected gates that remain fail-closed |
| Parallel fan-out | Parent/child issue decomposition and independent project/agent lanes, constrained by per-agent WIP=1 and same-project serialization |
| Fan-in / completion | Parent closure only after required child work and test, review, documentation, and risk-specific evidence are inspectable |
| Idempotency | Routine fingerprints, canonical recurring issues, semantic deduplication, and exact-owner/exact-project reuse |
| Memory and learning | Organizational records, observations, issue history, work products, project docs, and governed learning promotion |
| Observability | Heartbeat runs/events, activity log, Softwarehouse cockpit, project truth, costs, gates, and artifacts |
| External tools | Roost-hosted capabilities exposed to Paperclip agents through governed MCP-first interfaces |

These are behavioral contracts, not a requirement to copy another framework's API. Add a plugin only
when the capability cannot be expressed update-safely through Paperclip configuration and native
contracts. Roost owns reusable application/tool capabilities; Paperclip retains company governance.
The Roost/MCP row is a future boundary, not an active implementation lane. Until the board activates
that stage, agents build Roost according to its existing product architecture and do not create
speculative integration work or change current delivery priorities.

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
clearly labelled organizational records, flow-capacity queues, outcome/causal learning, external-signal
freshness, and a bounded historical-throughput forecast. Forecasts retain
sample size, confidence, and limitations; they do not become deadlines. Decisions do not grant authority
or bypass approvals, budgets, or evidence gates. The complementary roadmap and remaining calibration work live in
`doc/plans/2026-07-15-organizational-orientation-system.md`.
