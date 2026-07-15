# Active Mission

## 2026-07-04 Stage 1 Hard Delivery And Company Proof

Paperclip is now being used as the operating control plane for a practical
proof of LuckySparrow as an autonomous softwarehouse. Stage 0 setup is
historical. Current work is active Stage 1 delivery until Soar and Roost are
usable on VPS and Stage 2 can be considered.

## Hard Delivery Parent

- `LUC-25`: `00 General: Deliver Soar and Roost to Usable VPS Production`.

Critical children:

- `LUC-26`: delivery control.
- `LUC-27`: Soar build-to-production execution.
- `LUC-28`: Roost build-to-production execution.
- `LUC-29`: technical implementation routing and repo execution.
- `LUC-30`: VPS/Coolify deployment execution path.
- `LUC-31`: production readiness verification.
- `LUC-32`: security, secrets, and production safety gate.

Do not allow `LUC-25` to close for plans, preflight reports, or task-tree
creation. Done requires Soar and Roost to be created, verified, deployed to
VPS, and usable by the owner.

## Mission Interpretation

This goal is not only about two apps. It is the first full-company proof that
Paperclip agents can behave like a human softwarehouse:

- clear role ownership;
- top-down delegation and parent/child traceability;
- local implementation and review;
- evidence-based QA;
- safe deployment discipline;
- least-privilege secret and tool access;
- owner-facing Polish escalation through AIA;
- PDCA learning at individual, department, and company levels.

Agents should not stop at blockers by default. If a blocker can be converted
into safe executable work, create/route the next child issue. Escalate to the
owner only for genuine direction, risk, money, secrets, destructive
infrastructure, legal/customer commitments, or LIVE trading/order proof.

## Active Scope

Active products:

- Soar.
- Roost.

Allowed local workspace roots:

- `C:\Personal\Projekty\Aplikacje\Paperclip_Softwarehouse`
- `C:\Personal\Projekty\Aplikacje\Soar`
- `C:\Personal\Projekty\Aplikacje\Roost`

The parent `C:\Personal\Projekty\Aplikacje` folder is not an agent workspace.
Do not create root helper folders/indexes there, and do not delete or clean
sibling app folders without explicit owner approval.

Active work:

- architecture/source-of-truth checks;
- local implementation and repair;
- tests, review, and evidence;
- documentation/index updates;
- source-control classification and commit/push readiness;
- Coolify/VPS deployment path;
- production smoke/user-flow proof;
- governed learning/procedure updates.

Out of scope unless separately approved:

- marketing, sales, customer service;
- unrelated client work;
- Featherly, Aviary, Nest, and parked products;
- broad HR;
- executive proxy decisions;
- paid GitHub/cloud features;
- destructive infrastructure actions;
- raw secret exposure or secret value mutation;
- legal/customer/finance commitments;
- LIVE trading/order proof.

## Active App-Factory Core

- `00 AIA`, `01 CSO`, `02 CPO`, `02 UID`, `02 UXW`, `02 WPM`, `04 COO`,
  `04 DPM`, `04 DSM`, `06 AIM`, `07 CFO`, `08 CAO`, `09 CTO`, `09 TSA`,
  `09 EDL`, `09 CBE`, `09 FEW`, `09 DBE`, `09 IDE`, `09 RTE`, `09 TAE`,
  `09 QVE`, `09 CRS`, `09 DRE`, `10 CLO`, `10 SPA`, `11 CINO`, `11 IPM`,
  `11 SPM`, and `11 RPM`.

Paused/out of scope unless separately approved:

- `03 CRO`, `05 CCO`, `05 CSM`, `06 CHRO`, `06 POP`, `11 APM`, `11 FPM`,
  `11 NPM`, and `12 CEO`.

## Current Goal/Routine Posture

Goals:

- `00 General: v0 Softwarehouse Readiness - Achieved` is historical.
- `00 General: Stage 1 Softwarehouse Delivery to VPS` is active.
- `11 Innovation: Soar Delivery to Usable VPS Production` is active.
- `11 Innovation: Roost Delivery to Usable VPS Production` is active.

Routines:

- 9 bounded Softwarehouse controller/governance routines are active.
- 10 broad legacy department review or controlled-dry-run routines are
  intentionally paused because their useful duties moved into the bounded
  continuation, autonomy, gate-freshness, longevity, janitor, learning,
  backup, and governance controllers.

## Durable References

Read these first for current work:

