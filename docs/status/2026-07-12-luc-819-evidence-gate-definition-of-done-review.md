# LUC-819 Evidence Gate and Definition of Done Review

Date: 2026-07-12
Owner: 09 QVE

## Scope

Review whether the current Paperclip Softwarehouse evidence gate and
definition-of-done contract for Soar/Roost work is:

- documented consistently;
- enforced by the current server implementation; and
- reflected in recent issue closure records.

This review supersedes the older same-day finding pattern from
`LUC-815`: the docs have changed since that review, so the current question is
whether the implementation now matches the stronger documented contract.

## Evidence Checked

Policy and operating docs:

- `docs/agent-policy-gates.md`
- `docs/agent-evidence.md`
- `docs/softwarehouse-sdlc.md`
- `docs/softwarehouse/05-definition-of-done.md`
- `docs/softwarehouse/06-quality-gates.md`
- `docs/softwarehouse/local-first-shippable-gate-bundle.md`
- `docs/api/issues.md`

Implementation and tests:

- `server/src/routes/issues.ts`
- `server/src/__tests__/issue-update-comment-wakeup-routes.test.ts`

Live issue samples:

- [LUC-631](/LUC/issues/LUC-631)
- [LUC-637](/LUC/issues/LUC-637)
- [LUC-493](/LUC/issues/LUC-493)
- [LUC-754](/LUC/issues/LUC-754)
- [LUC-815](/LUC/issues/LUC-815)

## Verification

Code-path inspection:

- `server/src/routes/issues.ts` still uses `hasIssueDoneEvidence()` to accept
  any existing issue document, attachment, or work product as sufficient
  non-comment evidence.
- `PATCH /api/issues/{id}` still rejects only bare `done` transitions with no
  comment and no linked document/attachment/work product.
- The route does not evaluate typed evidence categories such as `TEST`,
  `REVIEW`, `DOCS`, `SECURITY`, `DEPLOY`, or `MONITORING`.

Targeted test executed:

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

- [LUC-631](/LUC/issues/LUC-631): closed with attachment-backed browser proof
  files; the route accepted attachment existence without typed evidence
  classification.
- [LUC-637](/LUC/issues/LUC-637): closed with two attachment-backed artifact
  work products; this is the strongest normalized sample in the set, but the
  work-product model still does not encode the Softwarehouse evidence bundle
  categories.
- [LUC-493](/LUC/issues/LUC-493): high-risk deploy/readiness closure includes a
  strong completion comment and a `deploy-smoke` document; the product accepted
  it because inspectable evidence existed, not because high-risk categories were
  validated.
- [LUC-754](/LUC/issues/LUC-754): closed from comment-only evidence after a
  focused test/doc-link proof lane; valid under the current API gate.
- [LUC-815](/LUC/issues/LUC-815): earlier review artifact exists, but the docs
  now claim stronger hard-gate enforcement than that older review described.

## Findings

### 1. Documentation now overstates what the API enforces

Severity: high

`docs/agent-policy-gates.md` now states that agent-owned `done` transitions
require test, docs, and review evidence, and that high-risk work also requires
security, deployment, and monitoring evidence.

The shipped route does not enforce that contract. It still requires only one of:

- a completion comment in the same `PATCH`;
- any existing issue document;
- any attachment; or
- any work product.

This is a material contract drift. The docs currently describe a stronger hard
gate than the product actually ships.

Evidence:

- `docs/agent-policy-gates.md`
- `docs/agent-evidence.md`
- `docs/softwarehouse-sdlc.md`
- `server/src/routes/issues.ts`
- `server/src/__tests__/issue-update-comment-wakeup-routes.test.ts`

### 2. High-risk closure remains convention-driven, not category-gated

Severity: high

The stronger deploy/security/monitoring requirements are still behavioral
discipline, not enforced product rules.

[LUC-493](/LUC/issues/LUC-493) is a good high-risk example: it contains a
useful deploy-smoke document and a disciplined closure comment. The problem is
that the same endpoint would also accept a weaker close as soon as any one
document, attachment, work product, or comment exists.

Evidence:

- [LUC-493](/LUC/issues/LUC-493)
- `docs/softwarehouse/local-first-shippable-gate-bundle.md`
- `server/src/routes/issues.ts`

### 3. Recent issue records show mixed evidence quality because the gate reads existence, not categories

Severity: medium

The sampled closures are inspectable, but they are not normalized into a typed
evidence read model:

- [LUC-631](/LUC/issues/LUC-631): attachment-backed proof only
- [LUC-637](/LUC/issues/LUC-637): attachment-backed artifact work products
- [LUC-754](/LUC/issues/LUC-754): comment-only closure evidence
- [LUC-493](/LUC/issues/LUC-493): strong comment + document pattern for a
  high-risk lane

This makes recent closures readable to a human reviewer, but it does not let
the system prove "normal bundle complete" or "high-risk bundle complete"
without reading prose and inferring intent.

Evidence:

- [LUC-631](/LUC/issues/LUC-631)
- [LUC-637](/LUC/issues/LUC-637)
- [LUC-493](/LUC/issues/LUC-493)
- [LUC-754](/LUC/issues/LUC-754)

### 4. Generic API docs still match the implementation better than the Softwarehouse policy docs

Severity: medium

`docs/api/issues.md` still documents the actual generic route behavior
correctly: `done` requires a comment, issue document, attachment, or work
product. The stronger drift is between Softwarehouse policy docs and the route,
not between API docs and the route.

Evidence:

- `docs/api/issues.md`
- `server/src/routes/issues.ts`

## Verdict

FAIL

The current close gate still enforces a meaningful minimum: an agent cannot
move an issue to `done` with no inspectable evidence at all.

But the Softwarehouse policy docs now claim stronger typed evidence-category
enforcement that the product does not implement. Until that drift is resolved,
the softwarehouse cannot honestly claim that agent-owned `done` transitions are
hard-gated for `TEST/REVIEW/DOCS` and applicable high-risk categories.

## Recommended Follow-Up

1. Decide the canonical truth with CTO ownership: either implement typed
   evidence-category validation in the issue close path, or scale the policy
   docs back to the actual minimum gate until the implementation exists.
2. If the stronger policy is kept, add a typed evidence read model that can
   prove `TEST`, `REVIEW`, and `DOCS` for normal work and
   `SECURITY`/`DEPLOY`/`MONITORING` for applicable high-risk work.
3. Add targeted route tests that fail when comment-only or attachment-only
   closure bypasses the documented typed bundle.
4. Standardize work-product or document metadata so the close gate reads
   structured categories instead of inferring from free-form comments.
