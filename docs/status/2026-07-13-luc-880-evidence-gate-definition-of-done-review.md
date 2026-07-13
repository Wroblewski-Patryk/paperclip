# LUC-880 Evidence Gate and Definition of Done Review

Date: 2026-07-13
Issue: [LUC-880](/LUC/issues/LUC-880)
Owner: 09 QVE
Process: regression evidence loop

## Scope

Routine audit of whether the current Stage 1 Paperclip Softwarehouse
evidence-gate and definition-of-done path remains healthy for active and
completed Soar/Roost work.

This review checks:

- whether the active route still enforces the minimum close gate;
- whether the targeted regression proof remains green;
- whether recent Soar/Roost closure lanes still expose inspectable evidence in
  Paperclip itself; and
- whether the Stage 1 parent remains fail-closed behind real blocker chains.

## Evidence Reviewed

Policy and gate docs:

- `docs/softwarehouse/05-definition-of-done.md`
- `docs/softwarehouse/06-quality-gates.md`
- `docs/agent-policy-gates.md`
- `docs/api/issues.md`
- `docs/softwarehouse-sdlc.md`
- `doc/AGENT-ARTIFACTS.md`

Implementation and regression proof:

- `server/src/routes/issues.ts`
- `server/src/__tests__/issue-update-comment-wakeup-routes.test.ts`

Sampled live issue records:

- [LUC-855](/LUC/issues/LUC-855)
- [LUC-856](/LUC/issues/LUC-856)
- [LUC-857](/LUC/issues/LUC-857)
- [LUC-25](/LUC/issues/LUC-25)

Related same-day review reports used for drift comparison:

- `docs/status/2026-07-13-luc-872-evidence-gate-definition-of-done-review.md`
- `docs/status/2026-07-13-luc-875-evidence-gate-definition-of-done-review.md`

## Verification

Targeted route regression executed on 2026-07-13:

- `pnpm exec vitest run server/src/__tests__/issue-update-comment-wakeup-routes.test.ts`
  - result: `7 passed`
  - warning: `failed to log successful run handoff resolution` because the
    mocked `db` in that harness still does not implement `select`; the warning
    did not fail the close-gate assertions under review
  - proves:
  - bare `done` without completion evidence returns `422`
  - `done` with a completion comment plus typed bundle succeeds
  - artifact-backed typed refs succeed
  - typed refs to missing issue evidence are rejected

Implementation and doc readback:

- `server/src/routes/issues.ts` still rejects `done` transitions unless
  `completionEvidence` is present and valid against same-issue evidence
  inventory.
- `docs/agent-policy-gates.md`, `docs/api/issues.md`, and
  `docs/softwarehouse-sdlc.md` currently describe the typed
  `completionEvidence` contract in this workspace snapshot.
- The repo worktree is currently dirty from other active lanes, including those
  docs and route files, so this review does not treat that alignment as
  source-control-closed truth.

## Live Readback

- [LUC-855](/LUC/issues/LUC-855) is `done` as of
  `2026-07-13T03:22:39.816Z` and currently exposes inspectable closure
  evidence through `1` issue comment, `0` attachments, `0` documents, and `0`
  work products.
- [LUC-856](/LUC/issues/LUC-856) is `done` as of
  `2026-07-13T03:20:49.470Z` and currently exposes inspectable closure
  evidence through `1` issue comment, `0` attachments, `0` documents, and `0`
  work products.
- [LUC-857](/LUC/issues/LUC-857) is `done` as of
  `2026-07-13T03:48:51.573Z` and currently exposes inspectable closure
  evidence through `1` issue comment, `0` attachments, `0` documents, and `0`
  work products.
- [LUC-25](/LUC/issues/LUC-25) remains `blocked` with first-class blockers
  [LUC-448](/LUC/issues/LUC-448) and [LUC-494](/LUC/issues/LUC-494). It still
  exposes `59` comments, `3` documents, and `0` attachments while remaining
  fail-closed instead of claiming completed delivery.

## Gate Evaluation

- Test evidence: implemented and verified by the targeted route regression and
  the sampled closure records.
- Review evidence: implemented and verified by this review artifact plus the
  live readback across [LUC-855](/LUC/issues/LUC-855),
  [LUC-856](/LUC/issues/LUC-856), [LUC-857](/LUC/issues/LUC-857), and
  [LUC-25](/LUC/issues/LUC-25).
- Documentation evidence: partially verified. The typed docs alignment is
  visible in the current workspace, but this run did not prove source-control
  closure for those edits.
- Security evidence: present as an operating requirement and reflected in the
  fail-closed posture of [LUC-25](/LUC/issues/LUC-25); this review did not
  find a false-green claim bypassing current protected-gate expectations.
- Deploy evidence: still governed as part of the stronger operating bundle,
  while the route-level close gate remains issue-evidence focused.
- Monitoring evidence: still part of the stronger operating bundle rather than
  the route minimum. The Stage 1 parent remains blocked, which is the correct
  current signal.

## Findings

### 1. The typed completion-evidence route remains healthy

Severity: low

The close route and targeted regression still enforce the typed
`completionEvidence` contract, including same-issue reference validation.

### 2. Documentation alignment is present at workspace level

Severity: low

`docs/agent-policy-gates.md`, `docs/api/issues.md`, and
`docs/softwarehouse-sdlc.md` currently describe the stronger typed bundle
contract in the working tree, so the earlier route-vs-doc drift is not present
at workspace-readback level.

### 3. Documentation alignment is not yet proven as source-control truth

Severity: medium

The aligned docs and related route/test files are part of a dirty worktree with
other active lanes. This QA run therefore classifies the alignment as
`implemented but not verified` at source-control-closure level rather than
claiming durable repo closure.

### 4. Recent closure samples remain inspectable, but are still comment-backed

Severity: low

[LUC-855](/LUC/issues/LUC-855), [LUC-856](/LUC/issues/LUC-856), and
[LUC-857](/LUC/issues/LUC-857) remain auditable in Paperclip itself, but in
this sample window the evidence is still the closeout comment only. The current
route accepts that, so this is not a product failure. It does keep closure
quality dependent on precise closeout writing.

### 5. The Stage 1 parent remains appropriately fail-closed

Severity: low

[LUC-25](/LUC/issues/LUC-25) is still blocked behind real first-class blocker
chains instead of drifting to a false-green mission summary.

## Verdict

PASS with residual source-control-closure risk.

The current evidence-gate and definition-of-done path remains healthy for this
review window. The route and targeted tests still enforce typed completion
evidence, sampled closure lanes still expose inspectable issue evidence in
Paperclip, and the Stage 1 parent still stays fail-closed behind real blockers.

The remaining nuance is not route-vs-doc semantic drift. The current risk is
that the aligned docs and route changes are still part of a dirty working tree,
so this QA run does not treat them as durable source-control truth yet.

## Residual Risk

If the current working-tree alignment is lost, superseded, or incompletely
closed by the owning implementation lane, future agents may reintroduce stale
documentation expectations or continue to rely on comment-only closeout
evidence instead of richer issue artifacts.
