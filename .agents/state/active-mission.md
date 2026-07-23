# Active Mission

## 2026-07-23 - V0 Accepted; Credential Incident Closed - Current

- Local Softwarehouse V0 is achieved. `LUC-25`, Soar delivery, Roost delivery,
  the two-project readiness contract, local runtime/topology checks, and the
  final autonomous handoff proof are complete. Paperclip remains local on
  Windows; moving it to VPS and activating the wider autonomous business are
  V1 and are not part of the current local scope.
- The last protected security hold, `LUC-972`, is complete under approval
  `1f7d1a94-2759-4ffd-81e0-35634c05865a`. Seven Coolify/Soar/Roost
  token/password families advanced to fresh Paperclip secret versions. Both
  old Coolify API tokens were revoked, old Soar/Roost passwords were rejected,
  and post-rotation access smokes passed without a deploy, restart, or source
  push. Raw values were never written to evidence or source.
- Durable operator:
  `scripts/rotate-luc-972-credentials.ts`. Its LUC-972 work product is
  `077a3069-32fb-419e-b081-12cb839c50a9`.
- Paperclip automatically resumed `LUC-496`, `LUC-494`, `LUC-1137`, and the
  autonomy governor after the protected gate closed. Let those agents
  synthesize and close their evidence rather than manually duplicating work.
- Local product maturation is now active. The three completed Stage 1/hosted
  product delivery goals are `achieved`. `LUC-1787` is the live Soar-first
  sale-readiness contract/gap-register parent under goal
  `45d5d36a-8f83-4571-a9ac-bfd20a8bf9b1`; `LUC-1788` and Roost goal
  `4c1390fd-d09a-45a3-9cfa-8aa9745f8988` are serialized behind it. Both
  products remain in `11 Innovation`. Do not activate sales, marketing,
  customer outreach, broad provider writes, or hosted Paperclip until the
  separately governed V1 transition.

## 2026-07-22 - Roost Knowledge Plane Direction Activated - Current

- The owner confirmed the target boundary: Paperclip is the governed control
  plane for agents and execution; Roost is the central company knowledge and
  management plane used by humans and Paperclip agents through scoped API/MCP.
  Product repositories remain authoritative for product architecture, code,
  tests, deployment contracts, and actual behavior.
- Roost should consolidate ClickUp and Google Drive through provider-aware,
  bidirectional synchronization with stable IDs, revisions, field authority,
  loop prevention, conflict handling, audit, and loss-aware Docs/Markdown and
  Sheets/CSV projections. Paperclip should consume these capabilities through
  a connector/plugin boundary instead of duplicating every provider integration.
- The owner authorized a bounded local-Paperclip-to-hosted-Roost read-only
  canary as a V0 transition aid. It requires one accountable agent, one
  workspace, TLS, a least-privilege key stored by secret reference, read-only
  MCP mode, cross-workspace denial, blocked-write proof, audit visibility, and
  rotation/revocation evidence. Later write phases remain separately gated.
- This clarification does not reorder current delivery. Soar remains first,
  Roost second, and both remain in `11 Innovation` until a versioned
  sale-readiness contract proves that access can be sold responsibly. The
  integration lane must not become a substitute for product completion.
- Canonical contract:
  `docs/softwarehouse/18-roost-company-knowledge-plane.md`.

## 2026-07-21 - Product Completion Conveyor And Soar-First Closure - Current

- The owner-approved Soar Redis cache-only recovery is complete in `LUC-1553`.
  Public API health/readiness, web, and build-info probes return `200` in the
  QVE evidence attached to `LUC-1556`. Protected `/ready/details`, worker
  readiness, and provider/Redis readback remain separated into the authorized
  DRE/SPA lanes. SPA lacked the required runtime binding and correctly routed
  the managed-reference readback to `LUC-1569`; the explicit chain is now
  `LUC-1569` -> `LUC-1568` -> `LUC-1556` -> `LUC-1559` -> `LUC-1547`.
- `LUC-27` and `LUC-28` had been marked `done` even though their own contracts
  required owner-usable product completion and their last evidence still named
  blockers. They also pointed at the Softwarehouse project instead of their
  product workspaces. They are restored as persistent product-completion
  parents: `LUC-27` is active in the Soar workspace; `LUC-28` is active in the
  Roost workspace and serialized behind the current Roost closure chain.
