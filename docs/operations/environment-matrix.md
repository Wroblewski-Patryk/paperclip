# Environment Matrix

Last updated: 2026-05-26

## Purpose

Record where the software-house control plane runs and what proof is required
before agents can claim an environment is healthy.

## Environments

| Environment | Purpose | URL / target | Data source | Deploy source | Owner |
| --- | --- | --- | --- | --- | --- |
| local Paperclip | Agent coordination and software-house board | `http://127.0.0.1:3200` | local Paperclip runtime | working tree/dev server | CTO / Portfolio |
| project workspaces | Code/docs/test execution | `C:/Personal/Projekty/Aplikacje/*` | local repos | local commits | project managers |
| Soar production | Current managed app runtime | `https://soar.luckysparrow.ch`, `https://api.soar.luckysparrow.ch` | Coolify/VPS | pushed SHA | Ops Lead |
| Coolify VPS | Deployment and container operations | configured Coolify base URL | Coolify API/UI | explicit gate | Ops / Security |

## Required Checks

| Environment | Health | Readiness | Smoke | Rollback | Evidence |
| --- | --- | --- | --- | --- | --- |
| local Paperclip | `node scripts/audit-luckysparrow-softwarehouse.mjs` | no stale in-progress, no instruction drift | UI/API reachable | restart request when needed | audit JSON output |
| project workspaces | repo-specific guardrails | known-state/index refresh | tests/smoke where available | git commits and no destructive resets | `history/audits`, `history/evidence` |
| Soar production | API `/health`, API `/ready`, Web `/` | worker readiness and protected checks | deploy smoke with expected SHA | rollback/cutover note | Soar history evidence |
| Coolify VPS | resource/container status | app/worker readiness | public and protected smoke | reversible restart/redeploy only | redacted ops packet |

## Current Soar Production Gate

`LUC-99` is not a generic failure. It is the current gate for reconciling:

- parent expected SHA vs observed production SHA;
- `workers-market-stream` explicit readiness proof;
- temp-stack acceptance being unavailable under accepted no-temp routing.

## Protected-Gate Prerequisite Checklist

Contract marker: `protected-access-lane-entry:v1`.

Use this checklist when opening any production-bound lane that may need
deploy-status readback, protected smoke/test-account proof, restore proof, or
runtime secrets/protected bindings. The complete packet must exist before
follow-on work opens for deploy, restore, governor, or protected smoke.

Record these stable packet fields on the parent issue or linked prerequisite
issue:

1. `readOnlyDeploymentStatusPath`: one least-privilege, read-only
   deployment-status path and its responsible role.
2. `nonDestructiveProtectedSmokeOrTestAccountPath`: one non-destructive
   protected smoke or test-account path and its responsible role.
3. `secretRefOrBindingAliases`: required secret refs or protected binding
   aliases by name only, never by value.
4. `responsibleRoles`: the role that owns each binding confirmation or access
   path.
5. `downstreamUnblockTargets`: each exact downstream command, deploy
   observation, restore proof, smoke, or release gate that the prerequisite
   unblocks.
6. `blockerOwnershipIssue`: the first-class Paperclip blocker or prerequisite
   child that owns every missing prerequisite.

Also state the rollback/deploy evidence required for the lane, including pushed
SHA or deploy status when applicable, smoke result, rollback note, and residual
risk. Do not create the downstream execution lane while any packet field is
missing; create the owner-scoped prerequisite issue instead of rerunning a
blocked protected action.

## Rule

Do not assume parity between environments. Record differences explicitly and
keep secrets out of repo artifacts.
