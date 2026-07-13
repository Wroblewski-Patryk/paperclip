# LUC-862 Evidence Gate and Definition of Done Review

Date: 2026-07-13
Issue: [LUC-862](/LUC/issues/LUC-862)
Previous review: [LUC-823](/LUC/issues/LUC-823)

## Verdict

`PARTIAL PASS`, no regression from 2026-07-12.

- Paperclip still blocks `done` transitions that have no completion evidence at all.
- Paperclip still does **not** enforce typed evidence bundles such as `TEST`, `REVIEW`, `DOCS`, or risk-based `SECURITY` / `DEPLOY` / `MONITORING`.
- Recent Soar and Roost lanes improved process quality by attaching inspectable artifacts and work products more consistently than the prior sample.

## What Changed Since LUC-823

- The product enforcement path appears unchanged.
- The latest live Soar/Roost closure lanes now usually include attachment-backed artifacts and board-inspectable work products, especially source-control and focused proof lanes.
- This means operating discipline improved, but the improvement is still procedural rather than product-enforced.

## Product Enforcement Check

Reviewed:

- `server/src/routes/issues.ts:1905-1916`
- `server/src/routes/issues.ts:4389-4400`
- `server/src/__tests__/issue-update-comment-wakeup-routes.test.ts:238-286`

Current enforcement:

- `done` is rejected only when there is no close comment and no existing document, attachment, or work product.
- Any one of those evidence categories satisfies the gate.
- The gate does not inspect evidence quality, freshness, category, or whether high-risk work includes security/deploy/monitoring proof.

Targeted verification run on 2026-07-13:

- `pnpm exec vitest run server/src/__tests__/issue-update-comment-wakeup-routes.test.ts`
- Result: `6 passed`
- Note: the suite emitted existing mocked-route warnings about `db.select is not a function` during successful run-handoff logging, but the test file passed and the evidence-gate assertions remained green.

## Live Issue Sample

Recent inspected Soar/Roost closures:

- [LUC-629](/LUC/issues/LUC-629): known-state baseline with closure comments plus attachment/work-product evidence.
- [LUC-631](/LUC/issues/LUC-631), [LUC-632](/LUC/issues/LUC-632), [LUC-635](/LUC/issues/LUC-635), [LUC-636](/LUC/issues/LUC-636), [LUC-637](/LUC/issues/LUC-637): Soar proof/doc lanes closed with comments, attachments, and work products naming commands, entities, and residual owner paths.
- [LUC-602](/LUC/issues/LUC-602), [LUC-603](/LUC/issues/LUC-603), [LUC-822](/LUC/issues/LUC-822): Roost source-control closure lanes closed with inspectable markdown artifacts and explicit no-push/no-deploy boundaries.

Observed pattern:

- Current specialists are generally leaving inspectable artifacts.
- High-risk boundary language is present in comments.
- The system still accepts closure based on evidence existence rather than evidence class.

## Findings

1. Product gap remains open: the server gate is still existence-only, not typed.
2. Softwarehouse Definition of Done remains a supervisor/process contract, not a route-level invariant.
3. No regression was found in recent Soar/Roost issue hygiene; the current delta is stronger artifact discipline, not stronger enforcement.

## Recommended Follow-Up

Create one implementation lane to enforce typed completion evidence for `done` transitions:

- minimum typed bundle for normal work: close comment or equivalent plus explicit proof category support
- elevated bundle for high-risk work: require `SECURITY`, `DEPLOY`, and `MONITORING` evidence when the issue scope declares those risks
- tests should cover both allowed and rejected transitions

## Conclusion

The current state is better than the 2026-07-12 sample operationally, but not materially different as a product gate. Board and supervisor trust should remain calibrated to `existence of evidence` rather than `enforced Definition of Done compliance` until typed evidence validation ships.
