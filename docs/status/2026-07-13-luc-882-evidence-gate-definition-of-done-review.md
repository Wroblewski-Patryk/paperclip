# LUC-882 Evidence Gate and Definition of Done Review

Date: 2026-07-13
Issue: [LUC-882](/LUC/issues/LUC-882)
Owner: 09 QVE
Mode: Review

## Scope

Routine audit of whether the current Stage 1 Paperclip Softwarehouse
evidence-gate and definition-of-done path remains healthy for active and
completed Soar/Roost work.

This review focused on the current mismatch between:

- workspace code/docs that now describe and implement typed
  `completionEvidence`; and
- the live Paperclip API read model on `http://127.0.0.1:3200`, which still
  does not expose `completionEvidence` on fresh `done` issues.

## Evidence Reviewed

Policy and contract docs:

- `docs/agent-evidence.md`
- `docs/agent-policy-gates.md`
- `docs/api/issues.md`
- `docs/softwarehouse-sdlc.md`

Implementation readback:

- `packages/db/src/schema/issues.ts`
- `server/src/routes/issues.ts`
- `server/src/services/issues.ts`

Live issue/API readback:

- [LUC-25](/LUC/issues/LUC-25)
- [LUC-855](/LUC/issues/LUC-855)
- [LUC-875](/LUC/issues/LUC-875)
- [LUC-878](/LUC/issues/LUC-878)
- [LUC-880](/LUC/issues/LUC-880)

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
  - invalid/missing typed refs are rejected

Live API readback on 2026-07-13:

- `GET /api/issues/5ec592b6-6301-46af-8135-30866abcdfc2`
  for [LUC-855](/LUC/issues/LUC-855):
  - status: `done`
  - `completionEvidence`: not present
  - inspectable evidence still exists through `1` comment, `1` document, and
    `1` attachment
- `GET /api/issues/29a0e9ff-38d7-4232-8bfe-8cf7457865ae`
  for [LUC-875](/LUC/issues/LUC-875):
  - status: `done`
  - `completionEvidence`: not present
  - inspectable evidence exists through `1` comment and `1` artifact work
    product
- `GET /api/issues/20daf842-505d-4dc1-8657-e5bbc13c2bd2`
  for [LUC-878](/LUC/issues/LUC-878):
  - status: `done`
  - `completionEvidence`: not present
- `GET /api/issues/47565601-396d-4bbc-a751-41568aeacfa9`
  for [LUC-880](/LUC/issues/LUC-880):
  - status: `done`
  - `completionEvidence`: not present
- `GET /api/issues/9d0bbd9c-2dd6-4005-9873-a45a7f640ae8`
  for [LUC-25](/LUC/issues/LUC-25):
  - status: `blocked`
  - first-class blockers: [LUC-448](/LUC/issues/LUC-448),
    [LUC-494](/LUC/issues/LUC-494)
  - inspectable evidence still exists through `59` comments, `3` documents,
    and `1` attachment

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
  - `server/src/routes/issues.ts`
  - `server/src/services/issues.ts`
  - `server/src/__tests__/issue-update-comment-wakeup-routes.test.ts`
  - `docs/agent-evidence.md`
  - `docs/agent-policy-gates.md`
  - `docs/api/issues.md`
  - `docs/softwarehouse-sdlc.md`

## Findings

### 1. The route-level gate is still healthy in the workspace

Severity: low

The targeted regression still proves that the route rejects bare `done`
transitions and validates typed completion-evidence refs against same-issue
evidence.

### 2. The live API read model is still missing `completionEvidence`

Severity: high

Fresh `done` issues on the running instance still return no
`completionEvidence` object on `GET /api/issues/:id`, including
[LUC-875](/LUC/issues/LUC-875), [LUC-878](/LUC/issues/LUC-878), and
[LUC-880](/LUC/issues/LUC-880).

This means the board-visible Definition of Done read path is still weaker than
the current workspace contract, even though the code and docs now describe the
stronger behavior.

### 3. The most likely current risk is runtime/source-control mismatch, not just doc drift

Severity: medium

The relevant schema, route, service, test, and documentation files are all
dirty in the local workspace, and the migration file
`packages/db/src/migrations/0099_issue_completion_evidence.sql` is still
untracked. This review therefore cannot claim that the stronger
`completionEvidence` behavior is actually running on the active Paperclip
instance.

### 4. The Stage 1 parent remains correctly fail-closed

Severity: low

[LUC-25](/LUC/issues/LUC-25) remains blocked behind
[LUC-448](/LUC/issues/LUC-448) and [LUC-494](/LUC/issues/LUC-494) instead of
drifting into a false-green mission summary.

## Verdict

PASS for route enforcement, FAIL for live Definition-of-Done readback proof.

The close route still behaves correctly in targeted regression, and sampled
Soar/Roost work remains inspectable through comments, documents, attachments,
and work products. But the running Paperclip API still does not expose
`completionEvidence` on fresh `done` issues, so the board-facing read model is
not yet proven on the active instance.

## Required Follow-Up

Create one narrow implementation/reliability lane to reconcile the live
Paperclip runtime with the workspace contract:

- determine whether the gap is caused by unapplied migration, stale runtime,
  incomplete persistence/readback, or a partial local implementation;
- restore live `GET /api/issues/:id` readback so recent `done` issues expose
  typed `completionEvidence`; and
- leave deploy/runtime proof showing the running instance now matches the
  shipped route and docs.

## Residual Risk

Until the running instance exposes `completionEvidence` on issue readback,
supervisors and board users still have to reconstruct Definition-of-Done proof
from comments, artifacts, and work products instead of one canonical issue
field.
