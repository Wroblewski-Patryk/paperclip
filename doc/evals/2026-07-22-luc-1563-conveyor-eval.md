# LUC-1563 Conveyor Acceptance Eval

Date: 2026-07-22
Issue: LUC-1563
Agent: 09 QVE (QA & Verification Engineer)
Mode: fresh acceptance re-eval after board reopen

## Verdict

Implemented and verified for the scoped acceptance packet.

- Two automatic cross-unit handoff behaviors are covered by fresh automated proof.
- The negative paths requested by the board are covered by fresh automated proof or live dry-run control-plane evidence.
- The current persistent-parent dispatcher behavior is included: only runnable children under live persistent parents `LUC-27` and `LUC-28` count as active conveyor lanes.

## Evidence Map

### 1. Automatic cross-unit handoff: successful run -> corrective handoff wake

Command:

```powershell
pnpm exec vitest run server/src/__tests__/heartbeat-process-recovery.test.ts -t "queues one finish-handoff wake when a successful run leaves in-progress work without a next action"
```

Result: passed.

What it proves:

- a successful run that leaves no valid next disposition does not silently die in place;
- Paperclip emits one automatic `finish_successful_run_handoff` wake;
- the wake payload records `handoffRequired: true` and `handoffReason: "successful_run_missing_state"`;
- a durable system comment and activity event are recorded without board mutation.

### 2. Automatic cross-unit handoff: stale repair update -> workflow-controlled reviewer handoff

Command:

```powershell
pnpm exec vitest run server/src/__tests__/issue-execution-policy.test.ts -t "reasserts the active stage and refreshes review instructions when a stale repair update lands"
```

Result: passed.

What it proves:

- when an executor tries to close work after a child-handoff repair, Paperclip reasserts the active review stage;
- assignee control returns to the reviewer lane instead of accepting a stale terminal patch;
- the handoff remains workflow-controlled rather than depending on a board repair.

### 3. Persistent parent / runnable-child-only conveyor rule

Command:

```powershell
node --test scripts/project-truth-gap-dispatcher.test.mjs
```

Result: 9/9 passed.

What it proves:

- `backlog` lanes are inventory only and do not count toward active dispatch depth;
- blocked-only copies do not count as runnable conveyor coverage;
- detached history does not suppress a runnable child;
- active Project Truth lanes can be counted only when attached to the live persistent completion parent;
- the canonical persistent parents are `LUC-27` for Soar and `LUC-28` for Roost.

### 4. Live controller dry-run

Command:

```powershell
node scripts/run-project-truth-gap-dispatcher.mjs
```

Result:

- `ok: true`
- `mode: "dry-run"`
- `contractRefresh.status: "current"`
- current outcome: `noop_operating_repo_dirty_source_control_closure_required`

What it proves:

- the conveyor controller is runnable now and reads the current control-plane state;
- it refuses to dispatch new product-truth work while the operating repo is dirty;
- the next action remains bounded and explicit rather than silently creating new child work.

## Negative Paths

### Early parent closure fails

Command:

```powershell
pnpm exec vitest run server/src/__tests__/issue-execution-policy.test.ts -t "reasserts the active stage and refreshes review instructions when a stale repair update lands"
```

Result: passed.

Failure mode:

- a stale attempt to close the parent is rejected back into `in_review`;
- reviewer ownership is restored automatically;
- the parent does not close early just because a stale repair patch arrived.

### Backlog-only queue fails as runnable conveyor state

Command:

```powershell
node --test scripts/project-truth-gap-dispatcher.test.mjs
```

Relevant passing case:

- `activeProjectTruthTrackIssues ignores backlog-only lanes for depth counting`

Failure mode:

- `backlog` alone is not accepted as active queue coverage.

### Wrong-project workspace fails

Command:

```powershell
pnpm exec vitest run server/src/__tests__/execution-workspace-reuse.test.ts -t "rejects a different project workspace or archived record"
```

Result: passed.

Failure mode:

- a shared execution workspace is not reused when the requested `projectWorkspaceId` belongs to a different project workspace record.

### Dirty-repo writer collision fails

Commands:

```powershell
node --test --test-name-pattern "worker backlog decomposition stays in active products and serializes shared-workspace writers" scripts/softwarehouse-gate-specs.test.mjs
node --test --test-name-pattern "source-control closure janitor reopens invalid clean claims against dirty primary repo" scripts/softwarehouse-gate-specs.test.mjs
node scripts/run-project-truth-gap-dispatcher.mjs
```

Results: all passed / dry-run returned expected noop.

Failure mode:

- only one repo-mutating worker lane may resume for a shared project workspace;
- an invalid clean claim is reopened against a dirty primary repo;
- the live dispatcher refuses to advance while `Paperclip_Softwarehouse` remains dirty (`dirtyCount: 15`).

## LUC-1546 Regression Check

Live Paperclip API read:

```powershell
Invoke-RestMethod -Headers $headers -Uri "$env:PAPERCLIP_API_URL/api/issues/LUC-1546" -Method Get
```

Observed current state on 2026-07-22:

- issue `LUC-1546` is `done`;
- `successfulRunHandoff.state` is still `escalated`;
- `successfulRunHandoff.createdAt` is `2026-07-20T23:52:06.495Z`.

Interpretation:

- this is the live example of the split documented in [doc/execution-semantics.md](../execution-semantics.md): repo-side success and issue-side disposition are separate completion planes;
- the system preserved a visible corrective/escalation trail instead of requiring a board-side mutation to hide the gap;
- the stale repair/update test above is the fresh regression proof for this class of failure.

## Files Relevant To This Eval

- [doc/execution-semantics.md](../execution-semantics.md)
- [scripts/lib/project-truth-gap-dispatcher.mjs](../../scripts/lib/project-truth-gap-dispatcher.mjs)
- [scripts/project-truth-gap-dispatcher.test.mjs](../../scripts/project-truth-gap-dispatcher.test.mjs)
- [scripts/run-project-truth-gap-dispatcher.mjs](../../scripts/run-project-truth-gap-dispatcher.mjs)
- [scripts/softwarehouse-gate-specs.test.mjs](../../scripts/softwarehouse-gate-specs.test.mjs)
- [server/src/__tests__/heartbeat-process-recovery.test.ts](../../server/src/__tests__/heartbeat-process-recovery.test.ts)
- [server/src/__tests__/issue-execution-policy.test.ts](../../server/src/__tests__/issue-execution-policy.test.ts)
- [server/src/__tests__/execution-workspace-reuse.test.ts](../../server/src/__tests__/execution-workspace-reuse.test.ts)

## Residual Risk

- This packet is a focused acceptance eval, not a full repo-wide validation pass.
- The live dry-run proves current controller behavior, but it intentionally does not mutate production issue state during this QA lane.
