# Soar Coolify Resource Model

Last updated: 2026-05-25

## Model

Soar production in Coolify is not one application id. It is:

`Coolify project -> production environment -> resources`

The production environment currently represents one Soar deployment stack with:

- multiple application/service resources;
- Postgres;
- Redis.

The user described this as one Coolify project containing a production
environment with six applications plus Postgres and Redis, for eight production
resources total.

## Secret Keys

| Secret | Meaning |
| --- | --- |
| `COOLIFY_BASE_URL` | Coolify instance URL. |
| `COOLIFY_API_TOKEN` | Coolify API token; prefer least-privilege read/status/log scope. |
| `COOLIFY_TOKEN` | Compatibility alias bound to the same secret as `COOLIFY_API_TOKEN` for Soar scripts or ad hoc checks that expect this name. |
| `COOLIFY_LOGIN_EMAIL` | Coolify UI login email for read-only navigation when API token checks are insufficient. |
| `COOLIFY_LOGIN_PASSWORD` | Coolify UI login password; never print or place in issue comments. |
| `COOLIFY_SOAR_PROJECT_ID` | Coolify project id that owns the Soar production environment. |
| `COOLIFY_SOAR_PRODUCTION_ENVIRONMENT` | Environment name or id, normally `production`. |
| `COOLIFY_SOAR_APP_ID` | Legacy single-resource alias; do not treat as the whole deployment. |
| `COOLIFY_SOAR_API_APP_ID` | Optional known API app resource id. |
| `COOLIFY_SOAR_WEB_APP_ID` | Optional known web app resource id. |
| `COOLIFY_SOAR_POSTGRES_RESOURCE_ID` | Optional known Postgres resource id. |
| `COOLIFY_SOAR_REDIS_RESOURCE_ID` | Optional known Redis resource id. |

## Ops Rule

Before any deploy, restart, rollback, env change, database operation, or log
inspection with sensitive output, Ops must name:

- Coolify project;
- environment;
- exact resource;
- read-only vs mutating action;
- expected source commit or image;
- rollback path;
- post-action smoke.

Read-only inventory may discover resource ids when the project id and token are
configured. Mutating actions require an explicit release issue or user-approved
task.

Temporary Coolify resources additionally follow
`softwarehouse-managed-resource-lifecycle:v1`: discover/reuse before create,
record the exact project/environment/resource UUIDs and protected production
exclusions, and attach a bounded expiry/review plus teardown trigger. Prefer
local proof when it satisfies the same gate. Once the temporary purpose ends,
delete the exact application/service/database with its exclusive
configurations, volumes, and networks; verify provider 404/readback for the
target and fresh success readback for every protected resource. An empty
temporary environment should also be removed through the provider-supported
path. A documented cleanup plan without provider readback is incomplete.

For an issue carrying the exact contract, use the dry-run first and add
`--apply` only after its allowlisted readback is green:

```powershell
pnpm softwarehouse:coolify-managed-resource-teardown -- --issue=LUC-0000 --application=<qa-app-uuid> --project=<project-uuid> --environment=<environment-uuid> --exclude-resource=<production-app-uuid>
```

After the application is verified absent, an empty environment is a separate
phase and requires `environmentDisposition: teardown_authorized` in the same
exact issue contract. Run its dry-run first:

```powershell
pnpm softwarehouse:coolify-managed-resource-teardown -- --issue=LUC-0000 --application=<absent-qa-app-uuid> --project=<project-uuid> --environment=<empty-environment-uuid> --exclude-resource=<production-app-uuid> --delete-empty-environment
```

This phase refuses any application, database, Redis, or service relation. If a
deployed Coolify version omits environment-level shared-variable fields, the
issue must additionally record
`sharedVariableBoundary: provider_version_omits_environment_field_verified_empty`
from a current provider readback before apply. The exact environment DELETE is
issued once; bounded polling and project-list absence verify completion without
retrying the destructive request.

Use `--verify-deleted` for read-only target-absence and protected-resource
presence evidence after an asynchronous provider deletion. On `--apply`, the
helper waits within a bounded readback window without repeating the destructive
request, then verifies every protected resource. The helper refuses
missing production exclusions, mismatched project/environment membership,
running or published targets, unreviewed deployment history, and issue text
without the exact teardown authorization marker.

If the Soar project is not visible after login, Ops should first check the
Coolify team/workspace selector and switch to the appropriate team if available.
Missing project visibility after team switching is a credential/scope blocker,
not permission to create or modify Coolify projects.

## Temp Stack and Worker Recovery

For Soar V1, a temp-domain or parallel-stack gate is not satisfied by production
smoke alone. Ops must prove either:

- a discoverable temp/parallel stack resource set exists for the expected SHA;
  or
- no temp resources exist, in which case the blocker is "temp stack not
  provisioned" with the release controller/operator as unblock owner.

Worker recovery should be tracked per resource. If `workers-market-stream` is
`exited:unhealthy`, Ops may only restart or redeploy it inside a release mutation
permit that names the resource id, expected SHA/image, rollback/stop condition,
and readiness check. A production web/API smoke pass does not close worker
readiness unless worker-specific readiness evidence is attached.
