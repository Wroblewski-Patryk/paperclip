# Paperclip Softwarehouse V0 holistic audit

Snapshot: 2026-07-20 21:35 CEST

Live Paperclip: `http://127.0.0.1:3200`  
Company: `LuckySparrow` (`LUC`)

## Executive verdict

Paperclip is a strong, working local autonomous-control-plane foundation, but
V0 is not yet complete. The local runtime, roster, instructions, routines,
workspace boundaries, budgets, backups, restore proof, public Roost runtime,
and core policy tests are healthy. The hard delivery parent `LUC-25` correctly
remains blocked because Soar is not production-ready and the credential chain
still needs an owner/security action.

The current posture is **yellow: autonomous local work may continue under
supervision, while protected production closure remains fail-closed**.

## Current verified state

| Area | Result | Evidence |
| --- | --- | --- |
| Paperclip runtime | Pass | `/api/health`: `ok`, version `0.3.1`, `local_trusted/private`, port 3200 |
| Runtime topology | Pass with caveat | one Paperclip checkout/service and one Soar/Roost root; Docker inventory unavailable while Docker Desktop is off |
| Agent roster | Pass | 39 agents; latest quiet snapshot: 30 idle, 9 paused |
| Routines | Pass after detector repair | 9 active bounded routines, 4 paused, 6 archived; no duplicate active triggers reported |
| Agent settings/instructions | Pass | settings, instruction-bundle, operating-standard, and runtime-file audits pass |
| Workspace boundaries | Pass | only Paperclip, Soar, and Roost are active roots; parked siblings remain untouched |
| Model/cost governance | Pass with pressure advisory | weekly Codex window 83% used, hard hold at 90%; no active budget incident |
| Secrets provider | Pass for active local provider | `local_encrypted` is `ok` with no warning; optional AWS/GCP/Vault providers are not configured |
| DB backup and restore | Pass for database scope | 16 backups, about 10.59 GB; isolated restore drill passed with 97 tables and cleanup |
| Roost public runtime | Pass | web, build info, API health, and API ready all return 200 |
| Soar public runtime | Fail | web/build info/API health return 200; API ready returns 503 |
| Coolify Soar resources | Fail for readiness | PostgreSQL `running:healthy`; Redis `restarting:unhealthy`; apps/workers `running:unknown` |
| Project-truth indexes | Partial | 59 gaps: Soar 54, Roost 5; no incomplete event chains |
| Source control | Closure in progress | transient root payloads removed; current snapshot: Paperclip 50 intentional paths, Soar 48 evidence/product-truth paths, Roost clean |
| Current UI work | Targeted pass | UI typecheck passed; company appearance/sidebar/inbox focused suites pass; the broader UI suite exceeded its 10-minute budget and is not claimed as passing |
| Softwarehouse gates | Pass | `softwarehouse:test-gates`: 187/187 |

## Remaining V0 blockers

### P0 — protected production and security

1. **Soar readiness is down.** `https://api.soar.luckysparrow.ch/ready`
   returns 503 because production Redis is still `restarting:unhealthy`.
2. **The narrow recovery action is owner-gated.** `LUC-1524` is the current
   pending typed confirmation for the classified cache-only Redis AOF recovery.
   `LUC-1368`, `LUC-1374`, and `LUC-1359` must remain blocked until that
   decision is recorded and the named action receives deploy, rollback, and
   smoke evidence.
3. **Credential rotation is unfinished.** `LUC-972` remains the protected
   owner/security leaf for the earlier exposure chain. Provider-side rotation
   and invalidation, secret-ref rebinding, and readback proof are still needed.
   Soar deployment provenance cannot be authoritative before this closes.

These gates must not be bypassed by broadening credentials, guessing a target,
or treating read access as mutation authority.

### P1 — source-control and product proof

1. **Active repository work is not closed.** Paperclip contains a broad UI
   redesign plus control-plane repair packet; 58 transient root closeout/comment
   payloads were verified untracked and removed. Soar contains project-truth,
   evidence, context, and script changes. Roost is clean. The dispatcher
   correctly returns
   `noop_operating_repo_dirty_source_control_closure_required` instead of
   creating more product work.
2. **Fifty-nine project-truth gaps remain.** Soar has 37 browser-review gaps,
   12 missing test links, 2 missing documentation links, and 3 runtime/gate
   gaps. Roost has 5 missing test links. These are proof gaps until inspection
   shows a real defect; they should not be mass-converted into code rewrites.
3. **The dirty UI packet has only targeted current evidence.** Typecheck and 14
   focused tests pass. The last uninterrupted full `pnpm test` passed earlier
   on 2026-07-20 in 5,963.8 seconds, before this audit snapshot; it was not
   rerun after the latest dirty changes.

### P1 — disaster recovery completeness