- `LUC-25` now blocks directly on `LUC-27` and `LUC-28`. Historical reports,
  plans, clean-repo snapshots, and isolated proofs remain evidence, not product
  completion.
- `LUC-1554` completed on 2026-07-22 after its implementation, fresh
  acceptance eval, documentation, and independent source-control review lanes
  completed. The accepted conveyor now dispatches Project Truth work only as a
  runnable blocking child of the matching persistent parent (`LUC-27` or
  `LUC-28`); detached, blocked, and backlog-only copies do not establish
  liveness. The fresh `LUC-1563` artifact proves two automatic handoffs and
  the required early-close, backlog-only, wrong-workspace, dirty-writer, and
  `LUC-1546` regression paths.
- Portfolio sequence is Soar first, Roost second, then the owner's other
  already-started applications according to their established visions. New
  application creation from zero comes only after the company has repeatedly
  proved it can finish existing applications.

## 2026-07-20 - Full Repository Validation And Windows Runner Closure - Current

- The historical SOL-032 shorthand is no longer an active exception for this
  checkout. A fresh, uninterrupted `pnpm test` completed with exit code 0 in
  5,963.8 seconds after all Windows cleanup and timeout repairs were applied.
- Embedded-PostgreSQL cleanup now protects the canonical database dynamically
  from strict port 54329, owns exact fixture PID trees, rescans for late
  reparented `io_worker` children, and requires stable no-listener snapshots.
  Worktree cleanup follows the same ownership rule; the registered Softwarehouse
  stop path terminates its full verified tree.
- Focused stability proof passed three DB iterations (`108/108` active tests)
  and three worktree iterations (`105/105`). Post-run inspection found zero
  test Node processes and zero PostgreSQL processes outside the canonical tree.
- Full recursive typecheck, production build, build-gap typechecks, forbidden
  token and no-git-push policies, `182/182` canonical gate specs, diff check,
  workspace-boundary audit, and strict runtime-topology audit all pass.
- `typecheck:build-gaps` now invokes pnpm portably through Node's active pnpm
  entrypoint, with a verified direct-node Windows fallback. Existing React
  `act(...)`, PostgreSQL NOTICE, platform skip, and Docker-inventory-unavailable
  messages remain explicit non-failing diagnostics rather than hidden passes.

## 2026-07-18 Rolling Worker Queue And Parallel Dispatch - Current

- The owner confirmed Paperclip remains the control plane. Autonomy changes
  should prefer configuration/native extension, then plugins, then a separate
  Roost-backed application layer; LangGraph is not required for the current
  continuity defect.
- Current live proof showed Soar with two runnable worker `todo` lanes and
  three planned lanes, but Roost with four planned `backlog` lanes and zero
  runnable lanes. Historical queue health incorrectly classified both as
  ready because it treated `backlog` as runnable.
- Continuation also used a company-wide live-run mutex even though the local
  lane starter already enforces per-agent and per-project conflicts. The new
  contract permits at most one additional independent project/agent lane per
  watchdog cycle while preserving WIP=1 and same-project serialization.
- The rolling queue target is one runnable worker `todo` and three planned
  worker `todo`/`backlog` lanes per unfinished active track, or explicit legal
  blockers for the missing capacity. Promote existing backlog before creating
  duplicate work.
- The original roughly 7,000-task Paperclip instance was deleted and is not an
  available evaluation dataset. Preserve current issue/run state, managed
  instruction bundles, snapshots, and durable learning evidence accordingly.

## 2026-07-18 Conversation Handoff Audit - Current

- Canonical handoff: `docs/status/2026-07-18-paperclip-v0-conversation-handoff.md`.
- Paperclip health, singleton topology, all three clean repositories, 39 agent
  instruction/settings bundles, nine bounded routines, model routing, quota
  posture, Coolify read access, and Roost public probes pass current audits.
- V0 is not complete. Soar `/ready` returns 503 because production Redis is
  `restarting:unhealthy`; the current Coolify binding can read inventory but
  lacks the narrow deploy permission for the approved one-action recovery.
