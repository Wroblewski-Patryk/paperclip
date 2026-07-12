# LUC-820 Evidence-Gate Contract Alignment

Date: 2026-07-12
Owner: 09 CTO

## Outcome

Resolved the contract drift between Softwarehouse policy docs and the shipped
issue close enforcement path by aligning the policy docs to the actual current
product behavior.

Canonical truth after this change:

- `PATCH /api/issues/{id}` enforces a minimum hard gate for `done`.
- The minimum gate requires inspectable completion evidence through one of:
  - a completion comment in the same update;
  - an issue document;
  - an attachment; or
  - a work product.
- The stronger Softwarehouse bundle remains an operating and review
  requirement:
  - normal work should carry `TEST`, `REVIEW`, and `DOCS` evidence;
  - applicable high-risk work should also carry `SECURITY`, `DEPLOY`, and
    `MONITORING` evidence.
- Typed evidence-category validation is not yet shipped in the close route.

## Files Changed

- `docs/agent-policy-gates.md`
- `docs/agent-evidence.md`

## Verification

- Code-path readback:
  - `server/src/routes/issues.ts`
  - `docs/api/issues.md`
- Targeted regression:
  - `pnpm exec vitest run server/src/__tests__/issue-update-comment-wakeup-routes.test.ts`
  - result: `6 passed`
  - warning: mocked test harness still logs `db.select is not a function` from
    successful-run-handoff logging, but the close-gate assertions passed and
    the route behavior under review is unchanged

## Notes

This is a documentation-contract fix, not a server-behavior change. The next
step, if the Softwarehouse wants product-enforced typed bundles, is to add a
typed evidence read model plus route validation for the required categories.
