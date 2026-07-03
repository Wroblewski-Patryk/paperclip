# Release Train

Last updated: YYYY-MM-DD

## Purpose

Define how changes move from scope to validation to release.

```text
scope -> freeze -> validation -> release -> smoke -> evidence -> follow-up
```

## Current Train

| Release | Scope status | Freeze date | Target date | Status | Evidence |
| --- | --- | --- | --- | --- | --- |
| v0.1 | draft |  |  | planned |  |

## Gates

1. Scope is explicit.
2. Function chains and work packages are linked.
3. Required tests pass.
4. Environment matrix is current.
5. Smoke and rollback paths are defined.
6. Evidence is recorded in `history/releases/`.

## Rule

Do not add untracked scope after freeze without updating the release record and
risk notes.
