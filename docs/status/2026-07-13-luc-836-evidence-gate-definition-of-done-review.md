# LUC-836 Evidence Gate and Definition of Done Review

Date: 2026-07-13
Owner: 09 QVE
Process: regression evidence loop

## Scope

Routine audit of whether the current Stage 1 Paperclip Softwarehouse evidence
gate and definition-of-done path is still healthy for active and completed
Soar/Roost work.

This review checks:

- whether the active policy and API docs still describe the shipped close gate
  honestly;
- whether the current route still enforces that minimum;
- whether recent Soar/Roost issue records still expose inspectable evidence in
  Paperclip itself; and
- whether the Stage 1 parent still stays fail-closed when unresolved blocker
  chains remain.

## Evidence Reviewed

Policy and gate docs:

- `docs/softwarehouse/05-definition-of-done.md`
- `docs/softwarehouse/06-quality-gates.md`
- `docs/softwarehouse/12-app-completion-review.md`
- `docs/agent-policy-gates.md`
- `docs/agent-evidence.md`
- `docs/softwarehouse-sdlc.md`
- `docs/api/issues.md`
- `doc/AGENT-ARTIFACTS.md`

Implementation and regression proof:

- `server/src/routes/issues.ts`
- `server/src/__tests__/issue-update-comment-wakeup-routes.test.ts`

Sampled live issue records:

- [LUC-25](/LUC/issues/LUC-25)
- [LUC-821](/LUC/issues/LUC-821)
- [LUC-822](/LUC/issues/LUC-822)
- [LUC-835](/LUC/issues/LUC-835)

Prior same-routine reports used for drift comparison:

- `docs/status/2026-07-13-luc-831-evidence-gate-definition-of-done-review.md`
- `docs/status/2026-07-12-luc-824-evidence-gate-definition-of-done-review.md`

## Verification

Targeted route regression executed on 2026-07-13:

- `pnpm exec vitest run server/src/__tests__/issue-update-comment-wakeup-routes.test.ts`
  - result: `6 passed`
  - warning: `failed to log successful run handoff resolution` because the
    mocked `db` in that harness does not implement `select`; the warning did
    not fail the close-gate assertions under review
  - proves:
  - bare `done` without completion evidence returns `422`
  - `done` with a completion comment succeeds
  - `done` with artifact-backed evidence succeeds without a duplicate close
    comment

Implementation and doc readback:

- `server/src/routes/issues.ts` still uses `hasIssueDoneEvidence()` in the
  agent-owned `done` path.
- `docs/api/issues.md`, `docs/agent-policy-gates.md`,
  `docs/agent-evidence.md`, and `docs/softwarehouse-sdlc.md` still describe
  the same minimum honestly: inspectable completion evidence must exist, but
  typed bundle categories are not yet product-enforced.

Working tree readback for this repo:

- `git status --short`
  - result: existing unrelated modifications remained in
    `.agents/state/project-journal.md` and
    `softwarehouse/portfolio/APPLICATIONS_INDEX.md`, plus untracked prior
    review artifacts:
    - `docs/status/2026-07-13-luc-827-evidence-gate-definition-of-done-review.md`
    - `docs/status/2026-07-13-luc-830-portfolio-truth-and-workspace-boundary-review.md`
    - `docs/status/2026-07-13-luc-831-evidence-gate-definition-of-done-review.md`
    - `docs/status/2026-07-13-luc-834-evidence-gate-definition-of-done-review.md`
    - `softwarehouse/reports/2026-07-13-luc-829-secrets-coolify-vps-readiness-review.md`
  - this QA routine did not normalize or revert those pre-existing changes

## Live Readback

- [LUC-821](/LUC/issues/LUC-821) is `done` as of
  `2026-07-12T23:52:03.262Z` and now has restored Paperclip-visible evidence:
  `2` attachments and `2` artifact work products after the follow-up repair in
  [LUC-835](/LUC/issues/LUC-835). This closes the prior review gap where the
  evidence existed only in repo-side paths and comment text.