- Credential rotation `LUC-494/LUC-496/LUC-972` and Soar provenance
  `LUC-507/LUC-448` remain open. Never reproduce credential values; require
  provider rotation/invalidation and managed-ref readback.
- Project truth currently reports 56 Soar gaps and 10 Roost gaps. Classify them
  evidence-first rather than treating every row as a code defect.
- The July 18 control-plane repair is implemented locally: the gate suite now
  passes 178/178, stale protected gates retain owner actions during runnable
  local work, and executive health excludes archived project aliases in favor
  of canonical active Soar/Roost projects. Commit `662d239d` contains the
  repair, and fresh longevity evidence now passes with no findings.
- Backup retention and disposable restore are now proved. On 2026-07-19 the
  latest 532,476,056-byte backup restored into an isolated embedded PostgreSQL
  on a random port, reconstructing 97 tables, 39 agents, 1,473 issues, 5,143
  heartbeat runs, and 770 issue work products. The drill removed its temporary
  database and did not touch canonical ports `3200` or `54329`.
- Current model routing is operational across GPT-5.4 mini, GPT-5.4, and
  GPT-5.5. Spark remains intentionally disabled locally. One observed provider
  weekly window does not prove independent hard caps for every model.

## 2026-07-15 Owner Stage Clarification - Current

- V0 is the current target: Paperclip Softwarehouse runs locally on Windows
  while building, testing, reviewing, documenting, deploying, and verifying
  Soar and Roost on VPS.
- V1 comes after V0 and covers moving Paperclip itself to VPS. The hosted
  control plane will connect with Soar and the wider ecosystem after Roost is
  sufficiently complete for that company layer to be coherent.
- Historical Stage 1 and `LUC-25` VPS-delivery sections below are part of V0:
  their VPS scope applies to Soar and Roost, not to hosting Paperclip.
- Keep product pushes, deploys, restarts, protected smoke, and credential work
  behind their existing evidence and safety gates. These gates can block full
  V0 product delivery without implying that Paperclip itself must already run
  on VPS.
- A tooling defect that prevents safe future local development, such as
  unreliable schema migration generation, is V0 hardening even when current
  runtime behavior still works.

## 2026-07-16 Organizational Orientation Completion Checkpoint

- The company situation now decomposes flow into assigned queue, execution,
  review, human approval, external monitored waiting, and unknown blocked
  waiting; it also reports bottleneck age and per-agent parallel WIP.
- Source-backed organizational observations distinguish outcomes, causal
  findings, external signals, and learning candidates. External signals require
  an explicit freshness boundary. Learning cannot be promoted before validation
  and must name a durable operating target.
- These facts are part of the same `CompanySituation` delivered to dashboard
  and heartbeat context; they do not bypass existing authority or evidence gates.
- Migration 0104 and the new UI/API are active on the local instance. The
  restart waited for the CTO run to end; post-restart readback showed health
  `ok`, six capacity stages, the new observation endpoint and UI route, and zero
  live runs.

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

## 2026-07-16 - Organizational Deliberation And Forecast Baseline

- `SOL-085` is resolved in the repository: the historical 0095/0098 Drizzle
  snapshot branch is linearized, migrations 0101 and 0103 reconcile
  migration-only changes idempotently without dropping project icon data, and
  a repeated `pnpm db:generate` reports no drift.
- Slice 3 of the organizational-orientation plan now has first-class,
  company-scoped assumptions, commitments, and decisions with lifecycle,
  ownership, evidence refs, review/due/expiry timing, and supersession.
- These records are visible to board operators and flow into the same
  `CompanySituation` used in heartbeat context. They do not grant authority or
  bypass approvals, budgets, permissions, or evidence gates.
- Slice 4 has a conservative 30-day historical-throughput baseline with sample
  size, cycle-time percentiles, uncertainty range, confidence label, and explicit
  limitations. It is orientation evidence, not a deadline.
- Restart was deferred while one active run was visible, then completed after
  the run ended. Migrations 0101-0103 are active on the local instance; live
  readback confirms organizational memory, deliberation projection, forecast,
  and heartbeat orientation with zero live runs afterward.

