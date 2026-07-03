# Autonomous Development Loop

Last updated: 2026-06-01

## Goal

Paperclip Softwarehouse should operate as an autonomous delivery company under
owner supervision. Patryk owns vision, priorities, and strategic decisions.
Paperclip owns operational analysis, planning, delegation, implementation,
validation, release coordination, monitoring, and process improvement.

Target operating split:

| Layer | Responsibility |
| --- | --- |
| Roost | Source of truth for portfolio, product intent, project state, and durable memory. |
| Paperclip | Autonomous operating layer: issues, routines, agents, gates, evidence, delivery decisions. |
| Codex | Execution layer for implementation, tests, docs, analysis, and safe operational commands. |
| Patryk | CEO, Vision Owner, Strategic Decision Maker. |

## Current Architecture Summary

Paperclip already has most control primitives, but they are distributed across
many scripts and routines:

- `pnpm softwarehouse:control-tick` runs the canonical supervision pass.
- `scripts/run-softwarehouse-control-tick.mjs` executes janitors, gate checks,
  source-control checks, readiness checks, seeders, learning loop, and audit.
- `scripts/run-autonomy-governor.mjs` decides the current operating posture.
- `scripts/run-live-run-janitor.mjs` closes stale live-run tails.
- `scripts/run-gate-freshness-watcher.mjs` handles credential/approval gate
  freshness without exposing secret values.
- `scripts/check-softwarehouse-source-control.mjs` emits dirty-repo packets.
- `scripts/run-project-known-state-harvester.mjs` creates known-state lanes when
  safe.
- `scripts/run-softwarehouse-learning-loop.mjs` detects repeated blockers and
  creates capability-gap issues.
- `scripts/audit-luckysparrow-softwarehouse.mjs` reports health and process
  findings.

The current model is therefore a strong governance layer, but not yet a closed
delivery loop. It can observe, classify, seed, and block. It does not yet
produce one durable cycle record that proves:

1. what changed,
2. what was selected for execution,
3. who executed it,
4. what validation ran,
5. what was committed/pushed/deployed,
6. what monitoring found,
7. what Paperclip learned,
8. which improvement was added to its own backlog.

## Current State On 2026-06-01

Latest `pnpm softwarehouse:control-tick` completed successfully.

Current control decision:

```text
operating_source_control_closure_needed
```

Meaning:

- Paperclip OS has uncommitted local changes.
- Broad project delivery is blocked until the Paperclip OS worktree is
  committed or explicitly classified.
- `deliveryPermission.canStartNewLane=false`.
- Only `paperclip_os_closure` is allowed.

Observed constraints:

- No live runs were active during the tick.
- Project dirty state exists in Soar, Roost, Aviary, and Nest, but project repo
  mutation is not allowed while Paperclip OS closure is pending.
- Learning loop already detects repeated gaps:
  - ops/release blocker pattern,
  - worker queue fan-out capability gap,
  - in-review decision path capability gap.
- Audit still warns about:
  - in-review issues without structured decision paths,
  - runnable work concentrated above worker level,
  - runtime-gated issues assigned to agents without required bindings.

## Architectural Gaps

### 1. No Single Cycle Ledger

`control-tick` emits a rich JSON report, but there is no first-class
`AutonomousCycle` entity or durable ledger tying together:

- inputs,
- decision,
- started lanes,
- validation,
- release,
- monitoring,
- learning,
- follow-up issues.

Result: Paperclip can say what the current state is, but cannot always prove how
one autonomous iteration progressed from observation to delivery or blockage.

Required change:

- Add an `autonomous_cycle` record model or at minimum a durable JSON/Markdown
  ledger under `report/autonomous-cycles/`.
- Every scheduled tick should write a cycle id, control decision, selected
  actions, lane starts, validation results, release disposition, monitor
  results, learning outputs, and next cycle preconditions.

### 2. Control Tick Is Too Broad To Be The Executor

`run-softwarehouse-control-tick.mjs` currently runs many checks and selected
apply-mode seeders. It is useful as a supervisor, but it mixes:

- observation,
- cleanup,
- seeding,
- readiness,
- learning,
- audit.

Result: execution authority is implicit. Some scripts apply changes while
others are read-only, and the caller must infer what the next executable action
is.

Required change:

