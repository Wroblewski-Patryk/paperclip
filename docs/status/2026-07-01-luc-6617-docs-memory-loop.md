# LUC-6617 Docs And Memory Loop

Date: 2026-07-01
Owner: Documentation Steward
Process: docs/memory loop

## Evidence

- Command: `pnpm softwarehouse:control-tick`
- Result: `implemented and verified`
- Fresh report: `report/softwarehouse-control-tick.latest.json`
- Generated at: `2026-07-01T12:03:00.837Z`
- Caveat: the first wrapper wait reused a stale report after 90 seconds, but the single-flight run completed and wrote a fresh `ok: true` report.

## Control Tick Summary

- `ok`: `true`
- `controlDecision`: `project_source_control_closure_needed`
- `controlBrief.mode`: `source_control_closure`
- `controlBrief.autonomyDisposition`: `source_control_closure_allowed`
- `deliveryPermission.protectedDeliveryAllowed`: `false`
- `deliveryPermission.projectRepoMutationAllowed`: `true`
- `deliveryPermission.canStartNewLane`: `true`
- `deliveryPermission.allowedLaneTypes`: `source_control_classification`, `local_validation`, `local_commit_closure`
- `operatorActionPacket.status`: `operator_input_or_gate_evidence_needed`
- `softwarehouseAudit.overall`: `warn`
- `softwarehouseAudit.restartRequired`: `false`
- `softwarehouseAudit.activeRunCount`: `2`

## Current Routing

- Source-control closure remains the active local work class. The control tick says to route Soar through existing [LUC-6461](/LUC/issues/LUC-6461) for local source-control closure.
- [LUC-6461](/LUC/issues/LUC-6461) readback: `blocked`, blocker attention `covered`, sample blocker [LUC-6331](/LUC/issues/LUC-6331).
- [LUC-6331](/LUC/issues/LUC-6331) readback: `blocked`, blocker attention `needs_attention`.
- Protected production work stays fail-closed. [LUC-6331](/LUC/issues/LUC-6331) blocks deploy, restart, protected smoke, production mutation, and secret disclosure, but does not block local diff classification, validation, or commit/no-commit decisions.

## Dirty Project Packet

- Soar: `449` dirty paths across `history-evidence:404`, `project-docs:24`, `product-code:9`, `agent-state:7`, `codex-context:3`, `scripts:2`.
- Roost: `304` dirty paths across `project-docs:296`, `agent-state:4`, `codex-context:3`, `other:1`.
- Aviary: `11` dirty paths across `project-docs:11`.
- Nest: `11` dirty paths across `project-docs:11`.

## Operating Findings

- Next legal action selector: `supervise_active_runs`; reason: a live run exists and duplicate work would hide truth.
- Coolify production reconciler: `not_ready`; expected resource count `8`, but Coolify URL/token, Soar project id, team context, and inventory are unavailable to this process.
- Soar acceptance ledger: `blocked`; repo reachable at git head `6aeb8b8b`, but source-control cleanliness, production/public reachability, owner login proof, test-account smoke proof, and Coolify resource reconciliation remain missing or unknown.
- Softwarehouse audit warnings remain in agents, routine duplicate hygiene, in-review decision paths, runtime-gated secret/env bindings, and stale operator-unblock packet freshness.

## Memory Decision

The Softwarehouse docs/memory checkpoint is green for control-loop execution but not for delivery readiness. The durable company truth is `source_control_closure_allowed`: local project source-control classification, local validation, and local commit closure may proceed through the existing owner lanes, while push, deploy, restart, protected smoke, production mutation, and secret disclosure remain forbidden until the protected gate facts are accepted.

No secret access, push, deploy, restart, production mutation, protected smoke, or Soar/Roost/Aviary/Nest project source mutation was performed by this checkpoint.