## 2026-07-15 - Dynamic Delivery Gate Classification

- The hard delivery graph under `LUC-25` currently resolves through five
  non-terminal nodes to one protected leaf, `LUC-972`. The leaf is now added to
  the governor's known gate roots dynamically instead of being misclassified
  as an unknown blocked issue.
- The governor must load full issue detail before traversing `blockedBy`;
  company issue-list rows intentionally omit that relationship. Live dry-run
  evidence reports five visited nodes, `LUC-972` as the active leaf, and zero
  unknown blocked issues.
- Known protected leaves remain fail-closed. Their presence must not create
  repetitive blocked-triage work or suppress independent local Soar/Roost
  truth gaps that can be completed without production or credential mutation.

## 2026-07-15 - Constructive Dispatch Live Proof

- A clean control tick dispatched bounded project-truth lanes for both active
  products. Roost `LUC-1187` closed through source-control sidecar `LUC-1190`
  at clean commit `b6d5708e`; Soar `LUC-1188` closed through sidecar
  `LUC-1191` at clean commit `316621541`.
- The next tick continued with Roost `LUC-1192` active and Soar `LUC-1193`
  queued behind the same TAE owner. Preserve this per-project depth of one and
  one-agent-one-active-run serialization while the remaining indexed truth
  gaps are worked down.
- Current full delivery remains fail-closed only at protected leaf `LUC-972`.
  Local evidence, tests, docs, review, and source-control commits may continue;
  push, deploy, restart, protected smoke, and credential mutation may not.

## 2026-07-17 - Capacity and Runtime Hygiene Guard

- Keep local Paperclip capacity bounded: backups at 10 GiB with an 8 GiB free
  reserve, run logs at 5 GiB/14 days, and rotated server logs at 1 GiB/14 days.
- Shared project-primary heartbeats must reuse a compatible session record;
  repeated open rows for the same issue/project workspace are lifecycle drift.
- Preserve current `LUC-1368`; stale Soar worktree recovery evidence is under
  `Soar/.paperclip/recovery/2026-07-17-stale-worktrees/` with 143 refs and a
  manifest. Do not remove those recovery refs until the owner accepts a later
  retention decision.
- A clean restart requires exactly one listener, one registered dev service,
  one server process tree, one embedded database cluster, and no active run
  interruption. `dev:stop` alone is not proof that old child processes exited.

## 2026-07-17 - Singleton Windows Runtime - Current

- The only physical checkouts are the canonical roots for
  Paperclip_Softwarehouse, Soar, and Roost. Soar's final dirty `LUC-1368`
  worktree and three merged Roost worktrees were archived to recovery manifests
  and removed; each repository now reports exactly one Git worktree.
- Paperclip app port 3200 and embedded PostgreSQL port 54329 are strict. A
  direct second server start fails before database initialization instead of
  falling back to 3201 or a second database port.
- The Windows launcher and stopper now use the same registered `dev:watch`
  process tree. The stopper no longer enumerates and kills every repo-related
  Node, PowerShell, Postgres, or esbuild process.
- All 39 agent instruction bundles include the bounded Windows workstation and
  singleton-topology contract. `pnpm run softwarehouse:runtime-topology-audit`
  is the canonical read-only proof and currently passes with one dev service,
  one active project per canonical root, and no fallback listener.
- Current disk reserve is about 50 GiB. The abandoned sibling `Paperclip`
  directory contained only broken `node_modules` and was removed; Aviary and
  WroblewskiPatryk remain untouched.

## 2026-07-17 - Conversation Closure And Remaining Delivery Gates

- The organizational-orientation program, disk-capacity controls, singleton
  checkout/runtime topology, and bounded Windows operating contract are
  implemented and live. They are no longer open work from the owner chat.
- Final live audits pass for runtime topology, workspace boundaries, and all 39
  managed instruction bundles. Paperclip is healthy on strict port 3200 with
  one registered service; embedded PostgreSQL is the only listener on 54329.
- Nine bounded routines are active and firing. The continuation watchdog,
  autonomy governor, gate freshness watcher, longevity controls, and daily
  learning/governance routines reuse recurring issues instead of duplicating
  instances.
