# LUC-887 Evidence Gate and Definition of Done Review

Date: 2026-07-13
Issue: [LUC-887](/LUC/issues/LUC-887)
Owner: 09 QVE
Mode: Review
Process: regression evidence loop

## Scope

Routine audit of whether the current Stage 1 Paperclip Softwarehouse
evidence-gate and definition-of-done path remains healthy for active and
completed Soar/Roost work.

This review focused on the completion-evidence read path during an active live
repair window:

- workspace code/docs that now describe and implement typed
  `completionEvidence`; and
- the live Paperclip API read model on `http://127.0.0.1:3200`, which at the
  start of this review still did not expose `completionEvidence` on sampled
  recent `done` issues.

## Evidence Reviewed

Policy and contract docs:

- `docs/softwarehouse/05-definition-of-done.md`
- `docs/softwarehouse/06-quality-gates.md`
- `docs/agent-evidence.md`
- `docs/agent-policy-gates.md`
- `docs/api/issues.md`
- `docs/softwarehouse-sdlc.md`
- `doc/AGENT-ARTIFACTS.md`

Implementation readback:

- `packages/db/src/schema/issues.ts`
- `server/src/routes/issues.ts`
- `server/src/services/issues.ts`
- `server/src/__tests__/issue-update-comment-wakeup-routes.test.ts`

Live issue/API readback:

- [LUC-25](/LUC/issues/LUC-25)
- [LUC-855](/LUC/issues/LUC-855)
- [LUC-875](/LUC/issues/LUC-875)
- [LUC-878](/LUC/issues/LUC-878)
- [LUC-880](/LUC/issues/LUC-880)
- owner path follow-up [LUC-883](/LUC/issues/LUC-883)
- active implementation lane [LUC-884](/LUC/issues/LUC-884)

Repo state readback:

- `git status --short`

## Verification

Targeted regression executed on 2026-07-13:

- `pnpm exec vitest run server/src/__tests__/issue-update-comment-wakeup-routes.test.ts`
  - result: `7 passed`
  - warning: `failed to log successful run handoff resolution` because the
    mocked `db` in that harness still does not implement `select`
  - proves:
  - bare `done` without completion evidence returns `422`
  - `done` with typed completion evidence succeeds
  - artifact-backed typed refs succeed
  - invalid or missing typed refs are rejected

Initial live API readback on 2026-07-13:

- `GET /api/issues/5ec592b6-6301-46af-8135-30866abcdfc2`
  for [LUC-855](/LUC/issues/LUC-855):
  - status: `done`
  - `completionEvidence`: not present
  - inspectable evidence still exists through `1` comment
- `GET /api/issues/29a0e9ff-38d7-4232-8bfe-8cf7457865ae`
  for [LUC-875](/LUC/issues/LUC-875):
  - status: `done`
  - `completionEvidence`: not present
  - inspectable evidence exists through `1` comment, `1` attachment, and `1`
    artifact work product
- `GET /api/issues/20daf842-505d-4dc1-8657-e5bbc13c2bd2`
  for [LUC-878](/LUC/issues/LUC-878):
  - status: `done`
  - `completionEvidence`: not present
  - inspectable evidence exists through `1` comment
- `GET /api/issues/47565601-396d-4bbc-a751-41568aeacfa9`
  for [LUC-880](/LUC/issues/LUC-880):
  - status: `done`
  - `completionEvidence`: not present
  - inspectable evidence exists through `1` comment
- `GET /api/issues/9d0bbd9c-2dd6-4005-9873-a45a7f640ae8`
  for [LUC-25](/LUC/issues/LUC-25):
  - status: `blocked`
  - first-class blockers: [LUC-448](/LUC/issues/LUC-448),
    [LUC-494](/LUC/issues/LUC-494)
  - inspectable evidence still exists through `59` comments and `3` documents
- `GET /api/issues/63ae8f22-71bf-4e32-b673-31dbebef4c2f`
  for [LUC-883](/LUC/issues/LUC-883):
  - status: `blocked`
  - blocker attention: `covered`
  - first-class blocker: [LUC-884](/LUC/issues/LUC-884)
  - this owner path already exists, so this review did not create a duplicate
    follow-up lane

Post-repair live API readback during the same heartbeat:

- `GET /api/issues/217e8022-7f99-451b-88bc-541ba5d6128f`
  for [LUC-884](/LUC/issues/LUC-884):
  - status: `done`
  - `completionEvidence`: present
  - closeout summary proves focused regression plus live create/close/read
    verification for the repaired read path
- `GET /api/issues/662046df-df5e-445d-ae49-7a6aadb8828a`
  for [LUC-887](/LUC/issues/LUC-887):
  - status: `done`
  - `completionEvidence`: present
- the [LUC-884](/LUC/issues/LUC-884) closeout comment also records a fresh live
  proof issue, [LUC-889](/LUC/issues/LUC-889), whose `GET /api/issues/:id`
  readback returned a populated `completionEvidence` bundle on the active
  instance