- `.agents/state/softwarehouse-stage1-delivery-foundation.md`
- `.agents/state/current-focus.md`
- `.agents/state/softwarehouse-v1-goals-routines-audit.md`
- `.agents/state/softwarehouse-complementarity-audit.md`
- `.agents/state/softwarehouse-agent-role-readiness-audit.md`
- `.agents/state/softwarehouse-autonomous-delivery-architecture.md`
- `.agents/state/softwarehouse-task-lifecycle-contract.md`
- `.agents/state/softwarehouse-owner-interface-contract.md`
- `docs/softwarehouse/17-knowledge-governance.md`

Historical Stage 0 baseline remains in:

- `.agents/state/softwarehouse-stage0-foundation.md`
- `.agents/state/softwarehouse-v0-readiness-audit.md`

## 2026-07-10 v0 Closure Checkpoint

Current durable v0/v1 feature index:

- `docs/softwarehouse-v0-v1-solution-index.csv`.

Use this CSV before broad Paperclip/Softwarehouse work. It records the
requested and inferred mechanisms, whether each is implemented/partial/pending,
the current source of truth, evidence, open gap, and next owner/action.

Latest verified state from the 2026-07-10 control sweep:

- Paperclip and Roost worktrees were clean after source-control closure; Soar is
  currently dirty because active Paperclip agents produced LUC-252/LUC-253 task
  evidence and module docs that still need source-control classification.
- Soar protected auth smoke evidence was committed in the Soar repo as
  `50b9ebe4 docs: record protected auth smoke evidence`.
- Paperclip unblock packet refreshes were committed as `f5ac4b85` and
  `31c270ae`.
- The control loop was corrected so acceptance-ledger blockers outrank new
  architecture backlog wakeups. `LUC-228` is now active with `10 SPA` for the
  owner-login verification path. Architecture seeders/materializer must emit
  `noop_acceptance_ledger_gaps_before_architecture_*` while the acceptance
  ledger is red.
- `LUC-25` remains blocked by design until Soar and Roost are owner-usable on
  VPS with inspectable proof.
- Current v0 blockers are not missing Coolify metadata anymore. The acceptance
  ledger now counts the latest redacted test-account proof as PASS, but still
  blocks on Soar source-control dirt, missing current owner-login proof, and
  `workers-market-data:exited:unhealthy` from the Coolify resource ledger.

Do not claim v0 as complete until the acceptance ledger records these proofs
or the relevant owners explicitly classify them as not required with evidence.

## 2026-07-13 Current Closure Lane

- Source-control closure is complete and locally committed across Paperclip,
  Soar, and Roost; LUC-759 is done with typed evidence.
- The current Soar acceptance ledger passes public reachability, owner login,
  test-account evidence, and source-control cleanliness. Its only resource
  health blocker is `workers-backtest:exited:unhealthy`.
- `LUC-910` is the single active DRE-owned LUC-25 child for that resource. It is
  bound to the active `11 Innovation: Soar` project and primary Soar workspace.
- Governance and gate-watching are no longer serialized on CTO: autonomy is
  owned by 11 IPM at minutes 02/32, continuation by 11 IPM every five minutes,
  and gate freshness by 04 DPM at 17/47.
- LUC-25 remains blocked until current provider readback proves Soar/Roost
  owner usability and the credential-rotation/provenance gates are resolved;
  reports and issue volume do not satisfy that condition.

## 2026-07-13 Closure Convergence Controls

- Treat the LUC sequence as history, not WIP. The 2026-07-13 readback found
  only 13 non-terminal issues among 450 visible issues.
- Recurring Softwarehouse/Soar routines use `reuse_idle_issue`; their canonical
  execution issue returns to `todo` after a successful cycle, including when
  an agent marked that cycle `done`.
- Gate freshness uses stable credential-material metadata only. Secret access,
  resolve, or binding bookkeeping must not dirty canonical status artifacts or
  wake protected lanes.
- Identical v1 learning signatures have a 24-hour cooldown and are compared
  against terminal learning history before a new issue may be created.
- Prefer the two concrete app-completion proof lanes over another governance
  report when no real production/security blocker prevents them: LUC-895 for
  Roost and LUC-902 for Soar.
- Count `routine_execution` runs as controller WIP, not productive WIP, when
  deciding whether an independent app-completion lane may start. Keep unknown
  run provenance blocking. LUC-895 and source-control sidecar LUC-926 are done;
  Roost proof bundle commit is `36df18e7`. LUC-902 is now the current productive
  TAE lane.
