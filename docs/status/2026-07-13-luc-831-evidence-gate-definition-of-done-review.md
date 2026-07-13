# LUC-831 Evidence Gate and Definition of Done Review

Date: 2026-07-13
Owner: 09 QVE
Process: regression evidence loop

## Scope

Routine audit of whether the current Stage 1 Paperclip Softwarehouse evidence
gate and definition-of-done path is still healthy for active and completed
Soar/Roost work.

This review checks:

- whether the active policy docs still describe the shipped close gate honestly;
- whether the current route still enforces that minimum;
- whether recent Soar/Roost issue records still expose inspectable evidence; and
- whether the Stage 1 parent still stays fail-closed when required evidence or
  blockers remain open.

## Evidence Reviewed

Policy and gate docs:

- `docs/softwarehouse/05-definition-of-done.md`
- `docs/softwarehouse/06-quality-gates.md`
- `docs/agent-policy-gates.md`
- `docs/agent-evidence.md`
- `docs/softwarehouse-sdlc.md`
- `docs/api/issues.md`

Implementation and regression proof:

- `server/src/routes/issues.ts`
- `server/src/__tests__/issue-update-comment-wakeup-routes.test.ts`

Sampled live issue records:

- [LUC-821](/LUC/issues/LUC-821)
- [LUC-822](/LUC/issues/LUC-822)
- [LUC-25](/LUC/issues/LUC-25)
- [LUC-824](/LUC/issues/LUC-824)

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

Implementation readback:

- `server/src/routes/issues.ts` still blocks bare `done` transitions unless the
  route sees a completion comment or pre-existing issue evidence.
- The active minimum remains inspectable-evidence existence, not typed bundle
  validation.
- `docs/agent-policy-gates.md`, `docs/agent-evidence.md`,
  `docs/softwarehouse-sdlc.md`, and `docs/api/issues.md` still describe that
  split honestly.

Working tree readback:

- `git status --short`
  - result: existing unrelated modifications remained in
    `.agents/state/project-journal.md` and
    `softwarehouse/portfolio/APPLICATIONS_INDEX.md`, plus untracked prior
    review artifacts `docs/status/2026-07-13-luc-827-evidence-gate-definition-of-done-review.md`,
    `docs/status/2026-07-13-luc-830-portfolio-truth-and-workspace-boundary-review.md`,
    and `softwarehouse/reports/2026-07-13-luc-829-secrets-coolify-vps-readiness-review.md`
  - this QA routine did not normalize or revert those pre-existing changes

## Live Readback

- [LUC-821](/LUC/issues/LUC-821) is `done` as of
  `2026-07-12T21:13:08.732Z` and still exposes inspectable closure evidence:
  `5` comments and a structured `## Done` closeout comment naming the committed
  packet and targeted validation.
- [LUC-822](/LUC/issues/LUC-822) is `done` as of
  `2026-07-12T21:10:33.902Z` and still exposes inspectable closure evidence:
  `1` comment and `1` markdown attachment work packet.
- [LUC-25](/LUC/issues/LUC-25) is still `blocked` as of
  `2026-07-12T00:18:26.390Z`, with `58` comments and three first-class blocker
  relations in heartbeat context:
  [LUC-448](/LUC/issues/LUC-448), [LUC-387](/LUC/issues/LUC-387), and
  [LUC-494](/LUC/issues/LUC-494). Two blocker chains remain unresolved through
  [LUC-507](/LUC/issues/LUC-507) and [LUC-496](/LUC/issues/LUC-496), so the
  parent still stays fail-closed.
- [LUC-824](/LUC/issues/LUC-824) already documents the same current product
  gap: the route enforces inspectable evidence existence, not typed bundle
  categories.

## Gate Evaluation

- Test evidence: implemented and verified by the targeted route regression and
  the sampled closure records.
- Review evidence: implemented and verified by this review artifact plus the
  prior review packet in [LUC-824](/LUC/issues/LUC-824).
- Documentation evidence: implemented and verified. Current policy and API docs
  still match the shipped minimum route behavior.
- Security evidence: present as an operating requirement and reflected in the
  fail-closed posture of [LUC-25](/LUC/issues/LUC-25); this review did not find
  a false green claim that bypassed current protected-gate expectations.
- Deploy evidence: still governed as a higher-risk operating requirement rather
  than a typed product gate; this review did not find a new drift in that
  contract.
- Monitoring evidence: still part of the stronger operating bundle, not a hard
  route-level requirement. The Stage 1 parent correctly remains blocked rather
  than claiming bundle-complete readiness.

## Findings

### 1. The close-gate contract is still honest and stable

Severity: medium

The current docs and the shipped route still agree on the key point: Paperclip
prevents bare `done` transitions with no inspectable evidence, but it does not
yet enforce typed evidence categories. That keeps the contract honest for both
agents and reviewers.

### 2. The product gap remains the same: evidence existence is enforced, bundle categories are not

Severity: medium

The route still validates evidence existence through:

- a completion comment in the same update;
- an issue document;
- an attachment; or
- a work product.

It still does not prove that normal work carries `TEST`/`REVIEW`/`DOCS`, or
that applicable higher-risk work carries
`SECURITY`/`DEPLOY`/`MONITORING`, before agent-owned `done`.

### 3. Recent Soar/Roost closure samples remain inspectable and the mission parent remains fail-closed

Severity: low

The sampled Soar/Roost issues still show concrete inspectable evidence instead
of empty completion claims, while the Stage 1 parent still remains blocked
behind real blocker chains. That is the correct current health signal for this
routine.

## Verdict

PASS.

The current evidence-gate and Definition of Done path remains healthy for this
review window. The docs still describe the shipped minimum honestly, the
targeted close-gate regression still passes, sampled Soar/Roost completion
lanes still expose inspectable evidence, and the parent Stage 1 delivery issue
still stays fail-closed behind real blockers.

## Residual Risk

Paperclip still does not enforce typed closure bundles for `TEST`, `REVIEW`,
`DOCS`, `SECURITY`, `DEPLOY`, and `MONITORING`. Current quality therefore still
depends on disciplined issue authors and reviewers, not only on route-level
validation.
