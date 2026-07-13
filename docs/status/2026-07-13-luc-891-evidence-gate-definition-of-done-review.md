# LUC-891 Evidence Gate and Definition of Done Review

Date: 2026-07-13
Issue: [LUC-891](/LUC/issues/LUC-891)
Owner: 09 QVE
Mode: Review
Process: regression evidence loop

## Scope

Routine audit of whether the current Stage 1 Paperclip Softwarehouse
evidence-gate and definition-of-done path remains healthy for active and
completed Soar/Roost work.

This review focused on the post-repair state after the earlier
`completionEvidence` readback fix:

- live `GET /api/issues/:id` behavior for fresh post-repair `done` issues;
- older pre-repair `done` issues that were never backfilled; and
- the targeted route regression that is supposed to keep the closeout contract
  provable in CI/local verification.

## Evidence Reviewed

Policy and contract docs:

- `docs/softwarehouse/05-definition-of-done.md`
- `docs/softwarehouse/06-quality-gates.md`
- `docs/agent-evidence.md`
- `docs/agent-policy-gates.md`

Implementation readback:

- `server/src/routes/issues.ts`
- `server/src/__tests__/issue-update-comment-wakeup-routes.test.ts`

Live issue/API readback:

- [LUC-25](/LUC/issues/LUC-25)
- [LUC-875](/LUC/issues/LUC-875)
- [LUC-878](/LUC/issues/LUC-878)
- [LUC-880](/LUC/issues/LUC-880)
- [LUC-883](/LUC/issues/LUC-883)
- [LUC-884](/LUC/issues/LUC-884)
- [LUC-887](/LUC/issues/LUC-887)
- [LUC-889](/LUC/issues/LUC-889)

Repo state readback:

- `git status --short`

## Verification

Targeted regression executed on 2026-07-13:

- `pnpm exec vitest run server/src/__tests__/issue-update-comment-wakeup-routes.test.ts`
  - result: `8 passed, 1 failed`
  - failure:
    `requires typed completion evidence from agent actors`
  - observed response: `401 Agent run id required`
  - expected response in the current test: `422 Done status requires a typed completionEvidence bundle`
  - route readback:
    `server/src/routes/issues.ts` now calls `requireAgentRunId()` for agent
    mutations before the done-state evidence check, so the failure is
    consistent with the current route contract
  - conclusion: the red test currently reflects fixture drift in the
    agent-actor test setup rather than a live closeout readback regression

Live API readback on 2026-07-13:

- `GET /api/issues/LUC-884`
  - status: `done`
  - `completionEvidence`: present
- `GET /api/issues/LUC-887`
  - status: `done`
  - `completionEvidence`: present
- `GET /api/issues/LUC-889`
  - status: `done`
  - `completionEvidence`: present
- `GET /api/issues/LUC-883`
  - status: `done`
  - `completionEvidence`: present
  - blocker linkage still visible to [LUC-884](/LUC/issues/LUC-884)
- `GET /api/issues/LUC-875`
  - status: `done`
  - `completionEvidence`: not present
- `GET /api/issues/LUC-878`
  - status: `done`
  - `completionEvidence`: not present
- `GET /api/issues/LUC-880`
  - status: `done`
  - `completionEvidence`: not present
- `GET /api/issues/LUC-25`
  - status: `blocked`
  - first-class blockers: [LUC-448](/LUC/issues/LUC-448),
    [LUC-494](/LUC/issues/LUC-494)

Workspace readback:

- `server/src/routes/issues.ts` now requires `req.actor.runId` for agent
  mutations before agent-only completion-evidence enforcement
- the agent-actor regression test in
  `server/src/__tests__/issue-update-comment-wakeup-routes.test.ts` still sets
  `type: "agent"` but does not provide a `runId`

Source-control readback:

- the current workspace is still dirty in the same evidence-gate lane,
  including route, shared validator/type, docs, tests, and migration files

## Findings

### 1. Fresh live Definition-of-Done readback remains healthy

Severity: low

Fresh post-repair issues still expose populated `completionEvidence` on live
readback, including [LUC-883](/LUC/issues/LUC-883),
[LUC-884](/LUC/issues/LUC-884), [LUC-887](/LUC/issues/LUC-887), and
[LUC-889](/LUC/issues/LUC-889).

The earlier runtime/readback repair has therefore held for the current review
window.

### 2. Older pre-repair done issues still are not backfilled

Severity: medium

[LUC-875](/LUC/issues/LUC-875), [LUC-878](/LUC/issues/LUC-878), and
[LUC-880](/LUC/issues/LUC-880) still return no `completionEvidence` object.

The current live contract is healthy for fresh closures, but supervisors should
not infer historical backfill from that.

### 3. The focused route regression suite is currently red

Severity: medium

The narrow verification command for the closeout route no longer passes cleanly.
The failing case is the agent-actor assertion in
`server/src/__tests__/issue-update-comment-wakeup-routes.test.ts`, which still
expects the request to reach the `completionEvidence` gate without satisfying
the newer `requireAgentRunId()` precondition in `server/src/routes/issues.ts`.

This does not currently contradict the live product behavior, but it does weaken
the cheapest repeatable proof for the route contract and should be repaired.

### 4. Source-control closure is still open on the evidence-gate lane

Severity: medium

The workspace remains dirty in the route/schema/shared/docs/test files that
implement and document this contract. This review therefore cannot claim
source-control closure for the lane; it can only report live behavior and the
current verification state.

### 5. The Stage 1 parent remains correctly fail-closed

Severity: low

[LUC-25](/LUC/issues/LUC-25) remains blocked behind
[LUC-448](/LUC/issues/LUC-448) and [LUC-494](/LUC/issues/LUC-494), so the
parent mission still is not drifting into a false-green state.

## Verdict

PASS for live closeout/readback behavior, with one verification-lane failure.

The active instance still exposes typed `completionEvidence` on fresh done
issues, so the board-visible Definition-of-Done read path remains healthy for
new closures. The open problem in this review window is narrower: the cheapest
route regression command is red because the agent-actor test fixture no longer
matches the route's required `runId` precondition.

## Required Follow-Up

Create one narrow execution lane to restore the red regression:

- update the agent-actor route test fixture so it satisfies the current auth
  preconditions for agent-owned issue mutations;
- prove that the agent path again reaches the typed `completionEvidence` gate
  and returns the expected `422` when the bundle is missing; and
- keep the rest of the route regression file green.

## Residual Risk

Fresh done issues are healthy, but the narrow verification harness is not.
Until that regression test is repaired, the route contract is still relying on
live readback sampling plus code inspection instead of one clean repeatable
route-level proof command.
