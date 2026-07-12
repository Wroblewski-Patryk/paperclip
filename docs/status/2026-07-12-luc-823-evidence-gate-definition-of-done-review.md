# LUC-823 Evidence Gate and Definition of Done Review

Date: 2026-07-12
Owner: 09 QVE

## Scope

Review whether the current Paperclip Softwarehouse evidence gate and
definition-of-done contract for Soar/Roost work is:

- documented consistently;
- enforced by the current server implementation; and
- reflected in recent issue closure records.

This review follows the earlier same-day reports in
`LUC-815` and `LUC-819`. The key question now is whether the documentation
drift identified there has been corrected, and what product gap still remains.

## Evidence Checked

Policy and operating docs:

- `docs/agent-policy-gates.md`
- `docs/agent-evidence.md`
- `docs/softwarehouse-sdlc.md`
- `docs/softwarehouse/05-definition-of-done.md`
- `docs/softwarehouse/06-quality-gates.md`
- `docs/api/issues.md`

Implementation and tests:

- `server/src/routes/issues.ts`
- `server/src/__tests__/issue-update-comment-wakeup-routes.test.ts`

Live issue samples:

- [LUC-183](/LUC/issues/LUC-183)
- [LUC-264](/LUC/issues/LUC-264)
- [LUC-629](/LUC/issues/LUC-629)
- [LUC-815](/LUC/issues/LUC-815)
- [LUC-819](/LUC/issues/LUC-819)

## Verification

Code-path inspection:

- `server/src/routes/issues.ts` still uses `hasIssueDoneEvidence()` as an
  existence check.
- `PATCH /api/issues/{id}` still rejects only bare `done` transitions with no
  completion comment and no linked document, attachment, or work product.
- The route still does not validate typed evidence categories such as `TEST`,
  `REVIEW`, `DOCS`, `SECURITY`, `DEPLOY`, or `MONITORING`.

Targeted test executed on 2026-07-12:

- `pnpm exec vitest run server/src/__tests__/issue-update-comment-wakeup-routes.test.ts`
  - result: `6 passed`
  - warning during harness execution: `failed to log successful run handoff resolution`
    because the mocked `db` in that test path does not implement `select`; this
    did not fail the close-gate assertions under review
  - proves:
  - bare `done` without evidence returns `422`
  - `done` with a completion comment succeeds
  - `done` with artifact-backed evidence succeeds without a duplicate close comment

Live sample evidence:

- [LUC-183](/LUC/issues/LUC-183): strong high-risk evidence packet with two
  rollback/monitoring documents and a disciplined closure comment naming deploy,
  smoke, monitoring, rollback, and security posture.
- [LUC-264](/LUC/issues/LUC-264): attachment-backed protected-input readiness
  evidence plus comments; inspectable, but not normalized into typed bundle
  categories.
- [LUC-629](/LUC/issues/LUC-629): comment-only closure record with detailed
  commands, outputs, and follow-up lanes; valid under the current API gate.
- [LUC-815](/LUC/issues/LUC-815) and [LUC-819](/LUC/issues/LUC-819): earlier
  review artifacts showing the same implementation gap and documenting the
  previous docs drift.

## Findings

### 1. Documentation is now aligned with the shipped API minimum

Severity: medium

The strongest drift called out in [LUC-819](/LUC/issues/LUC-819) is now
resolved in the docs. Current Softwarehouse policy documents explicitly state
that:

- the API hard gate requires only inspectable completion evidence existence; and
- the stronger `TEST`/`REVIEW`/`DOCS` plus applicable
  `SECURITY`/`DEPLOY`/`MONITORING` bundle remains an operating and review
  requirement, not yet a product-enforced bundle.

That is materially more accurate than the earlier same-day policy wording.

Evidence:

- `docs/agent-policy-gates.md`
- `docs/agent-evidence.md`
- `docs/softwarehouse-sdlc.md`
- `docs/api/issues.md`

### 2. Product enforcement is still existence-based, not category-based

Severity: high

The implementation has not changed in the way that matters for typed closure
proof. The close gate still passes as soon as any one of the following exists:

- a completion comment in the same update;
- any issue document;
- any attachment; or
- any work product.

This means the product still cannot prove that normal work carries
`TEST`/`REVIEW`/`DOCS`, or that high-risk work carries
`SECURITY`/`DEPLOY`/`MONITORING`, before agent-owned `done`.

Evidence:

- `server/src/routes/issues.ts`
- `server/src/__tests__/issue-update-comment-wakeup-routes.test.ts`

### 3. Recent issue quality is inspectable but still inconsistent at the bundle level

Severity: medium

The sampled issues are generally readable and useful, but the structure still
varies by author and lane:

- [LUC-183](/LUC/issues/LUC-183) is close to the intended high-risk bundle.
- [LUC-264](/LUC/issues/LUC-264) uses attachment-backed evidence and strong
  comments, but the categories are inferred by a human reviewer.
- [LUC-629](/LUC/issues/LUC-629) closes from comment-only evidence, which is
  acceptable to the API even though no normalized document/work-product bundle
  exists.

This is adequate for manual review, but still weak for dashboard-visible,
system-readable completion claims.

Evidence:

- [LUC-183](/LUC/issues/LUC-183)
- [LUC-264](/LUC/issues/LUC-264)
- [LUC-629](/LUC/issues/LUC-629)

### 4. The current problem is no longer "docs lie"; it is "discipline exceeds product enforcement"

Severity: medium

After the doc updates, the main risk has shifted. The documentation now
describes the split correctly. The remaining gap is that supervisors and
specialists may behave as if the stronger bundle is product-enforced when it is
still only a process expectation.

That distinction matters for audits, release confidence, and any future mission
control summary that wants to claim category-complete evidence automatically.

Evidence:

- `docs/agent-policy-gates.md`
- `docs/agent-evidence.md`
- `docs/softwarehouse-sdlc.md`
- `server/src/routes/issues.ts`

## Verdict

PARTIAL PASS

The docs and the generic API contract are now consistent about what the shipped
close gate actually enforces. That resolves the main contract-honesty problem
identified in [LUC-819](/LUC/issues/LUC-819).

The remaining product gap is still real and still high-value: agent-owned
`done` transitions are not hard-gated on typed `TEST`/`REVIEW`/`DOCS` evidence,
and high-risk work is not hard-gated on typed `SECURITY`/`DEPLOY`/`MONITORING`
evidence. Recent issue records show good discipline in some lanes, but that
quality remains convention-driven rather than system-proven.

## Recommended Follow-Up

1. Keep the current docs wording unless and until a typed evidence validator is
   actually shipped.
2. Implement a typed evidence read model for issue closure so the server can
   validate `TEST`, `REVIEW`, and `DOCS` for normal work.
3. Add high-risk classification plus typed `SECURITY`, `DEPLOY`, and
   `MONITORING` validation before agent-owned `done` on deploy/runtime/security
   affecting issues.
4. Standardize issue documents or work-product metadata so the validator reads
   categories directly instead of inferring them from prose.
