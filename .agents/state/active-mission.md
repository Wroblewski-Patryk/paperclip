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