- `GET /api/issues/63ae8f22-71bf-4e32-b673-31dbebef4c2f`
  for [LUC-883](/LUC/issues/LUC-883):
  - status: `in_progress`
  - the owner path auto-resumed after [LUC-884](/LUC/issues/LUC-884) reached
    `done`

Workspace readback:

- `packages/db/src/schema/issues.ts` includes
  `completionEvidence: jsonb("completion_evidence")`
- `server/src/routes/issues.ts` still enforces typed completion-evidence
  validation and passes `completionEvidence` into issue updates
- `server/src/services/issues.ts` includes `completionEvidence` in the issue
  select shape
- `docs/agent-evidence.md`, `docs/agent-policy-gates.md`,
  `docs/api/issues.md`, and `docs/softwarehouse-sdlc.md` now describe the
  typed closeout bundle

Source-control readback:

- the current workspace is still dirty in the exact route/schema/doc/test files
  involved in this contract, including:
  - `packages/db/src/schema/issues.ts`
  - `packages/db/src/migrations/0099_issue_completion_evidence.sql`
  - `packages/shared/src/types/issue.ts`
  - `packages/shared/src/validators/issue.ts`
  - `server/src/routes/issues.ts`
  - `server/src/services/issues.ts`
  - `server/src/__tests__/issue-update-comment-wakeup-routes.test.ts`
  - `docs/agent-evidence.md`
  - `docs/agent-policy-gates.md`
  - `docs/api/issues.md`
  - `docs/softwarehouse-sdlc.md`

## Findings

### 1. The route-level done gate remains healthy in the workspace

Severity: low

The targeted regression still proves that the route rejects bare `done`
transitions and validates typed completion-evidence refs against same-issue
evidence.

### 2. The live API read model is now repaired for fresh done issues

Severity: low

During this heartbeat, the live instance moved from pre-fix null readback on
sampled recent issues to successful populated readback on fresh `done` issues,
including [LUC-884](/LUC/issues/LUC-884), [LUC-887](/LUC/issues/LUC-887), and
the live-proof issue named in the [LUC-884](/LUC/issues/LUC-884) closeout,
[LUC-889](/LUC/issues/LUC-889).

This means the board-visible Definition of Done read path is now proven on the
active instance for fresh post-repair `done` transitions.

### 3. Older sampled done issues still remain null and should not be treated as backfilled

Severity: medium

[LUC-875](/LUC/issues/LUC-875), [LUC-878](/LUC/issues/LUC-878), and
[LUC-880](/LUC/issues/LUC-880) still returned `completionEvidence: null` in
the initial readback sample. The new live proof demonstrates repaired behavior
for fresh done transitions, not a historical backfill of earlier issue rows.

### 4. The source-control lane is still not closed

Severity: medium

The relevant schema, route, service, shared-type, validator, test, and
documentation files are still dirty in the local workspace, and the migration
file `packages/db/src/migrations/0099_issue_completion_evidence.sql` is still
untracked. This review therefore cannot claim that the stronger
`completionEvidence` behavior is actually running on the active Paperclip
instance.

### 5. The follow-up owner path remains visible and active

Severity: low

[LUC-883](/LUC/issues/LUC-883) already routed the live readback gap through an
explicit owner path. During this heartbeat, [LUC-884](/LUC/issues/LUC-884)
reached `done` and [LUC-883](/LUC/issues/LUC-883) auto-resumed to
`in_progress`. This routine did not need to create another duplicate
reconciliation issue.

### 6. The Stage 1 parent remains correctly fail-closed

Severity: low

[LUC-25](/LUC/issues/LUC-25) remains blocked behind
[LUC-448](/LUC/issues/LUC-448) and [LUC-494](/LUC/issues/LUC-494) instead of
drifting into a false-green mission summary.

## Verdict

PASS, with a historical-readback caveat.

The close route still behaves correctly in targeted regression. The live API
initially reproduced the readback gap on several sampled recent issues, but the
same heartbeat then observed the repaired behavior on fresh `done` issues after
[LUC-884](/LUC/issues/LUC-884) landed. The board-facing read model is now
proven on the active instance for fresh post-repair closeouts.

## Required Follow-Up

No new follow-up issue is required from this review heartbeat.

The active owner path is already in place:

- [LUC-883](/LUC/issues/LUC-883) tracks the live/workspace mismatch and is now
  back in `in_progress`
- [LUC-884](/LUC/issues/LUC-884) completed the live done-transition/readback
  repair

The next QA action should focus on whether older pre-repair done issues need
historical backfill or whether the accepted product scope is fresh-transition
correctness only.

## Residual Risk

Fresh done issues now expose canonical `completionEvidence` on live issue
readback, but older sampled done issues from before the repair still do not.
Supervisors should not assume historical rows were backfilled unless a separate
proof lane explicitly demonstrates that migration.
