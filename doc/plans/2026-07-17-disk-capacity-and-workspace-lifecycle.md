# Disk Capacity and Workspace Lifecycle Recovery

Date: 2026-07-17

## Outcome

Keep the local Softwarehouse operable under sustained autonomous load by bounding database backups
and run logs, reusing shared execution-workspace records, and safely recovering stale Soar git
worktrees without discarding uncommitted source changes.

## Evidence at Discovery

- The system reached 5.53 GB free on `C:` while Paperclip was idle.
- Database backups occupied 31.6 GB even though file configuration declared a 10 GiB cap.
- Run logs occupied 7.9 GB with no lifecycle sweep.
- Soar had 144 physical Paperclip worktrees occupying about 39.2 GB; 109 were dirty and ten had
  commits not merged into `main`.
- Paperclip had more than 4,200 active shared execution-workspace rows, including hundreds of
  duplicate rows for individual issues.
- One Paperclip server and one embedded Postgres cluster were active; duplicate server instances
  were not the cause.

## Plan and Gates

1. Create a fresh database backup, apply the configured 10 GiB limit through the supported backup
   library, and verify a retained restore point before accepting any deletion.
2. Make backup byte and disk-space limits part of the effective server configuration so scheduled
   and manual backups enforce the same policy.
3. Reuse the issue's compatible shared execution-workspace record instead of inserting a new active
   row on every heartbeat; archive historical duplicates with an auditable maintenance command.
4. Add run-log retention that only removes files for terminal runs, preserves recent evidence, and
   applies both an age window and a total-size ceiling.
5. Export recovery manifests, binary diffs, untracked source archives, and refs for stale Soar
   worktrees before removing them. Preserve the current `LUC-1368` worktree.
6. Run targeted regression tests, capacity checks, workspace-boundary audit, single-instance checks,
   and post-restart health monitoring. Record security, deployment, monitoring, review, and docs
   evidence in the project journal.

## Safety Decisions

- Work only within the approved Paperclip, Soar, and Roost roots.
- Never treat dependency directories or build caches as unique recovery evidence.
- Do not remove a worktree until its tracked diff, untracked source inventory/archive, HEAD, branch,
  merge state, and removal result are recorded.
- Do not restart Paperclip while an agent run is active.
- Keep the newest successful database backup and let the tested retention implementation select the
  remaining daily, weekly, and monthly restore points.
