# LUC-1561 Conveyor Controller and Invariant Contract Review

Date: 2026-07-20
Issue: [LUC-1561](/LUC/issues/LUC-1561)
Parent: [LUC-1554](/LUC/issues/LUC-1554)
Downstream implementation lane: [LUC-1562](/LUC/issues/LUC-1562)

## Verdict

`PASS`, with the contract now stated in implementation terms.

The conveyor is already represented by existing issue, execution-policy, recovery, workspace, and completion-evidence services. The missing piece for the implementation lane is not a new controller tree. It is a bounded transition contract that makes the legal next move explicit at each stage.

## Controller Boundary

The controller surface should be understood as a thin coordinator over existing services:

- `server/src/services/issue-execution-policy.ts` owns the stage state machine for `in_review`, approval, review change requests, and stage-controlled assignment.
- `server/src/services/issues.ts` owns issue lifecycle mutation, checkout, dependency gating, child creation, parent wakeups, and completion writeback.
- `server/src/services/recovery/service.ts` owns stranded-work recovery, source-scoped repair, and wake propagation when a live lane loses continuity.
- `server/src/services/execution-workspaces.ts` owns source-control close-readiness and workspace finalize semantics.
- `server/src/services/workspace-runtime.ts` owns runtime startup, persistence, and shutdown around an execution workspace.

The review conclusion is that the conveyor contract should compose these surfaces instead of introducing a second orchestration model.

## Legal Conveyor Stages

The implementation lane should treat the conveyor as a serial sequence inside one project boundary:

1. problem framing
2. owner selection and scope definition
3. architecture or repair planning
4. implementation or repo-side change
5. source-control closure
6. protected QA or review gate
7. evidence fan-in
8. next-gap selection or terminal acceptance

Each stage needs its own live path and terminal proof. A comment alone is not terminal proof.

## Core Invariants

- `parentId` is structural only. It explains why a child exists but does not make the parent healthy.
- `blockedByIssueIds` is the dependency contract. Use it when the next move depends on a different issue changing state.
- A parent is live only when it has one of these explicit next-move paths:
  - an active child lane that is executing the next gap;
  - a queued wake or continuation for the same owner;
  - an explicit recovery action naming owner and next action;
  - a clear waiting path such as blocker, approval, or monitor.
- The current project should have only one active gap-selection lane at a time unless a separate recovery or review lane is intentionally opened.
- `in_review` is valid only when the next decision path is inspectable and owned by a typed participant, approval, interaction, monitor, or explicit recovery path.
- `done` requires typed completion evidence.
- High-risk completions additionally require security, deployment, and monitoring evidence.

## Cross-Unit Handoff Points

The controller contract should name these handoff boundaries explicitly:

- Product problem framing -> CTO/TSA contract definition
- CTO/TSA contract definition -> implementation specialist lane
- implementation -> source-control closure
- source-control closure -> QA/review or approval gate
- QA/review -> evidence fan-in and parent wake
- evidence fan-in -> next-gap selection or terminal acceptance

The implementation lane should never skip from a repo-side truth refresh directly to terminal issue completion without a separate issue-side disposition writeback.

## Live Regression Requirement

`LUC-1546` must remain a live regression requirement.

The important rule is:

- repo-side truth refresh and issue-side disposition writeback are separate completion planes;
- if the writeback path is unavailable, the issue still needs a visible recovery or blocked disposition;
- board repair must not be used to paper over a missing issue-side disposition path.

That regression belongs in the implementation tests and in the acceptance narrative for the conveyor, not as a one-off comment.

## Recommended Implementation Shape

The smallest useful implementation is a thin policy layer that:

1. chooses the next unresolved gap in the current project lane;
2. records the evidence or blocker that closes the current stage;
3. creates or reuses the next child lane in the same project;
4. delegates wake, recovery, and monitor work to the existing services.

This keeps the controller bounded and avoids duplicating recovery or execution-policy logic.

## Verification Performed

Reviewed:

- `doc/execution-semantics.md`
- `server/src/services/issue-execution-policy.ts`
- `server/src/services/issues.ts`
- `packages/shared/src/validators/issue.ts`

Validation commands:

- `rg -n "parent-liveness|cross-unit transition contract|problem-to-completion conveyor|product-parent|source-control closure|review|deployment|monitoring|completion" doc/execution-semantics.md`
- `rg -n "status transition|issue status|checkout|required.*completionEvidence|blockedByIssueIds|single-assignee|atomic checkout|execution lock|done" packages/shared/src/validators/issue.ts server/src/routes server/src/services packages/db/src/schema/issues.ts`

## Residual Risk

The review contract is now explicit, but the implementation lane still has to prove that the controller stays thin and that the live regression is covered by tests rather than just documentation.