- Split the loop into explicit phases:
  1. Observe,
  2. Decide,
  3. Dispatch,
  4. Validate,
  5. Release,
  6. Monitor,
  7. Learn.
- Make `control-tick` the read-mostly orchestrator.
- Add `run-autonomous-development-cycle.mjs` as the single 30-minute routine
  that consumes the control tick and performs only actions allowed by the
  current delivery permission.

### 3. No Release Record As A First-Class Artifact

The docs define release/deploy governance, but deployment state is not yet
normalized into one record per release candidate.

Result: Paperclip may know a task is done locally without being able to answer
cleanly:

- was it pushed,
- was staging updated,
- was production updated,
- which SHA is live,
- which smoke tests proved it,
- what rollback exists.

Required change:

- Add `ReleaseRecord` or `DeploymentLedger` per project/environment.
- Required fields:
  - project,
  - environment,
  - source SHA,
  - image/build id,
  - validation commands,
  - deployment command/provider,
  - smoke commands/results,
  - rollback action,
  - approval/permit issue,
  - monitoring check id.

### 4. Monitoring Exists As Issue Policy, But Not As Delivery Continuation

Paperclip has issue monitor support and monitor scheduler tests, but deployment
monitoring is not yet wired as a mandatory continuation of release.

Result: a deployment can be treated as complete before logs, containers,
services, and performance have been checked.

Required change:

- After any staging or production deploy, automatically schedule a monitor issue
  or monitor policy.
- Monitor must collect:
  - service/container status,
  - application health/readiness,
  - recent error logs,
  - smoke route status,
  - performance budget sample when available.
- Release stays `in_review` until monitor proof is attached or blocked with
  owner/action.

### 5. Learning Loop Is Pattern-Based, Not Outcome-Based

`run-softwarehouse-learning-loop.mjs` detects repeated blockers and fan-out
problems. That is useful, but the strategic requirement is broader: each cycle
must ask what slowed Paperclip down and convert safe improvements into backlog.

Result: Paperclip learns mostly from repeated blocked issue clusters, not from
each iteration's actual cycle friction.

Required change:

- Extend learning to consume the cycle ledger.
- Add structured outputs per cycle:
  - `Improvement Proposals`,
  - `Architecture Suggestions`,
  - `Missing Capabilities`.
- Each proposal must have:
  - evidence,
  - safety class,
  - expected autonomy gain,
  - implementation owner,
  - retirement condition.
- Safe proposals create backlog issues automatically.

### 6. Worker Dispatch Is Not Yet Strong Enough

The audit reports runnable work concentrated above the worker layer. The current
system can identify this, but worker-ready decomposition is still a gap.

Result: managers/controllers may look busy while implementation workers are
idle.

Required change:

- Add a `work_packet` contract for executable issues:
  - capability,
  - files/modules,
  - acceptance criteria,
  - validation commands,
  - docs/evidence output,
  - source-control expectation,
  - release impact.
- Dispatch may start Codex only when this packet is complete or the issue is a
  discovery/triage lane.

### 7. Roost Is Not Yet The Operational Source Of Truth

The target model says Roost is the source of truth. Current Paperclip source of
truth is mostly local Paperclip DB plus repo docs, reports, and issue state.

Result: portfolio truth, product truth, architecture truth, and operational
truth can drift across Paperclip issues, docs, project repos, and root index.

Required change:

- Define a Roost truth adapter:
  - read portfolio/project/product/roadmap state from Roost,
  - write cycle summaries and delivery state back to Roost,
  - reconcile Paperclip issues against Roost truth on every cycle.
- Until Roost is ready, write a local `truth_snapshot` artifact with the same
  schema so Paperclip can migrate without changing the loop.

Current external truth candidate:

| Surface | Location | Observed state on 2026-06-01 |
| --- | --- | --- |
| Drive portfolio root | `Przedsiębiorczość` folder, `1_GQ1zJy8-2qKCwbS1nQex5mXqnKu6IDI` | Contains high-level business folders and fresh project folders. |
| Paperclip Drive folder | `1nA_nbqcTrDMBRBh_Zx8vJ9aK7KzXeH70` | Empty. |
| Roost Drive folder | `1Ek-VePVCKHroZ4S3S-2jXMpQj8fkjgbL` | Empty. |
| Soar Drive folder | `1VDLF_96I3oCM0MzTTd1KKxYwVbuXcRkd` | Contains empty `docs`, `sheets`, and `archive` folders. |

