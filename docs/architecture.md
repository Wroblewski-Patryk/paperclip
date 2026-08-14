# Paperclip Softwarehouse Architecture

Paperclip Softwarehouse is a local autonomous software company running on the Paperclip control
plane. The company is not a loose collection of agents: it is a governed delivery system where every
agent, task, run, event, artifact, policy decision, deployment, and retrospective remains company
scoped and inspectable.

## Paperclip to Roost projection runtime

Paperclip remains the execution source of truth; Roost receives a read-only owner projection. When `PRODUCT_MAP_PUBLISHER_ENABLED=true` and all scoped bindings plus `PRODUCT_MAP_COMPANY_ID` are present, the server starts one publisher cycle after the API listener is ready. Each source snapshot is inserted into `roost_product_map_outbox` before the oldest pending envelope is delivered to the fixed HTTPS Roost ingest. Company/idempotency uniqueness, source-observed ordering, bounded durable backoff and stale-event refusal prevent dual-write and restart loss. Roost cannot mutate Paperclip delivery truth.

The projection carries source/deployed identity plus latest delivery stage, independently recorded outcome, owner, blocker, decision flag, update time, freshness/lag and quota state. Missing delivery or quota evidence stays explicitly `unknown`; task completion or a commit cannot manufacture it.

## Canonical Runtime Primitives

| Softwarehouse concept | Paperclip V1 primitive | Evidence path |
|---|---|---|
| AgentOperatingRecord | `agents`, runtime config, permissions, budget fields, metadata, recent runs and activity | `packages/db/src/schema/agents.ts` |
| AgentTask | `issues`, issue hierarchy, labels, approvals, comments, documents, work products | `packages/db/src/schema/issues.ts` |
| ProductDelivery | Independent product-change state, typed evidence, immutable transition history, source/deployed SHA alignment, and deployment observation | `packages/db/src/schema/product_deliveries.ts` |
| ProductOutcome | Independent real-world result and owner acceptance; never inferred from task or delivery completion | `packages/db/src/schema/product_outcomes.ts` |
| AgentRun | `heartbeat_runs` | `packages/db/src/schema/heartbeat_runs.ts` |
| AgentRunEvent / trajectory log | `heartbeat_run_events`, `activity_log` | `packages/db/src/schema/heartbeat_run_events.ts` |
| AgentEvidence | `issue_work_products`, issue docs, attachments, approvals, deployment/monitoring artifacts | `packages/db/src/schema/issue_work_products.ts` |
| SafeTraceLog / AgentFeedback / AgentEval / EvalRun / AgentImprovementTask | Current policy contract implemented through issues, comments, work products, docs, and evidence; future runtime tables may make these first-class | `docs/agent-improvement-flywheel.md` |
| SupervisorReview | issue approvals, thread interactions, supervisor issues, activity entries | `doc/SPEC-implementation.md` |
| ControlPolicy | agent/project/company runtime config, approvals, budgets, docs in this section | `docs/agent-policy-gates.md` |
| AssignmentProposal | Agent/delegator intent mediated by deterministic admission before system assignment | `packages/db/src/schema/assignment_proposals.ts` |
| SupervisionFinding / RootCause | Versioned, deduplicated, company-scoped operational evidence and causal state in PostgreSQL | `packages/db/src/schema/supervision.ts` |
| NativeSafeguard / ObservationWindow | Durable prevention and post-change verification gates; closure cannot be inferred from a passing test alone | `packages/db/src/schema/supervision.ts` |
| SupervisionCycle / ShadowComparison | Restart-safe native Watchdog/Daily/Weekly cycles and read-only comparison with external owner assurance | `server/src/services/native-supervision-engine.ts` |
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

Native supervision is part of the control plane, not a parallel task system. The scheduler starts
deterministic Watchdog, Daily Integrity, and aggregate Weekly cycles with durable cycle keys and
expiry recovery. Diagnosis-requiring findings may dispatch the Operational Doctor only after
admission; missing Doctor capacity produces a visible `no_doctor` state rather than unsafe fallback.
External Codex automations are read-only owner assurance: they compare fingerprints through the
shadow-comparison API and cannot create a second backlog or mutate native policy.

