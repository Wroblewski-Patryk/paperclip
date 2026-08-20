# Paperclip Project Journal

Last updated: 2026-08-16

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

### 2026-08-16 - Quota-held execution and restart deadlock repaired

- A durable queued run for LUC-2284 remained unstarted for hours, repeatedly
  blocked controlled restart, and timer wakes kept polling an already linked
  pending approval. The dead run and the exact execution wave admitted before
  the safety hold were dispositioned without deleting their issues or evidence.
- Restart readiness now distinguishes running work from durable queued work:
  queued runs remain visible but only running processes block a controlled
  restart. Work-aware timer selection also excludes in-review issues whose
  linked approval is pending or revision-requested.
- The provider exposed a 96% `codex_standard` weekly pool while the model
  router selected newer `cheap`/`light` lane names. The quota gate now treats
  the default Codex pool as fail-closed for every profile lacking a freshly
  reported independent quota window. Both short and long owner thresholds are
  persisted at 75%.
- Live proof after a full strict-port restart: availability is ON/open, health
  reports zero queued/running/restart-blocking runs, and four replay attempts
  became `scheduled_retry` with `provider_quota_hold` (`96%/75%`) until the
  provider reset, without starting an agent or creating a false agent error.
- Dev-service control now discovers the repository-managed runtime home when
  `PAPERCLIP_HOME` is not inherited. Raw `pnpm dev:list`/`dev:stop` and the
  Windows startup scripts therefore address the same singleton service instead
  of leaving a healthy but operationally invisible process.
- Targeted regressions, repo-wide typecheck, build, workspace-boundary audit,
  and runtime-topology audit pass. The ordinary and DB portions of the broad
  test runner passed before its remaining multi-hour serialized shard was
  intentionally stopped and not represented as a complete `test:run` pass.

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

### 2026-08-16 - Relational assurance, quota-safe host control, and root hygiene

- Owner directive: audits must be relational and repeatable, show what was
  checked and when, prevent incomplete feature work from appearing complete,
  and leave the workstation and repositories free of disposable files and
  processes.
- `softwarehouse/extension-utilization-registry.json` is the canonical
  Softwarehouse capability assurance graph. Schema v2 covers 13 extensions,
  including Decision Center, declares required capability/consumer relations,
  and fails closed on malformed or failed dependencies. The generated report
  records one `checkedAt` instant plus local and dependency-propagated results.
  The live audit passed 13/13 at 100% after implementation.
- The file-level architecture graph remains complementary detail rather than a
  competing completion index. Curated registry, relation, workflow, test, and
  chain rows now represent the capability-assurance mechanism; Paperclip's
  derived architecture/project-truth exports were refreshed from current
  source.
- A host scheduler defect allowed the full mutating control tick to run while
  provider quota was above the owner's 75% hold. The host now chooses the
  read-only quota-hold snapshot at or above threshold and fails closed when the
  quota state cannot be established. Normal control resumes automatically only
  after quota evidence falls below threshold. The current 98% state therefore
  creates no tasks and dispatches no runs.
- Temp hygiene now audits narrowly named, old, untracked disposable files in
  the repository root as well as owned OS-temp resources. It rejects tracked
  files, reparse points, escaped paths, live-process references, and excessive
  candidate counts before deletion. Forty old logs, request bodies, snapshots,
  Coolify browser/cookie captures, and closeout scratch files were removed.
- Strict configuration, agent instruction/settings, runtime-file,
  operating-standard/docs, workspace-boundary, runtime-topology,
  cross-project-isolation, documentation, and product-intent audits pass. The
  strict outcome audit intentionally remains red for historical evidence debt:
  10 of 189 recent done issues lack modern typed evidence. Do not fabricate
  retroactive proof; enforce the modern gate on new work and retain the old
  debt as an explicit empirical limitation.

### 2026-08-20 - Restart recovery and assurance false-positive closeout