This means the Drive structure can become the owner-facing portfolio/truth
surface, but Paperclip must not treat it as authoritative yet. The first Roost
truth-adapter milestone should seed these folders with generated cycle
summaries, release ledgers, product/roadmap summaries, and project status
snapshots from Paperclip instead of reading missing documents as real silence.

## Proposed 30-Minute Autonomous Cycle

## Temporary Local Codex Bootstrap Supervisor

Until Paperclip owns the full cycle itself, the local Codex desktop session may
run a temporary bootstrap supervisor:

```text
pnpm codex:bootstrap-supervisor
```

This is an external readiness monitor, not a Paperclip agent. It runs
Paperclip's control tick, writes `report/codex-bootstrap-supervisor.latest.*`,
and checks whether the local Codex automation can be retired.

The supervisor must be removed after Paperclip satisfies the retirement checks
documented in `softwarehouse/codex-bootstrap-supervisor.md` and completes one
clean Paperclip-owned autonomous cycle without external Codex intervention.

### Phase 0: Preconditions

Inputs:

- Paperclip API health,
- live runs,
- source-control packet,
- Roost truth snapshot or local fallback,
- active strategy/priorities from Patryk,
- current project gates.

Hard stops:

- Paperclip OS dirty and unclassified,
- pending `request_confirmation`,
- unsafe production/secret/live-account action without permit,
- destructive filesystem action,
- missing Codex runtime auth.

Output:

- cycle id,
- current allowed lane types,
- stop reason or proceed decision.

### Phase 1: Activity Analysis

Collect:

- latest agent runs,
- new/updated/completed/blocked issues,
- errors and failed commands,
- stale live runs,
- inactive agents,
- failed deploys,
- dirty repos,
- health/restart flags.

Output:

- `ActivityReport`.

### Phase 2: Progress Evaluation

Compare:

- Roost/project truth,
- roadmap,
- architecture graph,
- backlog,
- active issue states,
- release ledger,
- monitoring ledger.

Classify:

- completed,
- blocked,
- stale,
- unsafe,
- ready for worker,
- ready for validation,
- ready for release,
- ready for monitoring,
- needs owner decision.

Output:

- `ProgressDecision`,
- ordered `nextControlActions`.

### Phase 3: Work Dispatch

If safe runnable work exists:

- pick highest priority issue allowed by delivery permission,
- ensure one owner and one proof contract,
- create or validate `work_packet`,
- start Codex execution for exactly that lane or a bounded parallel set when
  agents and dependencies are independent.

Output:

- `DispatchRecord` with run ids and expected evidence.

### Phase 4: Validation

After work:

- run lint/typecheck/build/tests relevant to changed files,
- run architecture lifecycle validation,
- run security/secret checks when relevant,
- produce a validation pack.

If validation fails:

- create a repair issue,
- link it to the failed work,
- keep parent blocked or in review.

Output:

- `ValidationRecord`.

### Phase 5: Source Control And Deployment

If validation passes:

- commit scoped work,
- push only when remote/branch approval exists,
- deploy to staging when the release contract allows it,
- deploy to production only with release mutation permit and rollback path.

Output:

- `ReleaseRecord`.

### Phase 6: Monitoring

After deploy:

- check logs,
- check app errors,
- check containers/services,
- check health/readiness,
- check performance sample,
- attach proof to release record.

If monitoring fails:

- create recovery issue,
- block/revert according to rollback policy.

Output:

- `MonitorRecord`.

### Phase 7: Self-Improvement

For each cycle answer:

1. What slowed development?
2. What Paperclip capability is missing?
3. What information was hard to access?
4. What still required manual work?
5. Which module would increase autonomy?

Output:

- `Improvement Proposals`,
- `Architecture Suggestions`,
- `Missing Capabilities`.

If safe:

- create implementation issue in Softwarehouse Operating System,
- link to cycle id,
- assign owner,
- define acceptance and retirement condition.

## Proposed New Modules

### `scripts/run-autonomous-development-cycle.mjs`

Canonical scheduled entrypoint.

Responsibilities:

- call `softwarehouse:control-tick`,
- create cycle ledger record,
- enforce `deliveryPermission`,
- dispatch exactly allowed work,
- call validation/release/monitor/learning submodules,
- never silently skip without recording why.

