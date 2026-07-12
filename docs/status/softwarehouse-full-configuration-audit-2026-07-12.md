# Softwarehouse Full Configuration Audit - 2026-07-12

## Verdict

The Paperclip control plane is healthy and substantially configured, but Soar/Roost delivery is not complete. The audit found and repaired six control-plane defects: recurring watchdog disposition churn, an idle recurring issue that schedules could only coalesce into, duplicated paused-scope counts in budget reporting, an active routine assigned to a paused agent, missing CLI compatibility helpers/commands, and unsafe broad-test process accumulation on Windows.

The current blockers are now mostly truthful delivery gates: dirty Soar/Roost repositories, Soar deployment provenance, one unhealthy Soar worker, and provider-side credential rotation that cannot be completed with an agent token.

## Live Inventory

- API: healthy, bootstrap ready, local trusted/private deployment.
- Agents: 39 total; 30 idle/running and 9 intentionally paused.
- Projects: canonical active `00 General: Softwarehouse`, `11 Innovation: Soar`, and `11 Innovation: Roost`; older duplicate-name project records are archived.
- Routines: 13 active, 2 paused; every active routine now has an idle/running owner and one trigger.
- Issues at initial snapshot: 399 done, 8 blocked, 1 todo, 3 cancelled, no pending approvals.
- Model routing: six profiles (`cheap`, `spark`, `light`, `standard`, `reasoning`, `strategic`) and three quota lanes; active Codex quota window observed at 1% use.
- Secrets: 46 active metadata records in `local_encrypted`; values were not read or recorded by this audit.

## Passing Controls

- Workspace boundary audit: pass; only Paperclip_Softwarehouse, Soar, and Roost are active roots.
- Runtime file-state audit: pass; 39/39 instruction roots and 195 path references exist.
- Agent instruction audit: pass; 39 unique bundles with persona, scope, evidence, safety, model, and hierarchy coverage.
- Agent settings audit: pass; roster and runtime records align.
- Operating standard audit: pass; 39/39 agents and required operating documents are covered.
- Routine duplicate janitor: no live duplicate routine issue mutation required.
- Coolify reconciler: ready; eight expected Soar resources are discoverable.
- Gate regression suite: 131/131 pass.
- Budget service tests: 9/9 pass.
- Shared, DB, server, UI, and CLI typechecks: pass when run sequentially with a bounded Node heap.
- Targeted routine policy, successful-run handoff, validator, cron preview, CLI context, backup, prompt, and command parity tests: pass.
- The embedded-Postgres routine service integration suite did not complete within 180 seconds on Windows. Its leaked test process tree and verified temporary directory were removed without touching the live database.
- Natural scheduler proof: at `2026-07-12T20:45:25Z` the continuation routine produced `issue_reused`, executed once, completed at `20:46:07Z`, and returned LUC-770 to `todo` with no recovery action.
- UI production build: pass. Server production build: pass after replacing Unix-only asset copy commands with a cross-platform Node postbuild.

## Repairs Applied

1. The continuation watchdog now returns its own recurring issue to `todo` after every cycle, with a durable decision comment. Heartbeat completion has an atomic fallback that also completes the matching routine run. This prevents successful runs from creating `missing_disposition` recovery loops.
2. Routines now expose `reuse_idle_issue`. It wakes the same idle `todo` issue for a new scheduled run, while still coalescing when that issue has a live execution. The continuation watchdog uses this policy, avoiding both permanent coalescing and five-minute duplicate issue creation.
3. Budget overview now counts distinct paused agent/project scopes rather than policy rows. Live reporting changed from 18 to the correct 9 paused agents.
4. The AI-agent development review routine now prefers active `06 AIM` over paused `06 CHRO`. The live routine was reconciled to AIM.
5. CLI client context, safe API path construction, PUT support, export path containment, company parity commands, and backup guard configuration were restored so the current CLI source and tests agree.
6. After a forced Windows restart, Paperclip was restored as one server and one embedded-Postgres master on port 54329. Broad parallel validation is no longer the recommended local path; package checks must run sequentially and embedded-Postgres suites must be isolated.
7. Server onboarding assets now use a cross-platform Node `postbuild`, so Windows no longer fails after successful TypeScript compilation on `mkdir -p`/`cp -R`.
8. The canonical v0/v1 solution index and goals/routines audit were refreshed against the live instance.

## Open Delivery Gates

- Paperclip operating repo contains agent-owned and audit changes that must be classified and committed without swallowing unrelated work.
- Soar has 58 dirty paths; Roost has 104 dirty paths. These are mostly generated docs/state/evidence plus a small number of tests and require app-specific source-control closure.
- Soar acceptance passes public reachability, owner login, and test-account proof, but fails source-control cleanliness and Coolify resource health (`workers-backtest` is exited/unhealthy).
- LUC-507/LUC-448 still require authoritative Soar deployment provenance before further protected recovery.
- LUC-494/LUC-496 correctly remain blocked on provider-side credential rotation with board/operator access. The approval exists, but an agent token cannot rotate provider credentials.

## Configuration Notes

- The paused `00 General: Softwarehouse Liveness and Active Work Review` is superseded by the more frequent continuation and longevity watchdog routines; the old controlled dry-run routine also remains paused.
- Archived legacy `Soar` and `Roost` project rows are retained as history. Canonical active rows are `11 Innovation: Soar` and `11 Innovation: Roost` with workspace policies enabled.
- Two budget policies per scope are intentional because they govern different metrics (`effective_plan_cents` and billed cost). They are not duplicates.
- The provider quota endpoint currently reports one observed OpenAI lane window. It does not prove independent hard caps for every model, so the UI must continue labeling these as observed windows rather than invented per-model limits.

## Next Safe Sequence

1. Classify and commit Paperclip operating changes in narrow ownership groups.
2. Route one source-control closure lane each for Soar and Roost; do not start protected production mutation from dirty checkouts.
3. Re-run Soar acceptance and Coolify reconciliation, then route the smallest approved worker/provenance repair.
4. Keep credential rotation as an explicit owner/operator action until provider-side replacement and invalidation evidence exists.
5. Run the embedded-Postgres routine integration suite later in an isolated maintenance window; do not overlap it with the live local database or repo-wide validation.

This document is a dated snapshot. The durable feature map remains `docs/softwarehouse-v0-v1-solution-index.csv`.
