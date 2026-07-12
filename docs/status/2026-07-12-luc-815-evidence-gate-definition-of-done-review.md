# LUC-815 Evidence Gate and Definition of Done Review

Date: 2026-07-12
Owner: 09 QVE

## Scope

Review whether the current Paperclip Softwarehouse evidence gate and
definition-of-done contract for Soar/Roost work is:

- documented consistently;
- enforced by the current server implementation; and
- reflected in recent Soar/Roost closure records.

## Evidence Checked

Policy and product docs:

- `docs/agent-policy-gates.md`
- `docs/agent-evidence.md`
- `docs/softwarehouse-sdlc.md`
- `docs/softwarehouse/05-definition-of-done.md`
- `docs/softwarehouse/12-app-completion-review.md`
- `docs/softwarehouse/local-first-shippable-gate-bundle.md`
- `docs/api/issues.md`
- `docs/paperclip-autonomous-softwarehouse-audit.md`

Implementation and tests:

- `server/src/routes/issues.ts`
- `server/src/services/issue-execution-policy.ts`
- `server/src/__tests__/issue-update-comment-wakeup-routes.test.ts`
- `server/src/__tests__/issue-execution-policy.test.ts`

Live issue samples:

- [LUC-631](/LUC/issues/LUC-631)
- [LUC-637](/LUC/issues/LUC-637)
- [LUC-493](/LUC/issues/LUC-493)
- [LUC-754](/LUC/issues/LUC-754)

## Verification

Code-path inspection:

- `server/src/routes/issues.ts` `hasIssueDoneEvidence()` accepts any linked
  document, attachment, or work product as sufficient non-comment evidence.
- `PATCH /api/issues/{id}` rejects only bare `done` transitions with no comment
  and no linked artifact/doc/work product.

Targeted test evidence reviewed:

- Executed `pnpm exec vitest run server/src/__tests__/issue-update-comment-wakeup-routes.test.ts`
  - result: `6 passed`
  - warning during harness execution: `failed to log successful run handoff resolution`
    because the mocked `db` in that test path does not implement `select`; this
    did not fail the close-gate assertions under review.
  - proves:
  - bare `done` without evidence returns `422`;
  - `done` with a completion comment succeeds;
  - `done` with any work product succeeds.
- Executed `pnpm exec vitest run server/src/__tests__/issue-execution-policy.test.ts`
  - result: `50 passed`
  - verifies execution-stage review/approval routing, not the Softwarehouse
    evidence-category bundle.

Live sample evidence:

- [LUC-631](/LUC/issues/LUC-631): closed with a strong QA comment plus a `plan`
  document containing browser-proof evidence and uploaded attachments.
- [LUC-637](/LUC/issues/LUC-637): closed with attachment-backed work products
  and a focused proof packet.
- [LUC-493](/LUC/issues/LUC-493): high-risk deploy-readiness closure includes a
  detailed `deploy-smoke` document, but the server-side close gate only needed
  that document to exist.
- [LUC-754](/LUC/issues/LUC-754): closed from comment evidence only; the
  comment is disciplined and inspectable, but no typed evidence bundle was
  required by the API.

## Findings

### 1. Current `done` enforcement is weaker than the documented Softwarehouse gate bundle

Severity: high

The Softwarehouse docs say normal work requires `TEST`, `REVIEW`, and `DOCS`
evidence, and high-risk work also requires `SECURITY`, `DEPLOY`, and
`MONITORING` evidence where applicable.

The shipped route does not validate those categories. It only requires one of:

- a completion comment in the same `PATCH`;
- any existing issue document;
- any attachment; or
- any work product.

This means the implementation currently enforces "some inspectable closure
evidence exists," not the stronger category-based gate described in the
Softwarehouse docs.

Evidence:

- `docs/agent-evidence.md`
- `docs/agent-policy-gates.md`
- `server/src/routes/issues.ts`
- `server/src/__tests__/issue-update-comment-wakeup-routes.test.ts`

### 2. High-risk closure still depends on agent discipline rather than a hard product gate

Severity: high

Recent high-risk Soar/Roost work often contains good deployment and smoke
evidence, but that is because the assignee wrote a careful closure record, not
because the product forced `SECURITY`, `DEPLOY`, and `MONITORING` categories
before `done`.

[LUC-493](/LUC/issues/LUC-493) is a good example of a disciplined high-risk
closure record. The problem is that the same endpoint would also accept a much
weaker close if some unrelated issue document or attachment already existed.

Evidence:

- [LUC-493](/LUC/issues/LUC-493)
- `docs/softwarehouse/local-first-shippable-gate-bundle.md`
- `docs/paperclip-autonomous-softwarehouse-audit.md`

### 3. Contract drift exists between generic API docs and Softwarehouse operating docs

Severity: medium

`docs/api/issues.md` documents the current generic API truth correctly: done
requires a comment, issue document, attachment, or work product. The
Softwarehouse docs document a stronger operational expectation. Those two
contracts are not the same, and the difference is material for autonomous
closure safety.

Evidence:

- `docs/api/issues.md`
- `docs/agent-evidence.md`
- `docs/softwarehouse-sdlc.md`
- `docs/softwarehouse/local-first-shippable-gate-bundle.md`

### 4. Recent Soar/Roost issue records are often adequate, but adequacy is not normalized

Severity: medium

The sampled issues show useful evidence quality, but the structure is uneven:

- [LUC-637](/LUC/issues/LUC-637) uses attachment-backed work products and is
  close to the desired model.
- [LUC-631](/LUC/issues/LUC-631) uses a strong comment plus plan/attachments,
  but the primary document key is still `plan`, not a normalized QA packet.
- [LUC-754](/LUC/issues/LUC-754) relies on comment-only closure evidence.

This is inspectable, but it is not yet a normalized evidence read model that
lets the system prove "test/review/docs complete" or "high-risk bundle complete"
without reading prose.

Evidence:

- [LUC-631](/LUC/issues/LUC-631)
- [LUC-637](/LUC/issues/LUC-637)
- [LUC-754](/LUC/issues/LUC-754)

## Verdict

PARTIAL PASS

The repo and live issue records already enforce a meaningful minimum: work
cannot move to `done` with no inspectable evidence at all. Recent Soar/Roost
issues also show that agents often provide good proof in practice.

But the current hard gate is still materially weaker than the documented
Softwarehouse definition-of-done and evidence bundle. Category-based evidence
validation for normal and high-risk completion remains a real product gap.

## Recommended Follow-Up

1. Replace the current `hasIssueDoneEvidence()` existence check with a typed
   evidence-category evaluation that can prove `TEST`, `REVIEW`, and `DOCS` for
   normal work.
2. Add high-risk classification and require `SECURITY`, `DEPLOY`, and
   `MONITORING` categories before agent-owned `done` on deploy/runtime/security
   affecting issues.
3. Standardize evidence packets or work-product metadata so the gate reads
   structured categories instead of inferring from free-form comments/docs.
4. Keep sampled Soar/Roost closure quality as the behavioral target, but move
   that quality from convention into product enforcement.