### `scripts/lib/autonomous-cycle-ledger.mjs`

Writes and reads cycle records.

Initial storage:

- `report/autonomous-cycles/YYYY-MM-DD/<cycle-id>.json`,
- `report/autonomous-cycles/latest.json`,
- `docs/status/autonomous-development-cycle.md`.

Later storage:

- Roost truth API.

### `scripts/lib/work-packet.mjs`

Normalizes issue-to-execution readiness.

Fields:

- project,
- issue,
- owner,
- affected areas/files,
- acceptance criteria,
- validation commands,
- source-control expectation,
- release impact,
- monitoring requirement.

### `scripts/lib/release-ledger.mjs`

Tracks staging/production release state and evidence.

### `scripts/lib/monitoring-ledger.mjs`

Tracks post-release health checks and recovery actions.

### `scripts/lib/self-improvement-engine.mjs`

Consumes cycle records and creates safe Paperclip improvement issues.

### `scripts/lib/roost-truth-adapter.mjs`

Abstracts the future Roost source-of-truth contract. Until Roost is ready, it
uses local fallback files with the same schema.

## Minimum Implementation Backlog

### P0: Close Paperclip OS Worktree Gate

Current blocker:

```text
operating_source_control_closure_needed
```

Acceptance:

- Paperclip OS dirty files are committed or explicitly classified.
- `pnpm softwarehouse:control-tick` no longer returns
  `operating_source_control_closure_needed`.
- No project delivery starts before this is true.

### P1: Add Autonomous Cycle Ledger

Acceptance:

- each 30-minute cycle creates one JSON and one Markdown summary,
- summary includes activity, decision, dispatch, validation, release,
  monitoring, learning, and next actions,
- latest cycle is easy to inspect from UI or file.

### P1: Add Single Scheduled Cycle Entrypoint

Acceptance:

- routine runs `run-autonomous-development-cycle.mjs` every 30 minutes,
- existing governor/gate watcher/janitors become sub-phases or supporting
  routines,
- no duplicate governor self-supervision issue is created.

### P1: Add Work Packet Gate

Acceptance:

- Codex execution starts only for issues with complete work packet or explicit
  discovery/triage type,
- manager/controller issues must split work before specialist execution,
- audit no longer reports worker fan-out as unhealthy when runnable work exists.

### P2: Add Validation Matrix Per Project

Acceptance:

- each project has canonical lint/build/test/smoke commands,
- validation result is attached to issue and cycle ledger,
- failure creates a repair issue with exact command and owner.

### P2: Add Release And Deployment Ledger

Acceptance:

- each deployable project records staging/prod SHA, command, evidence, rollback,
  permit, and monitor status,
- production deploy cannot be marked complete without post-deploy monitor.

### P2: Add Monitoring Continuation

Acceptance:

- release success schedules monitor,
- monitor result closes release or creates recovery issue,
- health/log/container checks are recorded without secret leakage.

### P2: Extend Learning Loop To Cycle Outcomes

Acceptance:

- every cycle emits improvement proposals, architecture suggestions, and missing
  capabilities,
- safe proposals create Softwarehouse backlog issues,
- noisy/repeated proposals are deduped with retirement conditions.

### P3: Roost Truth Adapter

Acceptance:

- local truth snapshot schema exists,
- Paperclip can read/write through the adapter,
- migration to Roost source of truth does not change cycle logic.

## Safety Policy

Autonomy is allowed for:

- local analysis,
- issue creation,
- docs/status updates,
- tests,
- local commits when scoped and verified,
- staging deploy when explicit project policy allows it,
- production deploy only through release mutation permit.

Autonomy is not allowed for:

- secret disclosure,
- live trading/account mutation,
- destructive repository actions,
- production restart/deploy without permit,
- push without explicit remote/branch intent,
- hiding dirty state,
- marking done without proof.

## Success Criteria

Paperclip reaches the desired operating model when each project can answer, at
any time:

- what is the current product truth,
- what changed since the last cycle,
- what is blocked and who owns the unblock,
- which tasks are ready for Codex,
- which validation proves current behavior,
- which SHA is deployed to staging and production,
- what monitoring says after deploy,
- what Paperclip learned and what it changed in itself.

At that point Patryk should only need to provide:

- vision,
- priorities,
- strategic approvals,
- credentials/permissions when genuinely required,
- business-level go/no-go decisions.