- Stage 1 delivery is not merely waiting for elapsed time. Safe work is
  reevaluated by routine and issue-event paths, but protected production work
  remains fail-closed on owner/security facts for `LUC-1368` and `LUC-972`.
  Routines can detect, route, and escalate those gates; they cannot invent
  deploy authority, credentials, or proof of credential rotation.
- Soar's seven local evidence/context changes remain a separate classified
  project-repository lane. Do not mix them into Paperclip source-control work
  or mutate them while protected gates remain.

## 2026-07-17 - Compose Proof And Historical Evidence Continuity

- LUC-659 created a manually named Roost development-mode Compose one-off when
  the canonical production-mode backend was blocked on protected configuration.
  The run later sat silent and was cancelled, but the external container had no
  teardown owner and survived as `roost-backend-luc-659`.
- Temporary health evidence cannot substitute for canonical readiness. Agents
  must use `docker compose run --rm`, preserve the real protected-input blocker,
  and close runtime work with an empty stopped one-off inventory.
- Every control tick now runs a conservative Compose janitor and canonical
  topology audit before quota recovery or dispatch. Only old, stopped,
  mount-free, issue-scoped residue is removed automatically; active, mounted,
  or ambiguous containers fail closed for inspection.
- Historical run transcripts remain readable after the runtime-home move. New
  logs are written only to the active repo-managed runtime root; authorized
  reads may fall back to the same instance's legacy user run-log directory.
  This is read continuity, not a second runtime or duplicated data store.

## 2026-07-18 - Rolling Queue Continuity - Current

- Worker queue health now distinguishes runnable `todo` from reserve
  `backlog`: each active product track targets one runnable worker lane and
  three planned worker lanes without manufacturing a fixed task count.
- One productive run is no longer a company-wide mutex. One additional lane
  may start only when its assignee and project are idle; per-agent WIP=1,
  same-project serialization, source-control closure, and protected gates stay
  fail-closed.
- Live proof: DPM `LUC-1485` delegated the Roost queue gap to its legal owner
  through `LUC-1490`; Roost worker `LUC-1486` entered `in_progress`; and Soar
  `LUC-1451` started while the DPM control lane remained active.
- All 39 instruction bundles, workspace boundaries, and singleton runtime
  topology pass audit. Focused regressions pass 188/188 and the canonical gate
  suite passes 180/180. Repo-wide `pnpm test` exceeded its bounded 240-second
  window and is unverified, not passing.

## 2026-07-19 - Archive-Ready Autonomous Operation - Current

- The canonical Paperclip instance remains the only active instance on port
  3200 with its embedded PostgreSQL on 54329; Paperclip, Soar, and Roost remain
  singleton roots.
- Teams is available at `/LUC/teams`; the legacy `/LUC/teams-catalog` route is
  compatibility-only. The actual backup restore drill is proved and leaves no
  temporary database behind.
- A zero-live-run snapshot between ticks is not itself a fault. The continuation
  watchdog runs every five minutes and has live proof of dispatching product
  work after an idle interval; use the next-legal-action selector to distinguish
  a quiet healthy interval from missing runnable inventory.
- Protected production, credential, deployment, and Soar Redis recovery gates
  remain fail-closed. Their blocked issues are continuing company work, not
  unfinished setup from the archived owner conversation.
- Fresh verification on July 19 passes 182/182 tests in the canonical
  Softwarehouse gate-spec suite, 8/8 rolling-queue tests, 6/6 database-backup
  tests, 25/25 focused server tests, 25/25 focused UI tests, all 28 workspace
  typechecks, and the full build. This is targeted passing evidence, not a
  claim that every repository test passed: a fresh bounded `pnpm test` attempt
  again timed out in the general server group and remains unverified. Its exact
  process tree was terminated and no matching Vitest or temporary Paperclip
  service test process remained.

## 2026-07-20 - Holistic V0 Re-Audit

- Current report: `docs/status/2026-07-20-paperclip-v0-holistic-audit.md`.
- Local Paperclip, roster, instructions, bounded routines, runtime files,
  workspace boundaries, active local secrets provider, budget gates, database
  backups, and isolated database restore proof pass current checks.
