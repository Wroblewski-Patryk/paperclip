# Paperclip Project Journal

Last updated: 2026-08-14

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

### 2026-08-14 - Persistent dashboard agent availability implemented

- The 2026-08-13 owner requirement is now implemented on the live local
  Paperclip instance without an upstream upgrade or database migration.
- Dashboard `Agent availability` projects the existing durable company
  admission controller as `ON`, `DRAINING`, `OFF`, and `REOPENING`. OFF admits
  no new runs, lets current runs persist their final handoff, automatically
  settles to restart-safe maintenance, and records deferred work. ON follows
  the evidence-gated reopen path and replays only still-eligible wakes.
- Live readback at completion remained `ON/open` with zero active and zero
  deferred runs; the implementation did not turn the company off or create an
  application task. Shared/server/UI typechecks, admission tests `11/11`, UI
  tests `2/2`, browser verification, workspace-boundary audit, and strict
  runtime-topology audit pass.
- The broad OpenAPI route parity test still reports pre-existing unrelated
  route debt in concurrent supervision, deliveries, assignment proposal, and
  project-truth changes. The new availability and admission-control paths are
  documented and were not among its missing routes.

### 2026-08-13 - Persistent dashboard agent-availability switch requested

- Conversation requirement: implement an owner-facing dashboard switch suited
  to a laptop that is routinely shut down before work.
- The required semantics are graceful and persistent: OFF lets current runs
  finish and lets them persist outcomes/follow-up task definitions, but forbids
  all new run starts. ON revalidates and safely replays only still-eligible
  deferred work. OFF survives Windows and Paperclip restarts.
- This is recorded for later implementation; no live admission state was
  changed and no Paperclip issue or agent run was created in this capture.

### 2026-08-13 - Project-neutral dispatch and systemic repair rule

- Owner directive: every observed failure requires both immediate lane recovery
  and repair of the reusable cause, with regression prevention where practical.
- Roost does not require a bespoke implementation starter. The canonical local
  starter already evaluates Soar, Roost, and Featherly through one shared
  eligibility path; a report that Roost had no valid non-routine starter meant
  its live issue inventory contained no eligible assigned `todo`/`backlog`
  candidate at that moment, not that Roost needed different orchestration.
- The current repair removed the dirty-Paperclip global mutex, made review
  dispatch project-scoped, and immediately retires a review intervention when
  its selected issue hits an execution-quota hold so another issue/project can
  be selected. Regression evidence: native supervision 19/19 and adapter
  authorization 7/7; live evidence includes Featherly commit `fb37765`, Roost
  commit `846cd319`, and admitted Soar implementation run for `LUC-2588`.

### 2026-08-10 - Holistic quota-hold hardening

- Owner directive: use the provider-token outage to repair the Softwarehouse
  holistically, but create no Paperclip tasks and dispatch no agents.
- The live instance was safely restarted on strict `3200`/`54329`; false agent
  errors from policy quota holds, zero-cost subscription telemetry, and
  non-privileged Windows runtime ownership were repaired and regression-tested.
- A dedicated read-only quota-hold snapshot now keeps all three application
  truth sources and the Roost bridge fresh while forbidding lane creation,
  mutation, protected delivery, and dispatch. It reports 0 created tasks and 0
  dispatched runs.
- Extension utilization passes 12/12 at 100%. Outcome integrity and autonomy
  graduation remain honestly fail-closed; no missing historical evidence or
  acceptance was fabricated. Durable report:
  `docs/status/2026-08-10-holistic-readiness-hardening.md`.

### 2026-08-10 - End-to-end completion gate for additional capabilities

- Owner directive: inspect all additional Paperclip solutions for actual use,
  repair what is partial, and never leave newly created mechanisms unfinished.
- The capability contract now requires four complete dimensions: implemented
  contracts, a real operating consumer, live LuckySparrow evidence, and
  inspectable tests/documentation. File, route, screen, routine, or endpoint
  existence by itself is not completion.
- `softwarehouse/extension-utilization-registry.json` inventories 11 major
  extensions. `pnpm softwarehouse:extension-utilization` enforces 100% and is
  part of every control tick. Partial entries fail closed until repaired or
  explicitly retired.
- The 2026-08-10 live audit found all registered extensions fully wired and
  evidenced. Autonomy remains explicitly `calibrating`: its RECOMMEND envelope
  and zero ungated executions are a safety state, not missing activity.

### 2026-08-10 - Runtime self-service and technical decision routing

- Conversation decision: Codex repairs Paperclip's reusable capability, while
  Paperclip agents retain ownership of application tests, commits, and delivery.
- Laragon removal explained the missing PHP runtime: Composer remained, but its
  launcher referenced a nonexistent `php`. A managed PHP 8.4.24 CLI with the
  Laravel/PHPUnit extensions now lives inside Paperclip's ignored runtime area,
  independently of Laragon and inherited `PATH`.
- A project-runtime helper prefers that sandbox-executable managed PHP,
  discovers WinGet PHP as fallback, and can start Docker Desktop on demand with
  bounded daemon readback.
- Paperclip itself proved the repaired Featherly lane: the exact AdminLoginTest
  passed 3 tests and 18 assertions with a process-scoped, non-persisted APP_KEY.
- The in-review decision path now distinguishes reversible technical review
  from protected owner decisions. Agent-created technical interactions are
  returned to autonomous specialist handling; push/deploy, secrets,
  production, destructive action, money/legal/privacy, material product scope,
  and owner acceptance remain fail-closed.
- The updated bootstrap instruction was synchronized to all 39 managed agents.

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

### 2026-08-08 - Stabilization completed and canary failed closed

- The installed Paperclip remains on `0.3.1`; no upstream update was needed or
  attempted.
- Company naming, 39 agent configurations, safe sandbox defaults, and the
  canonical routine matrix converged. Eight routines are active and 29
  overlapping definitions are archived.
- Current project-truth indexes were rebuilt for Soar, Roost, and Featherly.
  Product-aware classification now prevents generic credential/secret and
  robots/order/strategy text from inventing Exchange/Trading work in
  non-trading products.
- The three application repositories now keep only bounded project-specific
  guidance; Paperclip owns organizational roles, coordination, and durable
  memory. The resulting cleanup commits are Soar `9ba70cc5f`, Roost
  `4a230f02`, and Featherly `8d1fce1`.
- A stale Soar canary for LUC-1972 attempted an unsafe cross-baseline
  integration. Its partial changes were rejected, the repo was restored clean,
  and the stale lane plus redundant recovery lanes were cancelled.
- Final health, agent settings, workspace-boundary, runtime-topology, and
  restore-drill checks pass. The durable closeout is
  `docs/status/2026-08-08-softwarehouse-stabilization-closeout.md`.
