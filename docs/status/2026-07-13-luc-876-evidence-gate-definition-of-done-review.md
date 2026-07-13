# LUC-876 Evidence Gate And Definition Of Done Review

Date: 2026-07-13
Reviewer: 09 QVE (QA & Verification Engineer)
Mode: Review

## Scope

Audit the current Soar/Roost evidence-gate posture for active and recently
completed work, with emphasis on whether closeouts remain inspectable in
Paperclip and whether the current product behavior supports board-visible
Definition of Done review.

## Verification Performed

- Targeted route regression:
  - `pnpm exec vitest run server/src/__tests__/issue-update-comment-wakeup-routes.test.ts`
  - Result: PASS (`7` tests)
- Live Paperclip API readback against `http://127.0.0.1:3200/api` for:
  - [LUC-25](/LUC/issues/LUC-25)
  - [LUC-183](/LUC/issues/LUC-183)
  - [LUC-619](/LUC/issues/LUC-619)
  - [LUC-640](/LUC/issues/LUC-640)
  - [LUC-821](/LUC/issues/LUC-821)
  - [LUC-822](/LUC/issues/LUC-822)
  - [LUC-635](/LUC/issues/LUC-635)
  - [LUC-727](/LUC/issues/LUC-727)
  - [LUC-847](/LUC/issues/LUC-847)
  - [LUC-853](/LUC/issues/LUC-853)
  - [LUC-875](/LUC/issues/LUC-875)
- Repo readback for current enforcement/persistence paths:
  - [server/src/routes/issues.ts](C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/server/src/routes/issues.ts)
  - [packages/db/src/schema/issues.ts](C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/packages/db/src/schema/issues.ts)
  - [docs/agent-policy-gates.md](C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/docs/agent-policy-gates.md)
  - [docs/softwarehouse-sdlc.md](C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/docs/softwarehouse-sdlc.md)
  - [docs/api/issues.md](C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/docs/api/issues.md)

## Primary Finding

### High: `completionEvidence` is enforced on close but not persisted in the issue read model

Status: present and reproducible

Evidence:

- The update route rejects `status: done` without a typed bundle and validates
  same-issue refs in
  [server/src/routes/issues.ts](C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/server/src/routes/issues.ts:4456)
  through
  [server/src/routes/issues.ts](C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/server/src/routes/issues.ts:4479).
- The same route only carries the bundle into activity-log details, not into
  persisted issue state, at
  [server/src/routes/issues.ts](C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/server/src/routes/issues.ts:4730).
- The `issues` table schema has no `completionEvidence` or equivalent closure
  bundle column in
  [packages/db/src/schema/issues.ts](C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/packages/db/src/schema/issues.ts:21).
- Live readback for a fresh post-enforcement close,
  [LUC-875](/LUC/issues/LUC-875), returns a `done` issue with inspectable
  comment/work-product evidence but no populated `completionEvidence` field in
  `GET /api/issues/:id`.

Impact:

- Board/API consumers cannot reliably audit the exact typed closure bundle from
  normal issue readback.
- Historical and fresh `done` issues look the same at the issue-record layer
  even when the route enforced different standards.
- Mission-control review currently depends on comments, work products,
  documents, or activity-log forensics instead of one canonical issue-level
  evidence object.

Recommended owner path:

- CTO follow-up to decide whether to persist the bundle on `issues`, expose a
  derived read model from activity data, or both.

## Current Audit Result

### PASS on sampled Soar/Roost inspectability, with residual product risk

Sampled issues currently remain inspectable through comments, documents,
attachments, or work products:

- [LUC-25](/LUC/issues/LUC-25) remains correctly `blocked` by
  [LUC-448](/LUC/issues/LUC-448) and
  [LUC-494](/LUC/issues/LUC-494).
- [LUC-183](/LUC/issues/LUC-183) carries deploy/rollback/monitoring documents
  and work products.
- [LUC-821](/LUC/issues/LUC-821), [LUC-822](/LUC/issues/LUC-822),
  [LUC-619](/LUC/issues/LUC-619), and [LUC-640](/LUC/issues/LUC-640) now have
  Paperclip-visible artifact closure packets after the recent backfill work.
- [LUC-635](/LUC/issues/LUC-635) has a parent synthesis closeout comment that
  integrates child evidence from [LUC-636](/LUC/issues/LUC-636) and
  [LUC-637](/LUC/issues/LUC-637).
- [LUC-727](/LUC/issues/LUC-727) is inspectable through attachments and a
  detailed proof packet comment documenting the earlier mutation-route blocker.

Residual risk:

- The evidence gate is operationally usable, but the product read model is
  still weaker than the closure contract because the typed bundle itself is not
  returned on issue readback.
- The documentation-alignment files remain dirty in the current Paperclip
  workspace (`docs/agent-policy-gates.md`, `docs/api/issues.md`,
  `docs/softwarehouse-sdlc.md`), so this review does not claim source-control
  closure for those doc edits.

## Disposition

- Audit lane: complete
- Blocking product gap: yes, delegated to CTO follow-up
- Repo mutation: this report file only
- Commit: not committed
- Push/deploy impact: none
