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
| RoostPortfolioProjectionV1 | Versioned, company-scoped, read-only projection of stable offerings/projects, bounded execution/evidence aggregates, readiness, SHA alignment, and fail-closed source state for Roost consumption | `server/src/services/roost-bridge-portfolio.ts` |

## Operating Flow

Discovery -> Planning -> Architecture -> Implementation -> Automated Tests -> QA -> Security
Review -> Code Review -> Documentation -> Deployment -> Monitoring -> Retrospective -> Process
Improvement -> Planning.

Each stage must either attach evidence or record a blocker with the next owner. Empty loops are a
control-plane failure, not a valid result.

The complete application-and-business state machine, including opportunity
validation, product/UX acceptance, architecture and threat design,
source-control closure, deployment, production acceptance, support,
commercial transition, and organizational learning, is the active procedure
`PROC-SH-APPLICATION-LIFECYCLE` in
`docs/softwarehouse/19-autonomous-application-business-lifecycle.md`.
This architecture summary must not be used to skip one of that procedure's
entry, evidence, ownership, or exit gates.

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
contracts. Roost owns the company knowledge/management plane and reusable application/tool
capabilities; Paperclip retains agent execution governance. On July 22, 2026, the board activated
the architectural direction and authorized only a bounded local-Paperclip-to-Roost-VPS read-only
canary as a `Softwarehouse V0` transition aid. That lane must remain least-privilege,
evidence-backed, and subordinate to the Soar-first and Roost-second completion mission. It does not
authorize broad provider writes, production mutation, or direct database access. The canonical
boundary and rollout gates live in `docs/softwarehouse/18-roost-company-knowledge-plane.md`.

Agent self-correction follows the Agent Improvement Flywheel: every meaningful failed or weak run
should produce a redacted trace, feedback, eval/regression gate, and improvement task when needed.
No improvement task closes without EvalRun `PASS`.

## Local Deployment Boundary

In the current `Softwarehouse V0` phase, Paperclip stays local on the canonical Windows host.
Project applications such as Soar and Roost are built locally by agents, committed to git, pushed,
deployed through Coolify to their named VPS targets, and verified through production health checks.
Hosting Paperclip itself on VPS remains a later `Softwarehouse V1` step. Paperclip must keep the
local state and production-facing evidence aligned.

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
