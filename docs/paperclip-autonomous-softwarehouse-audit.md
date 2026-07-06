# Paperclip Autonomous Softwarehouse Audit

Date: 2026-07-02

Scope: local Paperclip Softwarehouse as an autonomous software company for Soar, Roost, and future
projects, including local development, git, Coolify deployment, evidence, supervision, and PDCA.

## Executive Finding

Paperclip is not yet a finished autonomous softwarehouse, but it is also not a blank slate. The core
control-plane primitives already exist for agents, tasks, runs, trajectory logs, artifacts, approvals,
activity, budgets, workspaces, and deployment reconciliation. The evidence requirement is documented
in the DoD and policy gates, and the targeted issue-execution policy suite verifies the current
completion guard. Deployment gates, supervisor review summaries, mission-control visibility, and
PDCA issue creation still need broader product enforcement.

Latest known local control posture from the prior verified control tick:

- control tick: `ok: true`
- control decision: `supervise_active_runs`
- softwarehouse audit: `pass`
- Coolify production reconciler: `ready`
- production resources observed: 8
- active/live runs: 2
- Paperclip OS working tree after the prior runtime-access commit: clean

## Requested Model Coverage

| Requested layer | Current implementation | Status | Gap |
|---|---|---|---|
| AgentOperatingRecord | `agents` plus runtime config, permissions, budgets, metadata, runs, activity | Partial | needs normalized projection/dashboard |
| AgentTask | `issues` with hierarchy, assignment, checkout, execution lock, labels, documents, work products | Implemented | richer status vocabulary should remain a stage overlay |
| AgentRun | `heartbeat_runs` | Implemented | structured run type/final report enforcement should be tightened |
| AgentRunEvent / trajectory | `heartbeat_run_events` plus `activity_log` | Implemented | event payload discipline and secret redaction must stay enforced |
| AgentEvidence | `issue_work_products`, documents, comments, attachments, approvals | Partial | targeted issue-execution policy tests verify the current `done` guard; deploy/high-risk evidence gates still need broader enforcement |
| AgentControlPolicy | approvals, permissions, budgets, runtime config, docs, agent completion evidence gate | Partial | single gate service/read model missing |
| SupervisorReview | approvals, interactions, supervisor issues, comments, activity | Partial | normalized review record missing |
| SDLC | scripts/docs/checks exist in pieces | Partial | mission-control view and strict transitions missing |
| PDCA | softwarehouse learning loop exists | Partial | repeated-failure triggers need broader automatic issue creation |
| Deployment | Coolify reconciler and runtime secret binding exist | Partial | deploy evidence must be attached per task/app, not only reconciled globally |
| Monitoring | health/control tick/reconciler exist | Partial | app-specific monitoring evidence map is incomplete |

## Critical Backlog

1. Extend evidence gates beyond the verified `done` policy path into deploy, production smoke, and
   high-risk closure flows. The current policy tests cover the issue completion guard, but high-risk
   agent closures should also require `SECURITY`, `DEPLOY`, and `MONITORING`.

2. Add a Mission Control surface that joins agents, tasks, runs, evidence, policy gates, deployment,
   monitoring, and PDCA state.

3. Create a normalized AgentOperatingRecord projection or endpoint if dashboard queries remain too
   complex over raw primitives.

4. Create a structured SupervisorReview record or projection with decision, checked evidence,
   residual risk, next owner, and next action.

5. Make repeated run/test/deploy failures automatically create or update process-improvement issues.

## High Backlog

- Add explicit run-type metadata for `PLAN`, `EXECUTE`, `REVIEW`, `QA`, `SECURITY`, `DOCS`,
  `DEPLOY`, and `RETRO`.
- Require final report or blocker/next action for every heartbeat run.
- Expand the evidence map from architecture-level rows into Soar/Roost backend-worker-frontend
  feature chains.
- Audit every application repository for AGENTS.md and add app-specific operating rules.
- Add app-specific production smoke checks for Soar and Roost.
- Link Coolify resource observations back to app issues and deployment work products.

## Medium Backlog

- Add dashboard filters for stage overlay statuses such as `QA_REQUIRED`, `SECURITY_REQUIRED`, and
  `READY_TO_DEPLOY`.
- Add metrics for test pass rate, failed actions, blocked time, deploy lead time, and evidence
  completeness.
- Add budget-policy visibility per role and project.
- Add supervisor lane balancing so broad supervisor work is decomposed into worker-ready issues.

## Low Backlog

- Improve docs navigation and examples as new gates become hard-enforced.
- Add templates for evidence comments and retrospective records.
- Add more app-specific role descriptions for future projects.

## Actions Implemented In This Audit Pass

- Added ADR-0001 to prevent duplicate task/run/evidence tables and define the canonical mapping.
- Added root softwarehouse docs for architecture, SDLC, governance, runtime, policy gates, evidence,
  trajectory logs, supervisors, deployment, testing, security, monitoring, retrospectives, and
  process improvement.
- Added an initial evidence map CSV.
- Updated AGENTS.md with mandatory softwarehouse evidence gates and traceability rules.
- Added the softwarehouse operating-system docs to the docs navigation.
- Verified the issue-execution policy gate with `pnpm exec vitest run server/src/__tests__/issue-execution-policy.test.ts`
  (`50 passed`); broader deploy/high-risk evidence enforcement remains a product backlog item.

## Current Verdict

The current Paperclip Softwarehouse is suitable as a V1 local control-plane foundation, not as a
final autonomous softwarehouse. It can coordinate useful work, and the Coolify runtime-access blocker
has been reduced, but full autonomy still depends on extending evidence enforcement to deploy/high-risk
flows and making operating records dashboard-visible.