Agent timers use work-aware admission. A timer is allowed to start a paid agent run only when that
agent owns an executable `backlog` or `todo` issue with no unresolved blocker, active issue run,
active tree hold, or accepted-outcome conflict. Timers preserve per-agent WIP=1 and serialize writers
by project, while independent projects may proceed in parallel. Reusable routine issues scope their
execution quota to the current routine-run epoch; ordinary issues retain issue-lifetime quota. A
quota hard hold is a policy decision, not a transient adapter failure: recovery suppresses automatic
execution and preserves an invokable recovery owner through a `wake_owner` technical-review policy.
Board escalation is the fallback only when no invokable owner exists; neither path resets or raises
the quota. Native stale-review consumption remains
active even when agent timers are enabled and admits at most one review lane per supervision cycle.
Work-aware timers are review-first: an assigned review is selected ahead of implementation, and a
project with an unstructured review wait cannot admit another implementation timer until a review
owner starts a decision lane or records a structured pending decision. This bounds review fan-in
without serializing independent projects.

The canonical local Softwarehouse service runs without source hot reload. Agents may edit the
Paperclip checkout, but validated control-plane changes enter the running instance only through an
explicit restart. This prevents a source edit from restarting Paperclip underneath the heartbeat
process that made the edit and turning successful engineering work into a `process_lost` loop.

Workspace-boundary assurance also rejects two forms of hidden operational debt before handoff:
multiple active Paperclip projects claiming the same canonical workspace, and untracked top-level
temporary stores or scratch directories such as `.pnpm-store/` and `tmp-*`. Temporary output must
be removed or promoted to a tracked artifact/work product; it cannot silently become repository
state.

Task, delivery, and outcome are deliberately separate state machines. Closing an issue records only
the executor's task state. It cannot advance a delivery, and neither a commit, local SHA, review,
nor local test can mark an outcome achieved. The delivery API enforces the sequence `proposed ->
admitted -> implementing -> evidence_complete -> review_accepted/review_rejected -> integrated ->
push_ready -> deployed -> observed_healthy -> outcome_accepted`; rollback remains explicit. Outcome
acceptance is a separate transition requiring evidence and an already observed-healthy delivery.

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

`NextLegalActionProjection` is the decision-readiness companion to
`CompanySituation`. It remains a derived read model rather than a parallel work
registry: all classifications come from canonical company-scoped operational
tables. Native supervision consumes the same projection, persists its aggregate
queue epistemology and one read-only shadow-dispatch decision, and runs the
bounded Observe -> Reconcile -> Decide -> Act -> Verify internal control lane. Roost may later
retain durable cross-project dependency knowledge, while Paperclip owns the
currently observed dependency and legal-action state.

The autonomy decision layer remains subordinate to those canonical records. It
persists five company-scoped structures: operational constraints, autonomy
envelopes, autonomy decisions, attached decision evaluations, and autonomy
executions. These are an audit/control layer, not new task truth. Operational
constraints carry affected issues, evidence, an owner, flow SLO, proposed
response, and resolution criteria. Decisions reference constraints and
envelopes; executions reference decisions and preserve dispatch, execution, and
outcome postconditions independently.

The decision vector is deliberately layered rather than collapsed into one
opaque score. Eligibility is a hard gate. Constraint relevance and
organizational value explain why work matters now. Risk, cost, and opportunity
cost bound authority. Confidence controls epistemic posture. A high queue rank
cannot override a failed layer.

Iteration 5 extends the internal lane to `Observe -> Reconcile -> Decide ->
Authorize -> Act -> Verify -> Learn -> Recalculate Constraint`. Authorization
has two non-equivalent sources: a graduated envelope, or one expiring
board-authorized canary record. Canary authority is consumed inside the same
serializable/idempotent admission transaction as the issue recheck and never
mutates the envelope stage.

Operational intent, interrupt, learned-policy, exception, dependency-freshness,
cost-semantics, and autonomy-debt records remain Paperclip projections because
they gate current execution. Their declared future canonical owner is Roost for
durable strategic intent/policy/organizational memory. Work selection from the
existing queue is versioned separately from future work generation and
goal/opportunity planning.
