# LUC-1264 Delivery Plan (Gate Freshness Watcher)

Date: 2026-06-01
Owner role: Engineering Delivery Lead (decomposition/integration only)
Issue: LUC-1264 (critical)

## Known-State Map

Capability: gate freshness watcher routine and one-shot gate reopen behavior.

Status snapshot from repo inspection:
- `scripts/run-gate-freshness-watcher.mjs`: implemented and verified by code inspection for freshness detection and one-action apply guard.
- `scripts/lib/softwarehouse-gates.mjs`: implemented and verified by code inspection for gate contracts and resume comments.
- `scripts/configure-gate-freshness-watcher.mjs`: implemented and verified by code inspection for routine + trigger provisioning.
- `scripts/enforce-softwarehouse-routine-governor.mjs`: implemented and verified by code inspection for routine activation/schedule governance.
- `scripts/run-autonomy-governor.mjs`: present in code, behavior unknown for secret-freshness-to-action coupling because gate observation currently keeps `actionableFreshGateFact: false` (diagnostic override) pending stronger freshness evidence semantics.
- Runtime/API proof in this heartbeat: blocked by error (`curl http://127.0.0.1:3200/api/health` timed out/no response).

## Gap Register

1. Gap: No runtime proof in this heartbeat that watcher can legally reopen exactly one blocked gate lane.
- Severity: high
- Workflow: gate hold -> fresh fact -> one recheck lane
- Current evidence: blocked by local Paperclip API unavailability
- Owner: Ops Release Lead (runtime availability)

2. Gap: Control-loop readiness signal may stay conservative in `run-autonomy-governor` due to forced non-actionable gate freshness flag.
- Severity: medium
- Workflow: autonomous recommendation quality
- Current evidence: code inspection only; runtime behavior unknown
- Owner: AI Agent Runtime Engineer (implementation), QA Regression Lead (proof)

## Required Child Lanes

1. AI Agent Runtime Engineer
- Scope: `scripts/run-autonomy-governor.mjs`, optionally shared freshness helper extraction.
- Affected entities: gate observation model, control decision recommendation, blocked-gate routing.
- Acceptance criteria:
  - Gate observations preserve safe fail-closed behavior.
  - If freshness evidence is valid, control output can recommend the watcher apply path without broad wake churn.
  - No change permits deploy/push/secret disclosure paths.
- Verification:
  - Deterministic dry-run command showing expected decision transitions.
  - At least one fixture/output example for stale vs fresh gate cases.
- Closure contract:
  - files changed, verification commands/results, commit SHA, push status, deploy impact, rollback notes.

2. QA Regression Lead
- Scope: repeatable watcher/autonomy regression proof.
- Acceptance criteria:
  - Repeatable command matrix for: no fresh fact, fresh secret metadata, explicit approval comment, placeholder-only update.
  - Confirms one-action apply guard (`--apply` refuses more than one gate action and refuses while active runs exist).
- Verification output:
  - command transcript with pass/fail assertions and artifact path.

3. Ops Release Lead (unblock lane)
- Scope: restore local API reachability for the Softwarehouse instance (`PAPERCLIP_API_URL`/`127.0.0.1:3200`) and record health proof.
- Acceptance criteria:
  - `/api/health` and `/api/companies` respond successfully.
  - Delivery lead can mutate issue state and create child issues via API.

## Integration Order

1. Ops restores API reachability.
2. Delivery Lead opens/assigns runtime + QA child issues in Paperclip.
3. Runtime lane implements narrow control-signal fix (if confirmed needed).
4. QA lane verifies full freshness matrix.
5. Delivery Lead integrates evidence and sets LUC-1264 disposition.

## Blockers In This Heartbeat

- Blocked by error: local Paperclip API not reachable from this run, so issue-thread mutation and child issue creation could not be executed in control plane.
- Unblock owner/action: Ops Release Lead to restore local API service and confirm with health/company endpoints.