The database backup and isolated restore drill are real and passing. They do
not prove a full instance restore. V0 still needs one documented restore of the
database together with local uploads/storage and the local encrypted secrets
key, followed by secret-resolution and artifact-readback checks. Key material
must never be written to logs, issues, docs, or the repository.

## Implemented but not yet complete as a product contract

1. **Evidence enforcement is strong at issue closure, not universal.** Agent
   transitions to `done` require typed test/review/docs evidence; high-risk
   bundles also require security/deploy/monitoring evidence. A unified gate
   evaluation/read model across deployment, production smoke, supervisor
   review, and Mission Control is still missing.
2. **Supervisor review is composed from existing primitives.** There is no
   normalized SupervisorReview projection with checked evidence, decision,
   residual risk, next owner, and next action.
3. **Run intent and final disposition remain conventions.** First-class
   PLAN/EXECUTE/REVIEW/QA/SECURITY/DOCS/DEPLOY/RETRO metadata and a mandatory
   final report-or-blocker record remain useful hardening work.
4. **The activation bridge remains policy-ready but manual.** Board/Codex
   lifecycle action is still required for some agent/routine changes.
5. **Learning exists but promotion is immature.** The live instance has 3
   governed organizational records and 28 observations (26 proposed, 2
   active). Useful observations need validation, promotion, rejection, and
   measured feedback rather than accumulation.
6. **Model routing is governed, not self-optimizing.** Role/task/quota routing
   works, but outcome-based profile tuning and authoritative provider
   catalog/limit discovery remain incomplete. They are not V0 blockers while
   current routing is stable and quota gates remain fail-closed.

## Defect fixed during this audit

The longevity doctor falsely reported five core routine capabilities as
inactive. Team adoption had renamed the active routines, while the doctor only
recognized legacy titles. It now recognizes legacy and current titles for
autonomy, stale-board hygiene, model governance, organizational learning, and
AI-agent development review. A regression test covers the five current names.

After the repair, the doctor no longer emits the five false routine warnings;
its remaining warning is the real source-control closure state.

The audit also found a queue-consistency gap. A bounded queue reconciler now
removes completed blocker relations, preserves newer blocked dispositions,
skips reusable routine controllers and authorization boundaries, respects
per-agent WIP, and wakes at most one untouched stale todo per control cycle.
It was integrated into the main control tick. The first repair pass removed
three stale blocker relations, restored the current LUC-1374 -> LUC-1524 gate,
and started the previously untouched LUC-1355 and LUC-1452 lanes; both reached
`done`. A final dry-run reported zero remaining repair/wake candidates.

## Recommended closure order

1. Finish and classify the current Paperclip and Soar source-control packets;
   preserve active UI and product-agent work and keep Roost clean.
2. Record the `LUC-1387` owner decision. If approved, execute only the named
   Redis recovery and attach rollback, resource-health, `/ready`, log, and
   public-smoke evidence.
3. Complete `LUC-972` provider-side credential rotation/invalidation and then
   repair Soar deployment provenance.
4. Drain the 59 product-truth gaps evidence-first, prioritizing the 37
   owner-visible Soar browser reviews and the 17 missing test links.
5. Run a full-instance restore drill including uploads/storage and secret-key
   restoration without exposing key material.
6. Re-run full repository validation after the broad UI/source-control packet
   is closed, then refresh `LUC-25` acceptance evidence.
7. Treat the unified gate read model, normalized supervisor review, hard run
   disposition, learning promotion, and safe activation bridge as V0 hardening
   or V1 foundation unless they directly block delivery.

## Verification commands used

- `node scripts/audit-luckysparrow-softwarehouse.mjs`
- `node scripts/check-two-project-readiness.mjs`
- `node scripts/check-softwarehouse-executive-health.mjs`
- `node scripts/audit-softwarehouse-model-cost-readiness.mjs`
- `node scripts/audit-luckysparrow-agent-settings.mjs`
- `node scripts/audit-softwarehouse-agent-instructions.mjs`
- `node scripts/audit-softwarehouse-operating-standard.mjs`
- `node scripts/audit-softwarehouse-runtime-file-state.mjs`
- `node scripts/audit-softwarehouse-workspace-boundaries.mjs`
- `node scripts/audit-local-runtime-topology.mjs`
- `node scripts/check-softwarehouse-source-control.mjs`
- `node scripts/run-softwarehouse-longevity-doctor.mjs`
- `node scripts/check-project-truth-indexes.mjs`
- `node scripts/run-project-truth-gap-dispatcher.mjs`
- `node scripts/run-coolify-production-reconciler.mjs`
- `pnpm run softwarehouse:test-gates`
- `pnpm --filter @paperclipai/ui typecheck`
- `pnpm exec vitest run ui/src/context/CompanyAppearanceProvider.test.tsx ui/src/components/Sidebar.test.tsx ui/src/components/CompanySituationPanel.test.tsx --maxWorkers=1`
