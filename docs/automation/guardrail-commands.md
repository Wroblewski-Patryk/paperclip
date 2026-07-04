# Guardrail Commands

Last updated: 2026-07-04

## Commands

| Command | Purpose | When to run | Expected evidence |
| --- | --- | --- | --- |
| `node scripts/audit-luckysparrow-softwarehouse.mjs` | Audit Paperclip company health, agents, issues, routines, live runs, model drift, instruction drift, root index drift. | Every coordination pass and before claiming autonomy is healthy. | JSON with `overall: pass` and clear autonomy posture. |
| `pnpm run softwarehouse:workspace-boundary-audit` | Verify active Paperclip projects stay inside the approved Stage 1 workspace roots and that no generated helper artifacts exist directly under `/Aplikacje`. | After project/routine/workspace configuration changes and before widening autonomy. | JSON with `overall: pass`; sibling app folders may appear as warnings only. |
| `powershell -NoProfile -ExecutionPolicy Bypass -File ../!template/scripts/template-sync.ps1 -Mode scan -TemplateRoot ../!template -TargetRoot .` | Check template backbone presence. | Before/after onboarding a project or this repo. | Missing/present file table. |
| `node scripts/build-architecture-awareness-index.mjs --project Soar --root ../Soar` | Generate architecture-awareness graph for a project. | After meaningful Soar architecture/code/docs changes. | Graph/report files in docs/status/graphs. |
| `pnpm run ops:project:known-state` in `../Soar` | Refresh Soar index, scan, ledger, and scorecard. | Before Soar status claims. | PASS command output and generated artifacts. |

## Rule

If a guardrail is environment-dependent, record the missing dependency and
convert it into a blocker instead of pretending the check passed.
