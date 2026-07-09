# Softwarehouse V1 Global Audit - 2026-07-09

Scope: LuckySparrow Paperclip Softwarehouse local instance at `http://127.0.0.1:3200`, company `ae26bb8b-8f5f-4a85-b341-78d4e1985975`, with Paperclip, Soar, and Roost as separate repositories.

## Executive Result

Paperclip is materially closer to V1, but it is not yet at 100% autonomous softwarehouse readiness. The control plane, agent roster, model/cost routing, instruction bundles, routine triggers, boundary checks, and runtime file state are in good shape after this audit. The remaining blockers are production-readiness gates and source-control closure, not a missing model-router foundation.

## Checks Run

- `GET /api/health`: pass after clearing an orphaned embedded Postgres worker and restarting the local Softwarehouse server.
- `pnpm run softwarehouse:operating-standard-audit`: pass, 39/39 roster agents and 39/39 runtime agents checked against the active LuckySparrow company.
- `pnpm run softwarehouse:agent-instructions-audit`: pass, 39 unique instruction bundles and no missing runtime instruction files.
- `pnpm run softwarehouse:agent-settings-audit`: pass after supporting the current `AGENTS.md` + `references/*` bundle format.
- `pnpm run softwarehouse:runtime-file-state-audit`: pass.
- `pnpm run softwarehouse:workspace-boundary-audit`: pass, with only parked/external sibling app warnings.
- `pnpm run softwarehouse:test-gates`: pass, 96/96.
- `node scripts/audit-softwarehouse-model-cost-readiness.mjs`: pass for OpenAI quota posture; Codex subscription windows were below hold thresholds at audit time.
- `pnpm run softwarehouse:control-tick`: pass, but decision remained `operating_source_control_closure_needed`.

## Fixes Applied

- Removed an orphaned embedded Postgres process that prevented the local Paperclip server from starting.
- Corrected `scripts/audit-softwarehouse-operating-standard.mjs` to use the active LuckySparrow company id by default and fail on missing/incomplete agent roots.
- Corrected `scripts/audit-luckysparrow-agent-settings.mjs` to validate both old role-file bundles and the current repo-backed reference bundle layout.
- Applied `softwarehouse:live-run-janitor:apply` twice to cancel duplicate owner runs on `LUC-218` and `LUC-231`.
- Refreshed `docs/status/softwarehouse-unblock-packet.md` and the control tick reports.

## Current Readiness

Strong:

- Agent roster is coherent: 39 active agents match the roster, metadata, permissions, reports-to links, adapter type, and model lanes.
- Instruction bundles are present and API-readable in the new repo-backed layout.
- Routine schedule posture is clean: active app-factory routines are enabled, the old controlled dry-run routine remains paused, and no routine trigger gaps were detected.
- Model/cost posture is usable: OpenAI quota windows were below stop thresholds, and model-router/budget observability is wired enough for controlled work.
- Local boundaries are enforced: Paperclip, Soar, and Roost stay in their intended roots; Roost is source-control clean.

Not V1-complete yet:

- Soar has untracked `history/evidence/luc-212-protected-test-account-smoke-path-2026-07-06.*` files that must be classified and either committed or deliberately discarded by the Soar source-control closure lane.
- Coolify production access is not ready: no safe read-only Coolify credential metadata was available to this process, so deployment/resource reconciliation remains blocked.
- Soar and Roost protected production smoke gates lack fresh credential/proof facts. The unblock packet correctly says blocked delivery lanes should stay quiet until operator/credential facts exist.
- Workspace policies for the Soar and Roost active project records are still not enabled, which the readiness snapshot lists as required before full delivery.
- Some operator/Coolify issues created by the control tick still need project/workspace classification so they do not appear as orphan active work.

## Decision

The safe operating posture is: keep Paperclip running, allow only OS closure and project-truth/source-control classification lanes, and do not start broad delivery, push, deploy, restart, or production mutation until source-control closure and credential gates are resolved.

When limits renew, Paperclip should be able to resume productive non-production and classification work. It should not automatically push production deployment work until the Coolify and protected smoke evidence gates receive fresh, explicit metadata.
