# Coolify VPS Deployment Contract

Last updated: 2026-05-31

## Purpose

Define the minimum facts required before any Softwarehouse agent treats a
Coolify/VPS surface as known, deployable, restartable, or recoverable.

This is a contract template for each managed application. It complements
`softwarehouse/coolify-resource-model.md`,
`docs/operations/service-topology.md`, and
`docs/automation/agent-command-catalog.csv`.

## Deployment Target

| Field | Required value |
| --- | --- |
| Project | Application name, for example `Soar`. |
| VPS provider | Provider name or `unknown`. |
| Coolify project id/name | Project-level identifier, not only app id. |
| Coolify environment | Production/stage/local equivalent. |
| Application resources | Web/API/worker resources and ids when known. |
| Database resources | Postgres/Redis/queues/volumes and ids when known. |
| Public domains | Domain list and expected health routes. |
| Private services | Internal services that must not be public. |

## Required Artifacts

- Dockerfile, compose, Coolify resource, or buildpack configuration path.
- Env example file path.
- Migration entrypoint and rollback expectation.
- Health/readiness endpoints.
- Release smoke command or browser/API proof path.
- Backup and restore evidence expectation for stateful services.

## Secret And Account Boundary

- Secret values live only in Paperclip secret storage or an approved encrypted
  local secret manager.
- Repo files may contain example keys only.
- Agents may record secret metadata freshness, alias names, and missing slots;
  they must not print values.
- Production smoke accounts should be separate from the user's real account by
  default.
- User real account checks require explicit narrow approval for the exact
  action.

## Read-Only Operations

Ops may perform read-only status/log checks when credentials are configured and
the command catalog classifies the operation as `safe_provider_read`.

Evidence must be redacted and include:

- timestamp;
- resource inspected;
- status/log summary;
- missing permission or missing credential if blocked;
- next owner.

## Mutating Operations

Deploy, restart, rollback, env changes, database mutation, live account
mutation, and paid/subscription mutation require a release mutation permit.

The permit must name:

- target project/environment/resource;
- exact action;
- source commit/image/build;
- expected effect;
- rollback path;
- smoke plan;
- secret redaction rule;
- approving owner or operator fact.

No agent may treat a broad "fix deploy" request as approval for several
production operations. Split the permit into one narrow operation.

## Per-Project Contract Stub

Create or update one file per active production project:

`docs/operations/<project>-coolify-vps-contract.md`

The first Softwarehouse target is Soar. Roost remains preparation-only until
Portfolio Director activates it.
