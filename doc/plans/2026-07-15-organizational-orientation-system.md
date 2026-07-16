# Organizational Orientation System

Date: 2026-07-15
Status: active architecture and delivery plan

## Purpose

Paperclip already coordinates agents, issues, runs, budgets, approvals, evidence,
workspaces, recovery, and organizational learning. The next capability is to
compose those primitives into a shared operating picture that lets an autonomous
company act coherently toward its goals.

The target is not simulated human consciousness. The target is an inspectable
control-plane equivalent of the quiet concepts human organizations use when they
orient, decide, execute, and learn.

## System Boundary

The system remains company-scoped, evidence-led, and board-governed. It does not
replace issues, goals, projects, approvals, activity, or work products. It creates
read models and narrowly governed records over those canonical primitives.

The operating loop is:

```text
Observe -> Establish current truth -> Orient -> Decide -> Commit -> Execute
        -> Verify outcome -> Learn -> Refresh current truth
```

Every derived claim must expose its source and observation time. A projection may
summarize canonical state, but it must never silently become a new source of truth.

## Complementary Capability Model

| Human implicit concept | Paperclip capability | Existing foundation | Target addition |
| --- | --- | --- | --- |
| Shared reality | Current-truth and provenance model | evidence, activity, knowledge governance | freshness, source class, contradiction and staleness signals |
| Attention | Ranked operational signals | inbox, blocker attention, approvals, incidents | impact/urgency/cost-of-delay ranking and explicit next owner |
| Time | Temporal orientation | timestamps, project target dates, routines, watchdogs | clock packet, overdue/due-soon facts, forecast and schedule variance |
| Causality | Cause and dependency graph | issue relations, blocker graph, retrospectives | symptom/cause/root-cause/prevention classification |
| Intent | Outcome alignment | goals, projects, parent issues | expected outcome, beneficiary, success observation and goal trace quality |
| Commitment | Promise and handoff accountability | assignee, approvals, interactions | explicit commitment, recipient, condition/date and renegotiation history |
| Decision memory | Durable organizational choices | approvals, ADRs, comments | alternatives, rationale, assumptions, review condition and supersession |
| Uncertainty | Assumption management | comments and evidence | confidence, source, cost of error, validation action and expiry |
| Opportunity cost | Comparative prioritization | priority, budgets | impact, cost of delay, unlock value and reason for choosing now |
| Capacity | Work-in-progress control | agent/run status, checkout locks | available capacity, bottleneck, queue and context-switch indicators |
| Reversibility | Action-sensitive autonomy | permissions, approvals, safety gates | reversibility, rollback readiness and blast-radius classification |
| Trust | Evidence-calibrated delegation | runs, feedback, evals | task-class reliability profile without a single global agent score |
| Social norms | Explicit collaboration contract | org tree, handoffs, audit | executor/decider/reviewer/informed/unblock-owner roles |
| Constructive dissent | Safe challenge/escalation | blocked state, interactions, manager chain | contradiction/obsolete-work/alternative-path decision request |
| Closure | Output-to-outcome verification | typed completion evidence | output, acceptance, outcome and impact layers |
| Memory | Governed retention and forgetting | documents, journal, knowledge governance | validity, owner, supersession and context-loading policy |
| Positive learning | Reinforcement of good patterns | improvement flywheel | successful-pattern detection and promotion to skills/templates/evals |
| External grounding | Contact with real outcomes | monitoring and product evidence | customer, production, market and business observation signals |

## Architectural Layers

### 1. Observation layer

Canonical facts from goals, projects, issues, relations, runs, approvals, budgets,
activity, monitoring, work products, and external connectors. Observations retain
source identity and timestamps.

### 2. Orientation layer

A deterministic `CompanySituation` read model summarizes mission, temporal state,
work posture, capacity, attention signals, and evidence freshness. Deterministic
facts are kept separate from model-generated assessments.

### 3. Deliberation layer

First-class assumptions, commitments, and decision records
objects link back to goals and work and include owners, review conditions, and
supersession history.

### 4. Execution layer

Issues, assignments, checkout locks, heartbeat runs, workspaces, approvals, and
policy gates remain the canonical execution system.

### 5. Learning layer

Safe traces, feedback, evals, retrospectives, and improvement tasks update
procedures, skills, routing policy, and trust profiles. Learning may recommend a
change; governed records and evidence decide whether it becomes current truth.