- [LUC-822](/LUC/issues/LUC-822) is `done` as of
  `2026-07-12T21:10:33.902Z` and still exposes inspectable closure evidence in
  Paperclip: `1` markdown attachment plus a structured `## Update` closeout
  comment with repo path, verification commands, and residual risk.
- [LUC-835](/LUC/issues/LUC-835) is `done` as of
  `2026-07-12T23:51:52.612Z` and provides explicit repair evidence that the
  Softwarehouse can detect a visibility gap and repair it through the official
  attachment/work-product path without mutating repo code.
- [LUC-25](/LUC/issues/LUC-25) remains `blocked` with first-class blockers
  [LUC-448](/LUC/issues/LUC-448), [LUC-387](/LUC/issues/LUC-387), and
  [LUC-494](/LUC/issues/LUC-494). The unresolved terminal blocker chains still
  run through [LUC-507](/LUC/issues/LUC-507) and
  [LUC-496](/LUC/issues/LUC-496), so the Stage 1 parent still stays
  fail-closed instead of claiming completed delivery.

## Gate Evaluation

- Test evidence: implemented and verified by the targeted route regression and
  the sampled closure packets.
- Review evidence: implemented and verified by this review artifact plus the
  repair/readback chain across [LUC-821](/LUC/issues/LUC-821) and
  [LUC-835](/LUC/issues/LUC-835).
- Documentation evidence: implemented and verified. Current DoD/gate/API docs
  still match the shipped minimum close gate.
- Security evidence: present as an operating requirement and reflected in the
  fail-closed posture of [LUC-25](/LUC/issues/LUC-25); this review did not
  find a false green claim bypassing current protected-gate expectations.
- Deploy evidence: still governed as part of the stronger operating bundle, not
  a typed route-level requirement; no new drift was found in that contract.
- Monitoring evidence: still part of the stronger operating bundle rather than
  the route minimum. The Stage 1 parent remains blocked, which is the correct
  current signal.

## Findings

### 1. The shipped close-gate contract is still honest and stable

Severity: medium

The docs and route still agree on the core product truth: Paperclip prevents
bare `done` transitions with no inspectable evidence, but it does not yet
validate typed evidence categories. That keeps the contract understandable and
prevents false claims about stronger enforcement than the product actually has.

### 2. The previously observed LUC-821 artifact-visibility gap is now repaired

Severity: low

The new live signal in this review window is not a regression but a repair.
[LUC-835](/LUC/issues/LUC-835) restored Paperclip-visible evidence for
[LUC-821](/LUC/issues/LUC-821) by attaching the existing markdown packets and
creating artifact work products. That means this routine is not only detecting
gaps; the owner path is also closing them through the intended artifact
workflow.

### 3. The remaining product gap is still typed bundle validation, not evidence existence

Severity: medium

The route still accepts any one of:

- a completion comment in the same update;
- an issue document;
- an attachment; or
- a work product.

It still does not prove that normal work carries `TEST`/`REVIEW`/`DOCS`, or
that higher-risk work carries applicable
`SECURITY`/`DEPLOY`/`MONITORING`, before agent-owned `done`.

### 4. The Stage 1 parent still remains appropriately fail-closed

Severity: low

[LUC-25](/LUC/issues/LUC-25) is still blocked behind real first-class blocker
chains instead of drifting to a false green mission summary. That is the
correct current health signal for this routine.

## Verdict

PASS.

The current evidence-gate and Definition of Done path remains healthy for this
review window. The docs still describe the shipped minimum honestly, the
targeted close-gate regression still passes, recent Soar/Roost closure samples
still expose inspectable evidence in Paperclip, the earlier LUC-821 artifact
gap is now repaired, and the Stage 1 parent still stays fail-closed behind
real blockers.

## Residual Risk

Paperclip still does not enforce typed closure bundles for `TEST`, `REVIEW`,
`DOCS`, `SECURITY`, `DEPLOY`, and `MONITORING`. Current quality therefore still
depends on disciplined issue authors and reviewers, not only on route-level
validation.