- Roost public probes pass. Soar remains not ready: API `/ready` returns 503
  and Coolify Redis is `restarting:unhealthy`. `LUC-1524` and `LUC-972` remain
  genuine protected owner/security gates.
- Project-truth gaps decreased from 66 to 59: Soar 54 and Roost 5. Paperclip
  and Soar have active dirty source-control packets; Roost is clean.
- The longevity doctor routine catalog drift and bounded queue reconciliation
  gap were repaired and covered by the canonical gate suite. The suite passes
  187/187; current UI typecheck and focused company/sidebar/inbox tests pass.
- Database restore is proved, but full-instance restore with uploads/storage
  and the local secrets key remains unproved. Preserve this as a V0 DR gap.

## 2026-07-22 - Local Softwarehouse V0 Scope Correction

- V0 is now explicitly defined as the complete local autonomous softwarehouse
  for creating and finishing applications, not the first implementation of all
  future autonomous-company business functions.
- Paperclip remains on the canonical local Windows runtime in V0. Soar and
  Roost remain the named VPS delivery targets under `LUC-25`, `LUC-27`, and
  `LUC-28`.
- Broad business-plan, CRM, sales, marketing, finance, HR, customer-success,
  provider-write, and external-communication operation is deferred to V1.
- `LUC-1554`, `LUC-1562`, `LUC-1563`, and `LUC-1565` are complete. The next
  legal V0 work is source-control closure for this reviewed packet, followed
  by normal Soar-first Project Truth dispatch under `LUC-27`; Roost continues
  under `LUC-28` when its serialized lane is legal.
- Canonical execution plan:
  `doc/plans/2026-07-22-local-softwarehouse-v0-implementation.md`.

## 2026-07-22 - V0 implementation at protected owner gate

- Soar canonical app-completion and project-truth indexes both report zero
  gaps at clean commit `6bf6f609d`; public `/health`, `/ready`, and Web probes
  return HTTP 200.
- Roost canonical indexes both report zero gaps at clean commit `19b15f5b`;
  `LUC-28` is done with typed production acceptance evidence.
- Paperclip control-plane, topology, workspace, runtime-file, agent settings,
  instruction, and operating-standard audits pass. Source control is clean.
- The greenfield intake and innovation-to-product lifecycle eval passes and
  forbids portfolio activation or commercial transition without an explicit
  owner decision (`86792586`).
- Two continuity defects discovered during burn-down are regression-covered:
  superseded truth gaps no longer become credential-learning noise, and stale
  zero-gap reserve lanes are not promoted (`af4a20ed`, `cbf3457c`).
- The only hard-delivery blocker reported by
  `softwarehouse:two-project-readiness` is `LUC-1569`: owner approval for a
  managed, read-only Soar protected readiness path. Do not self-approve,
  request raw secrets, push, deploy, or bypass this gate.
- After `LUC-1569` and its security/QA/docs consumers close, complete
  `LUC-27`, run the disposable full-instance restore `LUC-1570`, refresh the
  final V0 scorecard, and request owner acceptance on `LUC-25`.

## 2026-07-23 - Readiness evidence now fails closed when stale

- Fresh direct readiness and source-control checks still name only `LUC-1569`
  as the hard delivery blocker; the protected interaction remains pending and
  no `SMOKE_AUTH_*` or `SOAR_PROD_*` binding name is available in the current
  runner.
- `softwarehouse:readiness-snapshot` previously re-exported an old control
  tick with a new export timestamp, so closed gates and historical dirty state
  could look current. Commit `7aab7847` adds a 15-minute source-age guard,
  explicit freshness metadata, `currentStateUsable=false`, a visible warning,
  and non-zero exit for stale input. The canonical gate suite passes `191/191`.
- Paperclip architecture and project-truth projections were refreshed at
  `971c624c`; all three repositories were clean after Roost historical-state
  closeouts `b62cf987` and `ff337321`.
- Do not use a readiness snapshot with `stale=true` for routing or acceptance.
  Prefer fresh API/readiness/source-control probes, or run a new governed
  control tick when its mutating supervision sequence is appropriate.