## Delivery Slices

### Slice 1: deterministic company situation — implemented foundation

- Add a company-scoped situation read model with generated time and source
  freshness.
- Surface active mission, project target posture, work/capacity counts, and
  ranked attention signals.
- Expose it through API and the board dashboard.
- Do not add a database migration; derive from canonical V1 primitives.

### Slice 2: heartbeat orientation packet — implemented company-visible V1 projection

- Include a projection of `CompanySituation` in issue heartbeat context. The
  first implementation uses company-visible V1 facts; future scoped visibility
  controls must narrow this projection when those controls exist.
- Preserve thin/fat context rules and avoid leaking secret or restricted data.
- Record the situation observation time in the run context snapshot.

### Slice 3: assumptions, commitments, and decisions â€” implemented foundation

- Define company-scoped, auditable schemas and lifecycle rules.
- Link records to goals, projects, issues, agents, users, and evidence.
- Support expiry/review, contradiction, renegotiation, and supersession.
- Add activity entries and board/agent permission checks for every mutation.

### Slice 4: forecasting and capacity — operational baseline implemented

- Separate active execution time, wall-clock time, external waiting, review
  waiting, and human-gate waiting.
- Calibrate task-class estimates from historical evidence.
- Produce forecasts with confidence and critical-path explanations, not forced
  deadlines.
- Expose WIP, bottleneck, queue, and context-switch signals.

`CompanySituation` now combines a 30-day historical-throughput range with an
explicit flow decomposition: assigned queue, execution, review, human approval,
external monitored waiting, and unknown blocked waiting. It reports the largest
observed queue, age, per-agent parallel WIP, and context-switch attention. The
forecast remains non-binding. Project/task-class calibration and probabilistic
dependency forecasting remain later calibration work rather than invented precision.

### Slice 5: outcome and causal learning — implemented foundation

- Separate output, acceptance, outcome, and impact.
- Add causal incident/retrospective classification.
- Promote both failure lessons and successful patterns through the existing
  improvement flywheel and eval gates.

Typed organizational observations now distinguish output, acceptance, outcome,
and impact; symptoms, contributing causes, root causes, prevention, and success
factors; and proposed, validated, promoted, rejected, or superseded learning.
Promotion is impossible before validation and requires a durable target such as a
skill, procedure, template, eval, routine, policy, or issue.

### Slice 6: external grounding — implemented foundation

- Normalize product monitoring, customer feedback, business metrics, and market
  observations as sourced signals.
- Require freshness and provenance.
- Keep connector-specific behavior outside the thin core where appropriate.

External observations now require provenance plus an explicit validity boundary
or freshness window. `CompanySituation` separates current, stale, and contradicted
signals and reports category coverage without hard-coding connector behavior.

## Safety And Quality Invariants

- Every record and projection is company-scoped.
- Derived orientation never overrides canonical state.
- Facts, assumptions, forecasts, recommendations, and decisions remain distinct.
- Each attention item has a reason, source, observation time, and suggested owner
  or action.
- Forecasts express uncertainty and never create an implicit deadline.
- Agent trust is task-class-specific and evidence-backed, not a universal rank.
- High-risk actions continue to require existing approval and evidence gates.
- The board can inspect why a signal or recommendation exists.
- No system component may create unbounded agent loops or hidden token burn.

## Initial Acceptance Criteria

1. A board user can retrieve one bounded company situation payload.
2. The payload states when it was generated and which canonical facts produced
   its attention signals.
3. The payload distinguishes blocked work, unassigned runnable work, agent
   errors, pending approvals, budget incidents, overdue targets, and due-soon
   targets.
4. Cross-company data is never included.
5. The board dashboard shows the highest-value orientation facts without making
   raw logs the primary surface.
6. Existing V1 task, approval, budget, and execution invariants remain unchanged.

## Non-Goals For The First Slice

- No claim that Paperclip predicts completion dates accurately yet.
- No LLM-generated prioritization presented as fact.
- No automatic reassignment or cancellation.
- No schema expansion while the known Drizzle snapshot ancestry defect remains
  unresolved. The defect was resolved before Slice 3 by linearizing the 0095/0098
  snapshot ancestry and adding idempotent reconciliation migration 0101.
- No replacement of current Softwarehouse control scripts or evidence gates.
