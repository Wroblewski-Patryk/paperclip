# Additional Capability Utilization Closeout

Date: 2026-08-10

## Decision

The additional Softwarehouse capabilities are no longer judged by source-file
or endpoint existence. A machine-readable gate now requires four complete
dimensions for every registered capability:

1. implementation across affected contract layers;
2. integration with a named real consumer;
3. live LuckySparrow runtime evidence;
4. inspectable tests and authoritative documentation.

The gate threshold is 100%. A partial capability must be repaired or explicitly
retired and removed. It cannot be silently described as complete.

## Live result

`pnpm softwarehouse:extension-utilization` passed 11 of 11 registered
capabilities with an average utilization score of 100%:

| Capability | Lifecycle | Concrete live evidence |
| --- | --- | --- |
| Organizational orientation | active | 18 governed records and 152 observations |
| Admission control | active | evidence-backed company control open at version 15; replay completed with zero failures |
| Native supervision | active | persisted cycles, findings, safeguards, evidence references, and 16 shadow comparisons |
| Autonomy decision engine | calibrating | 25 decisions, RECOMMEND envelope, active constraint, 22 distinct samples, one evaluator class |
| ProductDelivery ledger | active | 5 deliveries; 4 outcome-accepted and 1 review-accepted |
| Roost portfolio bridge | active | versioned projection available, non-stale, conflict-free, with 3 items |
| Team catalog | active | 5 installed catalog entries |
| Company artifacts | active | task-grouped board view has live stacks and pagination |
| Architecture/project truth | active | graph and project-truth pipeline is wired into control operation |
| Autonomous control loop | active | strict-port API healthy and Softwarehouse status surface available |
| Workspace/runtime/isolation | active | canonical boundary, topology, runtime-capability, and cross-project audits are installed |

## Important interpretation

The autonomy engine is deliberately `calibrating`, not falsely labelled fully
autonomous. Its current RECOMMEND envelope does not dispatch ungated work. An
execution requires a bounded canary authorization or later evidence-based
graduation. Zero ungated executions is therefore correct fail-closed behavior,
while decisions, constraints, evaluator samples, and reconciliation paths prove
that the mechanism is used.

Supervision shadow comparisons currently include `attention_required` results.
Those are retained as evidence of disagreement and work for the supervision
loop; they are not hidden or converted into synthetic agreement merely to make
the dashboard green.

## Drift prevention

- Registry: `softwarehouse/extension-utilization-registry.json`
- Audit: `scripts/audit-extension-utilization.mjs`
- Test: `scripts/extension-utilization.test.mjs`
- Recurring enforcement: `extensionUtilization` is the first control-tick step
- Agent rule: `softwarehouse/instructions/shared/75-skill-and-capability-quality.md`
- Durable owner preference: `.agents/state/board-context.md`

The capability map and pipeline registry were updated to reflect active
Soar/Roost/Featherly isolation, ProductDelivery, admission control, native
supervision, autonomy calibration, artifacts, and the implemented Roost
portfolio bridge.
