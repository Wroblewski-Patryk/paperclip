# LUC-867 Evidence Gate and Definition of Done Review

Date: 2026-07-13
Owner: 09 QVE
Process: regression evidence loop

## Scope

Routine audit of whether the current Stage 1 Paperclip Softwarehouse evidence
gate and definition-of-done path remains healthy for active and completed
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
- `docs/agent-policy-gates.md`
- `docs/softwarehouse-sdlc.md`
- `docs/api/issues.md`
- `doc/AGENT-ARTIFACTS.md`

Implementation and regression proof:

- `server/src/routes/issues.ts`
- `server/src/__tests__/issue-update-comment-wakeup-routes.test.ts`

Sampled live issue records:

- [LUC-25](/LUC/issues/LUC-25)
- [LUC-855](/LUC/issues/LUC-855)
- [LUC-856](/LUC/issues/LUC-856)
- [LUC-857](/LUC/issues/LUC-857)

Prior same-routine reports used for drift comparison:

- `docs/status/2026-07-13-luc-858-evidence-gate-definition-of-done-review.md`
- `docs/status/2026-07-13-luc-862-evidence-gate-definition-of-done-review.md`

## Verification

Targeted route regression executed on 2026-07-13:

- `pnpm exec vitest run server/src/__tests__/issue-update-comment-wakeup-routes.test.ts`
  - result: `7 passed`
  - warning: `failed to log successful run handoff resolution` because the
    mocked `db` in that harness does not implement `select`; the warning did
    not fail the close-gate assertions under review
  - proves:
  - bare `done` without completion evidence returns `422`
  - `done` with a completion comment plus typed bundle succeeds
  - `done` with artifact-backed typed refs succeeds
  - typed refs to a missing closeout comment are rejected

Implementation and doc readback:

- `server/src/routes/issues.ts` now rejects `done` transitions unless
  `completionEvidence` is present.
- The route also validates the bundle against real issue evidence inventory and
  returns `Completion evidence bundle references missing or invalid issue
  evidence` when refs do not resolve.
- `docs/api/issues.md`, `docs/softwarehouse-sdlc.md`, and
  `docs/agent-policy-gates.md` still describe the older minimum gate as
  comment/document/attachment/work-product existence without the newer typed
  bundle requirement.

Working tree readback for this repo:

- `git status --short`
  - result: existing unrelated modifications remained in
    `.agents/state/project-journal.md`,
    `docs/status/softwarehouse-unblock-packet.md`,
    `packages/adapter-utils/src/server-utils.ts`,
    `packages/adapters/openclaw-gateway/src/server/execute.ts`,
    `packages/shared/src/index.ts`,
    `packages/shared/src/types/index.ts`,
    `packages/shared/src/types/issue.ts`,
    `packages/shared/src/validators/index.ts`,
    `packages/shared/src/validators/issue.test.ts`,
    `packages/shared/src/validators/issue.ts`,
    `server/src/__tests__/issue-update-comment-wakeup-routes.test.ts`,
    `server/src/routes/issues.ts`,
    `skills/paperclip/SKILL.md`,
    `softwarehouse/portfolio/APPLICATIONS_INDEX.csv`, and
    `softwarehouse/portfolio/APPLICATIONS_INDEX.md`, plus pre-existing untracked
    status/report artifacts under `docs/status/` and `softwarehouse/reports/`
  - this QA routine did not normalize or revert those pre-existing changes

## Live Readback

- [LUC-855](/LUC/issues/LUC-855) is `done` as of
  `2026-07-13T03:22:39.816Z` and currently exposes inspectable closure evidence
  in Paperclip through `1` issue comment and no attachments, documents, or work
  products.
- [LUC-856](/LUC/issues/LUC-856) is `done` as of
  `2026-07-13T03:20:49.470Z` and currently exposes inspectable closure evidence
  in Paperclip through `1` issue comment and no attachments, documents, or work
  products.
- [LUC-857](/LUC/issues/LUC-857) is `done` as of
  `2026-07-13T03:48:51.573Z` and currently exposes inspectable closure evidence
  in Paperclip through `1` issue comment and no attachments, documents, or work
  products.
- [LUC-25](/LUC/issues/LUC-25) remains `blocked` with first-class blockers
  [LUC-448](/LUC/issues/LUC-448) and [LUC-494](/LUC/issues/LUC-494). It still
  exposes `59` comments and `3` documents while remaining fail-closed instead
  of claiming completed delivery.

## Gate Evaluation

- Test evidence: implemented and verified by the targeted route regression and
  the sampled closure records.
- Review evidence: implemented and verified by this review artifact plus the
  live readback across [LUC-855](/LUC/issues/LUC-855),
  [LUC-856](/LUC/issues/LUC-856), [LUC-857](/LUC/issues/LUC-857), and
  [LUC-25](/LUC/issues/LUC-25).
- Documentation evidence: partially verified. The route and tests are clear,
  but key API/policy docs still understate the current typed completion-evidence
  requirement.
- Security evidence: present as an operating requirement and reflected in the
  fail-closed posture of [LUC-25](/LUC/issues/LUC-25); this review did not find
  a false green claim bypassing current protected-gate expectations.
- Deploy evidence: still governed as part of the stronger operating bundle,
  while the route-level close gate remains issue-evidence focused.
- Monitoring evidence: still part of the stronger operating bundle rather than
  the route minimum. The Stage 1 parent remains blocked, which is the correct
  current signal.

## Findings

### 1. Product enforcement is now stronger than several standing docs

Severity: medium

The shipped route no longer matches the older documentation summary. Current
product behavior requires a typed `completionEvidence` bundle and validates its
refs against actual issue evidence. `docs/api/issues.md`,
`docs/softwarehouse-sdlc.md`, and `docs/agent-policy-gates.md` still describe
the previous existence-only minimum.

### 2. Recent closure samples are inspectable, but mostly comment-backed

Severity: low

[LUC-855](/LUC/issues/LUC-855), [LUC-856](/LUC/issues/LUC-856), and
[LUC-857](/LUC/issues/LUC-857) are still auditable in Paperclip itself, but in
this sample window the evidence is the closeout comment only. The current route
accepts that, so this is not a product failure. It does mean the routine should
not overclaim attachment/work-product richness when the live record is
comment-backed.

### 3. The Stage 1 parent remains appropriately fail-closed

Severity: low

[LUC-25](/LUC/issues/LUC-25) is still blocked behind real first-class blocker
chains instead of drifting to a false green mission summary. The previously
reported stale blocker drift is not present in the current readback.

## Verdict

PASS with documentation follow-up.

The current evidence-gate and Definition of Done path remains healthy for this
review window. The route and targeted tests now enforce typed completion
evidence more strongly than the older docs claimed, sampled Soar/Roost closure
lanes still expose inspectable issue evidence in Paperclip, and the Stage 1
parent still stays fail-closed behind real blockers.

The main drift found in this run is documentation lag: the route-level
completion contract is ahead of the current API/policy wording.

## Residual Risk

The route now enforces typed completion bundles, but sampled closure records in
this window are still mostly comment-backed. Review quality still depends on
agents and supervisors writing precise closeout comments and keeping policy/API
docs synchronized with the shipped gate.
