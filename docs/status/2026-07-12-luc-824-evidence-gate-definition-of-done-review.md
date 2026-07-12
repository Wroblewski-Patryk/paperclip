# LUC-824 Evidence Gate and Definition of Done Review

Date: 2026-07-12
Owner: 09 QVE
Process: regression evidence loop

## Scope

Routine audit of whether the current Stage 1 Paperclip Softwarehouse evidence
gate and definition-of-done path is still healthy for active and completed
Soar/Roost work.

This review checks three things:

- whether the active policy docs still describe the shipped gate honestly;
- whether the current issue close route still enforces the documented minimum;
  and
- whether sampled Stage 1 issues still expose inspectable evidence instead of
  overclaiming readiness.

## Evidence Reviewed

Policy and gate docs:

- `docs/softwarehouse/05-definition-of-done.md`
- `docs/softwarehouse/06-quality-gates.md`
- `docs/softwarehouse/local-first-shippable-gate-bundle.md`
- `docs/agent-policy-gates.md`
- `docs/agent-evidence.md`
- `docs/softwarehouse-sdlc.md`
- `docs/api/issues.md`

Implementation and targeted regression proof:

- `server/src/routes/issues.ts`
- `server/src/__tests__/issue-update-comment-wakeup-routes.test.ts`

Sampled issue records:

- [LUC-25](/LUC/issues/LUC-25)
- [LUC-387](/LUC/issues/LUC-387)
- [LUC-625](/LUC/issues/LUC-625)
- [LUC-640](/LUC/issues/LUC-640)
- [LUC-823](/LUC/issues/LUC-823)

## Verification

Targeted route test executed on 2026-07-12:

- `pnpm exec vitest run server/src/__tests__/issue-update-comment-wakeup-routes.test.ts`
  - result: `6 passed`
  - warning: `failed to log successful run handoff resolution` because the
    mocked `db` in that harness does not implement `select`; the warning did
    not fail the close-gate assertions under review
  - proves:
  - bare `done` without evidence returns `422`
  - `done` with a completion comment succeeds
  - `done` with artifact-backed evidence succeeds without a duplicate close
    comment

Working tree readback for this repo:

- `git status --short`
  - result: existing unrelated modifications in
    `scripts/run-next-legal-action-selector.mjs`,
    `scripts/softwarehouse-gate-specs.test.mjs`, plus an untracked prior review
    artifact `docs/status/2026-07-12-luc-823-evidence-gate-definition-of-done-review.md`
  - this QA routine did not modify or normalize those pre-existing changes

Implementation readback:

- `server/src/routes/issues.ts` still uses `hasIssueDoneEvidence()` as the
  minimum close-gate existence check.
- `docs/api/issues.md`, `docs/agent-policy-gates.md`,
  `docs/agent-evidence.md`, and `docs/softwarehouse-sdlc.md` all now describe
  that minimum honestly: the route hard-requires inspectable completion
  evidence existence, while typed `TEST`/`REVIEW`/`DOCS` and applicable
  `SECURITY`/`DEPLOY`/`MONITORING` remain the stronger operating requirement.

## Live Readback

- [LUC-25](/LUC/issues/LUC-25) is still `blocked` as of
  `2026-07-12T00:18:26.390Z`, with first-class blockers
  [LUC-448](/LUC/issues/LUC-448), [LUC-387](/LUC/issues/LUC-387), and
  [LUC-494](/LUC/issues/LUC-494). The parent is still fail-closed rather than
  claiming Stage 1 completion.
- [LUC-387](/LUC/issues/LUC-387) is still `done` as of
  `2026-07-12T14:40:04.535Z` and still has `3` attachments, matching an
  inspectable closure packet rather than prose-only completion.
- [LUC-625](/LUC/issues/LUC-625) is still `done` as of
  `2026-07-12T04:19:46.041Z`; its latest closure comment still begins with
  `## Done` and records the Roost repo path plus source-control classification.
- [LUC-640](/LUC/issues/LUC-640) is still `done` as of
  `2026-07-12T04:49:11.853Z`; its latest closure comment still begins with
  `## Done` and records that the closure packet covered
  [LUC-631](/LUC/issues/LUC-631) through [LUC-637](/LUC/issues/LUC-637).
- [LUC-823](/LUC/issues/LUC-823) already documented the current product gap:
  the route enforces inspectable evidence existence, not typed bundle-category
  validation.

## Gate Evaluation

- Test evidence: implemented and verified by the targeted close-gate route test
  and by the sampled completion lanes.
- Review evidence: implemented and verified by this review artifact plus the
  sampled closure comments and attachments on
  [LUC-387](/LUC/issues/LUC-387), [LUC-625](/LUC/issues/LUC-625), and
  [LUC-640](/LUC/issues/LUC-640).
- Documentation evidence: implemented and verified. The active DoD/gate docs,
  agent-policy docs, and API docs now describe the shipped minimum close gate
  consistently.
- Security evidence: present as an operating requirement and reflected in the
  fail-closed posture of [LUC-25](/LUC/issues/LUC-25); this review did not find
  a false green claim that bypassed current protected-gate expectations.
- Deploy evidence: present where required in the sampled records, while the
  Stage 1 parent remains blocked instead of overstating deploy completeness.
- Monitoring/rollback evidence: still not globally green for Stage 1 parent
  completion, which is correct because [LUC-25](/LUC/issues/LUC-25) remains
  blocked.

## Findings

### 1. The documentation set is currently honest about the shipped close gate

Severity: medium

The earlier same-day drift has been corrected. The active Softwarehouse policy
docs now distinguish between:

- the API hard minimum for `done`; and
- the stronger typed evidence bundle expected by process and review discipline.

That means the current contract is understandable to both implementers and
reviewers.

### 2. The shipped gate still proves evidence existence, not evidence categories

Severity: medium

The route still enforces a real minimum, but it is still an existence gate.
The product does not yet validate whether a closure carries typed
`TEST`/`REVIEW`/`DOCS` evidence, or the applicable
`SECURITY`/`DEPLOY`/`MONITORING` bundle for higher-risk work.

This remains a product gap, but it is no longer a hidden or misstated one.

### 3. Sampled Stage 1 issue quality remains inspectable and fail-closed where it matters

Severity: low

The sampled closures still expose concrete evidence:

- [LUC-387](/LUC/issues/LUC-387) keeps attachment-backed proof.
- [LUC-625](/LUC/issues/LUC-625) and [LUC-640](/LUC/issues/LUC-640) keep
  structured `## Done` closure comments with repo-aware evidence.
- [LUC-25](/LUC/issues/LUC-25) stays blocked behind first-class blockers rather
  than presenting unresolved Stage 1 work as done.

That is the key health signal for this routine.

## Verdict

PASS.

The current evidence-gate and Definition of Done path is healthy for this
review window. The docs are aligned with the shipped minimum close gate, the
targeted route test still passes, sampled Stage 1 completion lanes expose
inspectable evidence, and the parent Stage 1 delivery issue remains fail-closed
behind real blockers.

## Residual Risk

The remaining product gap is still important: Paperclip does not yet enforce
typed closure bundles for `TEST`, `REVIEW`, `DOCS`, `SECURITY`, `DEPLOY`, and
`MONITORING`. Current quality therefore still depends on disciplined issue
authors and reviewers, not only on route-level validation.

This routine also does not claim Paperclip operating-repo source-control
closure. The repo already contained unrelated dirty files before this review,
and this issue intentionally left them untouched.
