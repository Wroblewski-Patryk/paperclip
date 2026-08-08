# Paperclip Project Journal

Last updated: 2026-08-08

This is the active journal of durable conversation decisions and meaningful
operating-memory changes. It is not a transcript, live dashboard, issue log,
or evidence store. Current truth belongs in the appropriate current-state or
product source; detailed proof belongs in issues and work products.

## Archive Index

- [Journal through 2026-08-04](../../history/agent-memory/project-journal-through-2026-08-04.md)
- [Codex context snapshot through 2026-08-04](../../history/agent-memory/PROJECT_CONTEXT-through-2026-08-04.md)

Archives preserve the full historical record and may contain superseded or
duplicated observations. Search them only for historical reconstruction; they
cannot override current truth, decisions, product contracts, or fresh live
evidence.

## Entries

### 2026-08-08 - Stabilization program and first repairs

- Conversation decision: do not scale the organization or update upstream
  Paperclip until the installed softwarehouse produces constructive,
  evidence-backed application delivery from existing product assumptions and
  documentation.
- The owner authorized cleanup and completion rather than another advisory
  report. Good mechanisms remain; incomplete and incorrect mechanisms are
  repaired; noise and duplication are removed without destructive history
  rewriting.
- Live inspection proved all 37 routines were paused or archived. Root cause
  included a partial routine-title migration: canonical departmental titles
  were not the titles recognized by the active matrix and several janitors.
- The native autonomy/control-plane worktree was completed and committed as
  `b098fbc39` after repo-wide typecheck and build. A real clock-propagation bug
  in `run-context-builder` and an incomplete UI situation fixture were fixed
  during validation.
- A fresh pre-mutation database backup is
  `paperclip-20260808-230645.sql.gz`. No upstream update was performed.

### 2026-08-08 - Provider-neutral AI context architecture

- Conversation decision: the repository is Codex-first and no longer needs a
  repository-local `.claude/` compatibility layer.
- `.agents/` is the canonical provider-neutral home for reusable skills and
  durable operating memory. The unique UI design skill was preserved by moving
  it from `.claude/skills/` to `.agents/skills/design-guide/`.
- `.codex/PROJECT_CONTEXT.md` is now a small routing bootstrap instead of a
  second copy of volatile project status. The previous full context remains in
  `history/agent-memory/`.
- The former 362 KB journal was not truncated or discarded. It was moved as a
  complete historical snapshot, while this active journal keeps only new,
  durable deltas and links to the archive.
- File-size budgets remain context-safety signals, not limits on preserved
  history. When active memory grows, archive immutable history and carry
  forward only unresolved decisions, current direction, and navigation.
- Recursive Stage 0 ZIP snapshots were identified as disk bloat rather than
  useful context. Backup generation must exclude its own destination and use
  bounded retention.