- Worker-backlog and learning fan-out must treat an active leaf-worker issue as
  a healthy closure path. Do not recreate cancelled LUC-921/LUC-922 or their
  downstream LUC-924/LUC-925; LUC-902 is the retained canonical Soar proof.
- LUC-25 remains blocked until owner-usable VPS evidence exists; convergence
  reduces control noise but does not waive credential rotation or production
  provenance requirements.

## 2026-07-14 Constructive Audit Checkpoint

- LUC-1129 and parent LUC-1125 are done after live Spark-lane quota recovery;
  low-risk recovery may continue when the standard lane is critical, while
  protected high-risk work remains gated.
- The managed fast-path variable is `LUCKYSPARROW_SOFTWAREHOUSE_ROOT`; all 39
  agent primary and cheap profiles have it, the legacy reserved key is absent,
  and protected bindings are preserved by merge semantics.
- Roost current project truth has 46 product boundaries and 34 gaps.
- Soar current project truth has 86 product boundaries and 77 gaps; Account
  access is 9/9 ok after LUC-1132 browser proof was linked as test and document
  evidence. Public web/build-info/API health/readiness probes pass.
- LUC-25 remains blocked by design until owner-usable VPS evidence closes the
  remaining product truth and security gates. LUC-972 credential rotation is
  still an explicit owner/security operation, not an autonomous workaround.
- Quota recovery is now an early control-tick invariant: an error-state
  `codex_local` agent may return to `idle` only when it has no live run, the
  primary probe fails specifically on quota, the standard lane is critical,
  and a live Spark probe passes. Six controller agents were safely recovered
  on 2026-07-14; their persistent profiles and protected bindings were not
  changed.
- The router's structured quota fallback must control the effective adapter
  profile even when a routine supplied a stale technical wake profile. Explicit
  issue overrides remain stronger. Treat `router=spark` with `applied=cheap`
  as a runtime regression, not acceptable observability drift.

## 2026-07-14 - Post-Reset Fan-out Containment

- OpenAI standard weekly quota reset to 0% used and strategic/light model
  profiles resumed with matching effective runtime metadata.
- The post-reset burst exposed unsafe shared-workspace decomposition: LUC-1118
  and LUC-1141 created LUC-1142 through LUC-1145 while Paperclip, Soar, and
  Roost already had unresolved dirty packets. Some product work also inherited
  the Softwarehouse project/workspace.
- Those lanes are cancelled with recovery actions resolved and no surviving
  target runs. Their filesystem output is preserved for source-control review.
- Worker fan-out now refreshes canonical Git truth and fails closed when any
  controlled repository is dirty. Product children must use their product
  project/workspace; accounting, review, queue, and governance children cannot
  mutate code without an exact module/behavior/test contract.
- Close dirty packets serially: Paperclip first, then Soar, then Roost. Do not
  resume app-completion writers until each preceding primary repo reads clean.
- Local Codex environment probes no longer require `sh` on Windows, and quota
  reset messages are a recoverable warning rather than a generic runtime
  failure. Plugin tool registration also carries the installed plugin database
  UUID end to end.
- Agent error-state repair is per-agent and fail-closed: no live run, that
  agent's own environment probe must pass, and warnings/errors remain untouched
  for the stricter quota/auth recovery path. LUC-1148's broader reset was
  cancelled before commit.
- Source-control packets containing code, scripts, dependency files, or
  unclassified paths route to `09 CRS`; PM remains the default owner for pure
  docs/state/evidence closure. This unblocks the mixed Soar packet without
  weakening validation.
- Source-control candidate matching canonicalizes project aliases such as
  `11 Innovation: Soar` to `Soar` before matching the sidecar title and model
  owner. Existing blocked sidecars must be resumed before a later project gets
  a new closure lane.
- Agent startup reads must remain bounded. Append-heavy product state files can
  exceed one megabyte; agents inspect size, read at most the first 200 lines for
  files above 250 KB, then search exact issue/path/capability context instead of
  dumping several history files into one prompt.

## 2026-07-14 - Closure Audit and Serialized Control Recovery

- LUC-1151 and LUC-1152 are done with typed focused evidence. Their Roost and
  Soar documentation/truth outputs are preserved as dirty product packets and
  must pass sequential CRS classification, validation, and commit disposition.
- Repair only evidence-proven stale state. LUC-1113 may drop cancelled
  LUC-1148 after its fresh completed triage; unresolved blockers must remain.
- Restore reusable controller issues serially after successful recovery:
  LUC-770 first, then LUC-912 after the first wake is terminal. Do not wake both
  controllers or start product mutation in parallel.
