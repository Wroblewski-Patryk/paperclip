# Softwarehouse V1 Goals And Routines Audit

Last updated: 2026-07-04

Purpose: verify whether Paperclip goals and routines are ready to guide the
first Stage 1 activation without creating noise, duplicate work, or accidental
agent execution.

## Verdict

V1 goals and routines are now well defined for a controlled start, but they are
not an approval to run.

Estimated readiness for the goals/routines layer: about 97%.

The remaining 3% is intentional: the owner still needs to approve Stage 1 and
select the exact activation mode before any routine trigger, issue creation, or
agent resume happens.

## Current Goal Tree

| Goal | Status | Owner | Purpose |
| --- | --- | --- | --- |
| `00 General: v0 Softwarehouse Readiness` | Planned | `00 AIA` | Stage 0 completion/readiness gate. |
| `00 General: Stage 1 Controlled Activation Dry Run` | Planned | `00 AIA` | First V1 operating-loop proof before broad autonomous work. |
| `11 Innovation: Stage 1 Soar Activation` | Planned, child of controlled dry run | `11 SPM` | First product lane, starting with Soar architecture/readiness baseline. |
| `11 Innovation: Stage 1 Roost Activation` | Planned, child of controlled dry run | `11 RPM` | Second product lane, activated after the controlled Soar path unless owner changes priority. |

## Current Routine Set

All routines are paused and all triggers are disabled.

| Routine | Owner | V1 purpose |
| --- | --- | --- |
| `00 General - v1 Draft Paused - Controlled Activation Dry Run` | `00 AIA` | Owner packet, one parent issue, Soar preflight, evidence, cost note, learning packet. |
| `00 General - v1 Draft Paused - Softwarehouse Liveness and Quiet-State Review` | `00 AIA` | Confirm Paperclip is intentionally quiet or intentionally running and free of accidental broad work. |
| `04 Operations - v1 Draft Paused - Portfolio Truth and Project Index Review` | `04 COO` | Keep active lanes, repo paths, parked apps, and task hygiene aligned. |
| `04 Operations - v1 Draft Paused - PDCA Learning and Company Memory Review` | `04 COO` | Turn run lessons into governed memory/procedure/instruction improvements. |
| `06 People - v1 Draft Paused - Agent Hiring and Governance Review` | `06 AIM` | Handle hiring/role-change requests through the governed AI workforce path. |
| `07 Finance - v1 Draft Paused - Cost, Quota, and Budget Review` | `07 CFO` | Review Paperclip cost summary, Codex quota windows, and budget-limit decisions. |
| `09 Technology - v1 Draft Paused - Evidence Gate and Definition of Done Review` | `09 QVE` | Prevent completion without inspectable evidence and parent synthesis. |
| `09 Technology - v1 Draft Paused - Source Control and Deploy Readiness Review` | `09 DRE` | Check repo, branch, push, Coolify, and production-smoke readiness before deploy-impacting work. |
| `10 Legal - v1 Draft Paused - Secrets, Coolify, and VPS Access Readiness Review` | `10 SPA` | Verify secret refs, least privilege, and production mutation gates. |

## What Improved

- Added `00 General: Stage 1 Controlled Activation Dry Run` as the parent V1
  goal for the first operating-loop proof.
- Linked Soar and Roost Stage 1 goals under the controlled dry-run goal.
- Renamed routines from `v0 Paused` to `v1 Draft Paused`.
- Linked all V1 draft routines to the controlled dry-run goal and the
  `00 General: Softwarehouse` project.
- Added a dedicated controlled activation routine.
- Added a dedicated finance routine for cost, quota, and budget review.
- Kept every routine paused and every trigger disabled.

## V1 Activation Rule

Stage 1 should start with the controlled activation routine, not with a bulk
agent resume.

Recommended activation sequence:

1. Owner approves the controlled dry-run scope.
2. `00 AIA` presents the Polish owner packet.
3. Only the minimal dry-run agent set is resumed or invoked.
4. One parent issue is created under the controlled dry-run goal.
5. Soar architecture/readiness preflight runs first.
6. Evidence, cost/quota note, and learning packet are produced.
7. Owner decides whether to expand to Soar implementation, Roost activation,
   budget limits, or more routines.

## Product Lifecycle Note

Soar and Roost remain under `11 Innovation` for the first V1 cycles because the
initial goal is validation and readiness. Once an app is usable, supportable,
deployable, and commercially meaningful, agents should propose a governed move
to `02 Product: AppName` using
`.agents/state/softwarehouse-innovation-to-product-lifecycle.md`.

## Stop Conditions

Do not activate if:

- the owner has not approved Stage 1;
- the first action is broader than one controlled dry run;
- a routine trigger would create work automatically without the owner;
- agents would be bulk-resumed without a narrow activation set;
- cost/quota/budget uncertainty cannot be reported clearly;
- Soar/Roost repo state or architecture source of truth is unclear.

## Verification

Verified after configuration:

- 4 goals, all `planned`;
- 9 routines, all `paused`;
- 0 enabled routine triggers;
- 38 agents, all `paused`;
- 0 issues/tasks;
- 0 live runs;
- DB backup:
  `.paperclip/runtime/home/instances/default/data/backups/paperclip-20260704-032614.sql.gz`.
- Post innovation-to-product project-description backup:
  `.paperclip/runtime/home/instances/default/data/backups/paperclip-20260704-032840.sql.gz`.
