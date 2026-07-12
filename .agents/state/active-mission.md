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

- 13 app-factory/longevity routines are active.
- The old controlled-dry-run routine and superseded liveness review are paused/historical.

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