- The credential rotation chain rooted at LUC-972 is genuine protected work,
  not stale board state. LUC-25 and its dependent production readiness issues
  remain blocked until rotation and inspectable production proof are complete.
- A board that is temporarily quiet while a dirty source-control packet or
  protected gate is being reconciled is acceptable; repeated status-only
  recovery without a new executable action is not.
- LUC-770 and LUC-912 are back on normal reusable `todo` cycles with no active
  recovery action. LUC-1113 is done after a successful real repair run.
- Soar's LUC-1152 packet is committed as `66be3fb02` and the repo is clean.
  Roost's LUC-1151 packet still requires its own serial source-control closure.
- A newly created issue must receive one assignment wake only; creation-time
  provenance belongs in its description, not a second assignee-waking comment.
- Source-control review must remain bounded: stat/numstat first, focused
  authored diffs, and generator plus summary proof for large generated groups.
- Product-truth dispatch must also stop while `Paperclip_Softwarehouse` is
  dirty. Close the operating-repo packet first; the guard clears automatically
  after commit. Exact product searches must avoid repository-root scans of
  generated state, history, status, and graph trees.
- Soar is clean at `d17dda34b` after LUC-1158. Close Roost next. Redaction
  checks must use a repo scanner or high-confidence signatures with capped
  file-name/count output; never scan generic secret words or full generated
  diffs.

## 2026-07-14 - Roost Truth Closure and Workspace Boundary Hardening

- Roost source-control closure completed as `b265ee07`; the follow-up LUC-1160
  corrected the residual LUC-1151 task-status mismatch and is committed as
  `a7bb56d4`. The affected task and completion-evidence rows now index as
  `verified`, and Roost is clean.
- LUC-1160 exposed a real execution-boundary defect: a run assigned to Roost
  edited a Paperclip tool and closed before either touched repo had a commit.
  The retained parser fix is valid, but future runs must treat their assigned
  `cwd` as the write boundary and route cross-repo changes through a linked
  target-project issue.
- Generated JSON/CSV reads now have byte-aware limits. A line-count cap alone
  is insufficient for wide records; agents must parse one exact record, select
  only needed fields, truncate strings to 4 KB, and keep command output below
  50 KB unless a larger artifact is explicitly required.
- The structured task-status parser is executable and tested. It prefers
  `Status`, then `Mission Status`, then `Reality status`, and only then uses
  free-text fallback. The focused gate suite passes 161/161.
- All 39 live instruction bundles contain the new read and write-boundary
  contracts. Instruction and runtime-file audits pass with zero warnings or
  missing paths; Coolify bindings remain unchanged after synchronization.
- OpenAI weekly usage currently reads about 9%, with no quota incident and no
  error-state agent. This permits normal productive dispatch; it does not waive
  protected production, credential-rotation, or owner-usability evidence.

## 2026-07-14 - Hard Delivery Readiness Correction

- Product-local readiness and hard-parent delivery readiness are separate
  truths. The softwarehouse may supervise and execute local Soar/Roost repair,
  tests, documentation, and commit closure while protected production delivery
  remains unavailable.
- Resolve the complete `blockedBy` graph rooted at LUC-25 before reporting full
  delivery. The current live graph converges through LUC-448 and LUC-494 on the
  protected LUC-972 credential-rotation leaf.
- LUC-972 must remain visible in readiness and the operator action packet until
  it has a terminal, evidence-backed disposition. Do not infer completion from
  clean repositories, passing local tests, or successful unprotected smoke.
- Graph traversal is bounded and fail-closed. A failed detail read or truncated
  graph blocks protected delivery but does not prevent independent local repair
  lanes from making useful progress.
- Readiness must remain `twoProjectFullDeliveryReady: false` and deny push,
  deploy, restart, and protected smoke while this leaf is active.

## 2026-07-14 - Status-Only Enforcement And Current Product Packets

- Status-only recovery is now a technical adapter boundary, not merely prompt
  guidance. A complete status-only context runs Codex in a fresh ephemeral
  read-only sandbox with bypass and writable-directory overrides removed.
- Stored Codex transcripts clip oversized command output at a configurable
  per-event cap while preserving JSONL structure, final messages, and the full
  in-process output used by the adapter parser.
- LUC-1166 produced a focused Soar proof-link packet for `USE /admin`; the test
  gap is closed and the route now advances to docs ownership. LUC-1169 produced
  the equivalent Roost packet for `USE /clients`.
