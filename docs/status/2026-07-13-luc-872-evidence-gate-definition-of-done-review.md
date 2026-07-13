# LUC-872 Evidence Gate and Definition of Done Review

Date: 2026-07-13
Issue: [LUC-872](/LUC/issues/LUC-872)
Owner: 09 QVE
Process: regression evidence loop

## Scope

Routine audit of whether the current Stage 1 Paperclip Softwarehouse
evidence-gate and definition-of-done path remains healthy for active and
completed Soar/Roost work.

This review checks:

- whether the active route still enforces the minimum close gate;
- whether the targeted regression proof remains green;
- whether recent Soar/Roost closure lanes still expose inspectable evidence in
  Paperclip itself; and
- whether the Stage 1 parent remains fail-closed behind real blocker chains.

## Evidence Reviewed

Policy and gate docs:

- `docs/softwarehouse/05-definition-of-done.md`
- `docs/softwarehouse/06-quality-gates.md`
- `docs/agent-policy-gates.md`
- `docs/api/issues.md`
- `docs/softwarehouse-sdlc.md`
- `doc/AGENT-ARTIFACTS.md`

Implementation and regression proof:

- `server/src/routes/issues.ts`
- `server/src/__tests__/issue-update-comment-wakeup-routes.test.ts`

Sampled live issue records:

- [LUC-855](/LUC/issues/LUC-855)
- [LUC-856](/LUC/issues/LUC-856)
- [LUC-857](/LUC/issues/LUC-857)
- [LUC-25](/LUC/issues/LUC-25)

Prior same-routine report used for drift comparison:

- `docs/status/2026-07-13-luc-871-evidence-gate-definition-of-done-review.md`

## Verification

Targeted route regression executed on 2026-07-13:

- `pnpm exec vitest run server/src/__tests__/issue-update-comment-wakeup-routes.test.ts`
  - result: `7 passed`
  - warning: `failed to log successful run handoff resolution` because the
    mocked `db` in that harness still does not implement `select`; the warning
    did not fail the close-gate assertions under review
  - proves:
  - bare `done` without completion evidence returns `422`
  - `done` with a completion comment plus typed bundle succeeds
  - `done` with artifact-backed typed refs succeeds
  - typed refs to a missing closeout comment are rejected

Implementation and doc readback:

- `server/src/routes/issues.ts` still rejects `done` transitions unless
  `completionEvidence` is present.
- The same route still validates typed refs against real issue-thread evidence
  inventory and rejects invalid refs with `Completion evidence bundle
  references missing or invalid issue evidence`.
- `docs/agent-policy-gates.md`, `docs/api/issues.md`, and
  `docs/softwarehouse-sdlc.md` still do not describe the stronger typed-bundle
  enforcement now shipped in the route.

## Live Readback

- [LUC-855](/LUC/issues/LUC-855) is `done` as of
  `2026-07-13T03:22:39.840Z` and currently exposes inspectable closure
  evidence through `1` issue comment, `1` attachment, and `1` document.
- [LUC-856](/LUC/issues/LUC-856) is `done` as of
  `2026-07-13T03:20:49.614Z` and currently exposes inspectable closure
  evidence through `1` issue comment, `1` attachment, and `1` document.
- [LUC-857](/LUC/issues/LUC-857) is `done` as of
  `2026-07-13T03:48:51.592Z` and currently exposes inspectable closure
  evidence through `1` issue comment, `1` attachment, and `1` document.
- [LUC-25](/LUC/issues/LUC-25) remains `blocked` behind first-class blockers
  [LUC-448](/LUC/issues/LUC-448) and [LUC-494](/LUC/issues/LUC-494). It still
  exposes inspectable issue-thread evidence while remaining fail-closed instead
  of claiming completed delivery.

## Gate Evaluation

- Test evidence: implemented and verified by the targeted route regression and
  the sampled closure records.
- Review evidence: implemented and verified by this review artifact plus the
  live readback across [LUC-855](/LUC/issues/LUC-855),
  [LUC-856](/LUC/issues/LUC-856), [LUC-857](/LUC/issues/LUC-857), and
  [LUC-25](/LUC/issues/LUC-25).
- Documentation evidence: partially verified. The route and recent closure
  records are stronger than several standing API/policy docs.
- Security evidence: present as an operating requirement and reflected in the
  fail-closed posture of [LUC-25](/LUC/issues/LUC-25); this review did not
  find a false-green claim bypassing current protected-gate expectations.
- Deploy evidence: still governed as part of the broader operating bundle,
  while the route-level close gate remains issue-evidence focused.
- Monitoring evidence: still part of the broader operating bundle rather than
  the route minimum. The Stage 1 parent remains blocked, which is the correct
  current signal.

## Findings

### 1. Product enforcement remains stronger than several standing docs

Severity: medium

The shipped route still requires a typed `completionEvidence` bundle and still
validates refs against actual issue evidence inventory. `docs/agent-policy-gates.md`,
`docs/api/issues.md`, and `docs/softwarehouse-sdlc.md` still lag that shipped
contract.

### 2. Recent closure samples now carry richer Paperclip-native evidence

Severity: low

[LUC-855](/LUC/issues/LUC-855), [LUC-856](/LUC/issues/LUC-856), and
[LUC-857](/LUC/issues/LUC-857) no longer rely on closeout comments alone in
this sample window. Each now exposes an attachment and document in addition to
the closure comment, which is an improvement over the earlier same-day audit.

### 3. The Stage 1 parent remains appropriately fail-closed

Severity: low

[LUC-25](/LUC/issues/LUC-25) is still blocked behind real first-class blocker
chains instead of drifting to a false-green mission summary.

## Verdict

PASS with delegated documentation follow-up.

The current evidence-gate and definition-of-done path remains healthy for this
review window. The route and targeted tests still enforce typed completion
evidence, recent closure lanes now expose richer inspectable evidence inside
Paperclip itself, and the Stage 1 parent still stays fail-closed behind real
blockers.

The remaining drift is documentation lag: the route-level completion contract
is ahead of current API and policy wording, so this review delegates a follow-up
owner path instead of only repeating the warning.

## Residual Risk

The shipped route is stronger than some standing docs. Until those docs are
aligned, future agents may under-specify closeout expectations unless they read
the route, tests, or recent audit artifacts first.