- After a workstation restart, `dev:list` exposed a dead registered PID as a
  running Paperclip service even though port 3200 was closed. The dev-service
  operator now removes dead registry records before listing or stopping; the
  regression test verifies that live records survive and stale records are
  deleted. The canonical start script then restored the singleton instance on
  ports 3200/54329 and the persisted queued runs resumed.
- The extension assurance graph incorrectly required
  `restartBlockingRunCount=0` even when no restart was pending. Productive agent
  runs are now accepted while `restartRequired=false` and
  `waitingForIdle=false`; an actual pending restart remains a failure.
- Architecture lifecycle refreshes could falsely fail when a large relational
  project-truth report overflowed Node's default child-process output buffer.
  All three bounded generator subprocesses now use an explicit 64 MiB ceiling;
  a forced Paperclip refresh completed with zero missing or stale exports.
- Cleanup removed 93 validated, process-unreferenced test directories left by
  the interrupted 2026-08-16 full test run, including eight safely unlinked
  test junctions. Canonical application roots and the active Featherly task
  staging directory were preserved.
- An empty owner Decision Center queue is now treated as a healthy state while
  still validating the response contract. Capability assurance therefore does
  not invent a failure merely because all owner decisions were resolved.
- The native host control tick recovered after restart and completed with zero
  failed steps. Its remaining `operating_source_control_closure_needed` posture
  correctly represented this intentionally uncommitted audit work.
- A concurrently produced source-control capability preflight was completed
  and made race-safe: it uses a unique owned probe under `.git`, removes only
  that probe, preserves another process' `index.lock`, and routes sandboxed git
  metadata work to the native executor instead of repeating impossible runs.
- The full stable verification exposed and closed two cross-layer contract
  gaps: legacy issue-service fixtures now respect executable-owner and
  first-class-blocker invariants, and both AIA Decision Center mutation routes
  are represented in OpenAPI. The general/UI/CLI/DB/package groups passed, all
  167 serialized server suites were covered, and the corrected issue-service
  file passed 66/66 before the remaining 47 suites completed green.
- Stable Vitest runs now place `TEMP`, `TMP`, `TMPDIR`, and `PAPERCLIP_HOME`
  under one exact `pcvt-*` root and remove that owned physical root in a
  `finally` block. The deletion guard rejects escaped, malformed, or reparse
  roots. Immediate hygiene can explicitly include only narrowly named recent
  test artifacts, while all junction targets must remain inside the temporary
  root or this repository and are verified before and after unlinking.
- Cleanup permanently removed 732 validated, process-unreferenced stale test
  roots and safely unlinked 237 test junctions. One newer runtime fixture was
  left in place after Windows reported a live file lock; investigation proved
  that an orphaned test HTTP process, not the canonical Paperclip service,
  owns that lock. Do not broaden or force deletion without exact process
  disposition.
- A controlled live restart exposed an unbounded `migration-status` child:
  the dev-runner PID remained alive while port 3200 stayed closed. Pnpm
  preflight commands now support a bounded deadline, terminate only their
  owned Windows PID tree on timeout, and classify migration-status timeout as
  exit 124 instead of hanging the singleton indefinitely.
- Post-commit live proof completed on the canonical instance: the next
  scheduled host control tick ran its full 51-step path with `ok=true` and no
  manual invocation. The queue moved from seven to five waiting runs while a
  Softwarehouse run and a Featherly/QA run executed in parallel, proving that
  persisted quota-held work advances under the configured one-run-per-project
  WIP limit. The resulting `project_source_control_closure_needed` decision is
  a governed application/repository follow-up, not a failed control plane.
- Standard temp hygiene reports zero stale candidates. The expanded recent
  audit still identifies the exact locked fixture
  `paperclip-runtime-sibling-34OgM7`, owned by orphan test PID 37328, plus
  disposable same-day test roots. Because Windows rejected the first deletion,
  leave that process and fixture untouched until the owner explicitly
  authorizes exact termination and a fresh validated cleanup.
