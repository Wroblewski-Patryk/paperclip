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

## Protected-Gate Preflight Checklist

Use this checklist before deploy-impacting release smoke work that needs
runtime secrets or protected environment bindings. Record answers in the
release-smoke issue before rerunning the smoke command.

1. Name the required protected secret refs or environment bindings by name only,
   never by value.
2. Name the binding or confirmation owner who can verify that the refs are
   attached to the smoke runner.
3. Name the exact downstream command, smoke, deploy observation, or release gate
   that the protected binding unblocks.
4. State the rollback/deploy evidence required for the lane, including pushed
   SHA or deploy status when applicable, smoke result, rollback note, and
   residual risk.
5. If a missing binding blocks the lane, create or link a first-class Paperclip
   blocker relation instead of leaving only a comment.
6. Create a protected coordination child instead of rerunning blocked smoke when
   the missing fact is a secret binding, owner confirmation, protected account
   availability, deploy approval, or rollback/deploy evidence gate.

## Rule

Do not assume parity between environments. Record differences explicitly and
keep secrets out of repo artifacts.