- Both product packets require serial source-control classification and local
  commit disposition before another writer may use the corresponding repo.
  Generated truth churn is acceptable only with focused authored diffs,
  passing generators/tests, and bounded transcript evidence.
- The live audit has no quota, instruction, runtime-file, boundary, or duplicate
  instance failure. LUC-972 remains the genuine protected leaf preventing full
  production delivery and must not be bypassed by local proof work.

## 2026-07-14 - Current Constructive Dispatch State

- Soar is clean at `46be1df4e`; Roost is clean at `acb8bfca`; the operating
  repo must remain clean before product dispatch.
- Recurring `routine_execution` issues are controller cadence, not product
  backlog. Their schedules remain active, but local repair and the autonomy
  governor must not select them in place of a worker or blocked-triage lane.
  Refresh source-control truth before asking the governor to choose that lane.
- The next legal non-production action is one blocked-triage lane for
  `LUC-1161`. It must classify the residual `/assets` evidence linkage and
  produce at most one owner-scoped next action. `LUC-1165` follows only after
  that root has an honest disposition.
- `LUC-972` remains the only protected owner/security leaf for hard production
  completion. Do not push, deploy, restart, run protected smoke, or disclose
  credentials until its evidence-backed terminal disposition exists.

## 2026-07-14 - Root Blocker Progression Rule

- Blocked-triage creation is a single-writer operation. Concurrent watchdog or
  selector cycles must reuse an exact-title open lane instead of creating a
  sibling, and all recurring routine issues remain controller cadence rather
  than product backlog.
- Select the blocked issue that is its own `rootBlocker` before any dependent
  issue. The live proof moved `LUC-1161` through architecture and test-evidence
  reconciliation before closing dependent worker-fan-out work.
- Current product flow is constructive: Roost `LUC-1174` has a dedicated
  source-control closure `LUC-1180`, while Soar `LUC-1175` waits behind the
  same Documentation Steward owner. Preserve one-agent-one-active-lane and let
  the queued Soar packet start only after the Roost writer closes cleanly.
- Keep fresh quota telemetry separate from cached subscription cost truth. A
  transient provider probe failure is not proof of quota exhaustion and must
  not erase the last known reset/use window; retry after load drops.

## 2026-07-15 - Current Audit Handoff

- Roost source-control closure is complete and the primary repo is clean at
  `a20a575f`. Soar `LUC-1175` produced a focused packet whose generated truth
  changes must pass the existing Soar source-control closure lane before any
  new Soar writer is dispatched.
- Costs may display a last-known-good quota window for at most one hour when a
  live provider refresh fails. It must show `stale`, the observation time, and
  the refresh warning. This display fallback is never a scheduler, secret,
  security, push, deploy, restart, or protected-smoke authorization.
- Live Codex quota recovered at 17% weekly utilization. Continue model-aware
  local work, but keep the hard production parent blocked until protected leaf
  `LUC-972` has real terminal evidence.

## 2026-07-15 - Constructive Audit And Runtime Health

- The board contains 701 issues: 669 done, 20 cancelled, six reusable control
  issues in `todo`, and six blocked issues. The blocked graph still converges
  on the single protected credential-rotation leaf `LUC-972`; there are no
  duplicate open titles or current error-state agents.
- Soar is clean at `6f3685ef0`; Roost is clean at `20e0759c`. Recent product
  work followed the intended proof -> source-control closure -> local commit
  chain without unrelated repository mutation.
- All 39 managed agent instruction bundles, runtime file references, role/model
  settings, and workspace boundaries pass their audits. Weekly subscription
  use is about 20%; all 39 Codex agents retain a `gpt-5.4-mini` cheap fallback.
- Heartbeat history now selects bounded run IDs before reading large result
  JSON and has a `(company_id, created_at)` index. The live default 20-row
  request measures 127-170 ms instead of timing out above 20 seconds.
- The dev runner now resolves the same configured port as the server. Exactly
  one listener serves port 3200, `dev:list` reports port 3200, and the official
  `dev:stop` releases that listener cleanly.
- Historical failed runs remain visible rather than being erased. In the latest
  200, 35 were an earlier quota incident; two process-loss failures were caused
  by this controlled restart and entered the normal retry path. Current live
  audits report no persistent error agent or duplicate runtime.
- Residual repository tooling debt: the Drizzle snapshot graph has a historical
  branch collision between the 0095 and 0098 snapshots. Migration 0100 is
  idempotent and passes migration validation, but snapshot-history repair must
  be handled separately before relying on `db:generate` for the next schema
  change.
