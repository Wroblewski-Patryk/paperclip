# LUC-1499 Source-Control Closure Classification

> Historical snapshot: the mixed checkout described below was subsequently
> fully verified and committed by the owner-side Codex workflow as `e21da2b1`.
> It no longer represents the current repository state. This record is retained
> as evidence explaining why the autonomous CRS lane correctly refused to make
> an unreviewed catch-all commit at that earlier point in time.

Date: 2026-07-18
Issue: `LUC-1499`
Owner: `09 CRS (Code Review Specialist)`
Mode: `Review` with durable source-control classification

## Scope

Classify the current dirty state in
`C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse` for the
`LUC-1498` closure blocker without staging, reverting, or absorbing unrelated
work into a synthetic commit batch.

## Baseline

- Repo: `C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse`
- `git status --short`
  - tracked modified paths: `24`
  - untracked paths: `3`
  - staged paths: `0`
  - merge conflicts: `0`
- `git diff --cached --name-only`
  - result: empty

## Classification

The current dirty state is a mixed checkout. It is not one safe single-issue
batch for `LUC-1498`.

### Group A. Worker-backlog fan-out control cluster

Status: `present in code and partially verified`
Classification: `intentional Softwarehouse OS control-path change`
Recommended owner path: the active `LUC-1498` worker-fan-out lane

Included paths:

- `scripts/lib/softwarehouse-worker-backlog-tracks.mjs`
- `scripts/run-worker-backlog-decomposition-seeder.mjs`
- `scripts/softwarehouse-worker-backlog-tracks.test.mjs`

Observed intent:

- expose exact runnable/planned/promotable worker-lane references instead of
  only counts;
- force promotion of existing backlog worker lanes before duplicate child lanes
  are created; and
- fail closed on repo dirty-state detection before the seeder supervises or
  creates more worker decomposition work.

Observed verification evidence:

- parent-lane closeout notes record
  `node --test scripts/softwarehouse-worker-backlog-tracks.test.mjs` as pass
  (`8/8`);
- targeted diff inspection shows the fan-out logic and its focused regression
  test moved together.

### Group B. Teams catalog route and board-path repair cluster

Status: `present in code, behavior not re-run in this review heartbeat`
Classification: `intentional product/API/UI change`
Recommended owner path: the existing Teams catalog repair lane, not
`LUC-1498`

Included paths:

- `server/src/app.ts`
- `server/src/__tests__/app-route-registration.test.ts`
- `server/src/__tests__/teams-catalog-service.test.ts`
- `ui/src/App.tsx`
- `ui/src/components/Sidebar.tsx`
- `ui/src/components/Sidebar.test.tsx`
- `ui/src/lib/company-routes.ts`
- `ui/src/lib/company-routes.test.ts`
- `ui/src/pages/TeamCatalog.tsx`
- `ui/src/pages/TeamCatalog.test.tsx`

Observed intent:

- mount the existing Teams catalog API route in the canonical app so the board
  no longer 404s on `/api/teams/catalog`;
- rename the owner-facing board path from `/teams-catalog` to canonical
  `/teams`; and
- keep legacy `/teams-catalog` links working through redirect/alias behavior.

Risk:

- this is a coherent batch by itself, but it is unrelated to the worker-fan-out
  cluster and therefore unsafe to fold into a single `LUC-1498` closure
  commit;
- the constant hash expectation in
  `server/src/__tests__/teams-catalog-service.test.ts` was replaced with a live
  content-hash read, which is defensible but belongs to the same product repair
  lane, not the worker-control lane.

### Group C. Backup restore fallback and restore-drill cluster

Status: `present in code and partially verified`
Classification: `intentional reliability/runtime change`
Recommended owner path: the active restore-proof / disaster-recovery lane, not
`LUC-1498`

Included paths:

- `package.json`
- `packages/db/src/backup-lib.ts`
- `packages/db/src/backup-lib.test.ts`
- `scripts/run-softwarehouse-restore-drill.mjs`

Observed intent:

- wait for `psql` child-process spawn before piping restore input;
- add a streaming JavaScript fallback that can restore `COPY ... FROM stdin`
  sections without `psql`;
- add a repeatable isolated restore-drill command that restores the latest
  backup into a disposable embedded PostgreSQL instance outside canonical ports
  `3200` and `54329`.

Observed verification evidence:

- parent-lane closeout notes record the restore drill as passing against the
  latest backup and the focused backup tests/gate tests as passing;
- targeted diff inspection confirms the new script removes its temporary
  database and asserts canonical-port isolation.

Risk:

- this cluster changes shared database backup/restore behavior and runtime
  tooling, so it must retain its own narrow proof trail and should not be
  committed together with Teams routing or worker-fan-out changes from another
  issue.

### Group D. Instruction-sync, architecture-context, and operating-memory refreshes

Status: `implemented but mixed across docs, state, and governance outputs`
Classification: `current evidence/output plus governance/doc refresh`
Recommended owner path: the originating operating-system doc/memory lanes

Included paths:

- `.agents/state/active-mission.md`
- `.agents/state/board-context.md`
- `.agents/state/project-journal.md`
- `.codex/PROJECT_CONTEXT.md`
- `docs/architecture.md`
- `docs/status/2026-07-18-paperclip-v0-conversation-handoff.md`
- `scripts/softwarehouse-gate-specs.test.mjs`
- `scripts/sync-luckysparrow-agent-instructions.mjs`
- `softwarehouse/instructions/shared/00-current-pilot.md`
- `closeout.md`

Observed intent:

- support bounded `--file=` instruction synchronization instead of whole-bundle
  rewrites;
- update pilot/architecture/project-context text to describe future Roost
  capability consumption through an MCP-first boundary while keeping Paperclip
  as the control plane;
- record operating-memory statements about the Teams-route repair and restore
  drill;
- preserve the parent issue closeout note that created `LUC-1499`.

Risk:

- this group is not one code feature; it mixes generated memory output, policy
  text, gate-regression additions, and an issue closeout artifact;
- several of these edits describe events as happening on `2026-07-19`, which is
  one day in the future relative to the current date `2026-07-18`. That
  timestamp mismatch is acceptable as an observed repo fact for classification,
  but it is another reason not to auto-commit this packet as one clean lane.

## Decision

The current dirty state should be treated as a shared mixed checkout with at
least four distinct owner paths:

1. `LUC-1498` worker-backlog fan-out control changes;
2. Teams catalog API/UI route repair;
3. backup restore fallback plus isolated restore-drill work; and
4. instruction-sync, architecture, and operating-memory refreshes.

That means the correct closure classification for `LUC-1499` is:

- `do not commit from the current shared mixed state`;
- `do not push`;
- preserve the current files in place;
- route each coherent cluster back to its owning implementation/review lane for
  narrow closure; and
- keep `LUC-1498` unblocked only after its own worker-fan-out cluster is
  separated from the unrelated product/runtime/doc packets or explicitly
  retained with owner-approved no-commit evidence.

## Verification

- `git status --short`
- `git diff --stat`
- `git diff --numstat`
- `git diff --cached --name-only`
- `git diff --name-only --diff-filter=U`
- `git diff --check`
  - result: no whitespace/conflict findings; only CRLF normalization warnings
- targeted diff inspection over representative paths from all four groups
- readback of the parent-lane `closeout.md` that created `LUC-1499`

## Final Disposition

- Commit status: `not committed`
- Push status: `not needed`
- Deploy impact: `none`
- Residual risk: the repo remains dirty until the owning lanes close their own
  packets separately; attempting a catch-all commit from this state would mix
  unrelated product, runtime, review, and operating-memory work.
