# Softwarehouse Secret Requirements

Last updated: 2026-07-04

Purpose: define the secret names and access policy needed before Stage 1. This
file must never contain secret values.

## Entry Rule

- Do not paste secret values into chat, memory files, instruction files, issue
  comments, or docs.
- Add values through Paperclip Secrets UI, a reviewed env-to-secret import, or a
  provider vault flow.
- Agent adapter env should reference secrets by Paperclip secret refs only.
- `local_encrypted` strict mode is enabled, but the local Windows key ACL still
  reports a `666` warning. Do not enter production-grade secrets until the owner
  explicitly accepts this local risk or the provider/runtime context is fixed.

## Coolify And VPS

Required before agents can observe deployments safely:

- `COOLIFY_API_URL`
- `COOLIFY_BASE_URL`
- `COOLIFY_LOGIN_EMAIL`
- `COOLIFY_LOGIN_PASSWORD`
- `COOLIFY_READ_API_TOKEN`
- `COOLIFY_DEPLOY_API_TOKEN`
- `COOLIFY_TEAM_ID_LUCKYSPARROW`
- `COOLIFY_PROJECT_ID_SOAR`
- `COOLIFY_PROJECT_UUID_SOAR`
- `COOLIFY_ENVIRONMENT_UUID_SOAR_PRODUCTION`
- `COOLIFY_RESOURCE_UUID_SOAR_*`
- `COOLIFY_RESOURCE_UUID_ROOST_APP`

Configured in Paperclip on 2026-07-04 as `local_encrypted` managed secrets:

- `coolify_base_url` bound to runtime env `COOLIFY_BASE_URL`
- `coolify_api_url` bound to runtime env `COOLIFY_API_URL`
- `coolify_login_email` bound to runtime env `COOLIFY_LOGIN_EMAIL`
- `coolify_login_password` bound to runtime env `COOLIFY_LOGIN_PASSWORD`
- `coolify_read_api_token` bound to runtime env `COOLIFY_READ_API_TOKEN`
- `coolify_deploy_api_token` bound to runtime env `COOLIFY_DEPLOY_API_TOKEN`
- `coolify_team_id_luckysparrow` and `coolify_team_name_luckysparrow`
- Soar Coolify ids:
  `coolify_project_id_soar`, `coolify_project_uuid_soar`,
  `coolify_environment_uuid_soar_production`,
  `coolify_resource_uuid_soar_web`, `coolify_resource_uuid_soar_api`,
  `coolify_resource_uuid_soar_worker_backtest`,
  `coolify_resource_uuid_soar_worker_execution`,
  `coolify_resource_uuid_soar_worker_market_data`,
  `coolify_resource_uuid_soar_worker_market_stream`,
  `coolify_database_uuid_soar_postgresql`, and
  `coolify_database_uuid_soar_redis`
- Roost Coolify id: `coolify_resource_uuid_roost_app`
- Soar production refs: `soar_prod_base_url`, `soar_api_base_url`,
  `soar_prod_test_email`, and `soar_prod_test_password`
- Roost production refs: `roost_prod_base_url`, `roost_api_base_url`,
  `roost_prod_test_email`, `roost_prod_test_password`, and
  `roost_prod_test_workspace_name`

Current binding scope:

- Base/API URL refs are available to selected deployment/coordinating agents.
- Coolify read token and discovered team/resource ids are available to 16
  selected deployment/coordinating agents for observation.
- Coolify deploy token is restricted to `00 AIA`, `09 CTO`, `09 DRE`,
  `10 SPA`, and `12 CEO`.
- Login email/password refs are restricted to `00 AIA`, `09 CTO`, `09 DRE`,
  `10 SPA`, and `12 CEO`.
- Soar and Roost production test-account refs are each bound to 10
  app-relevant engineering, verification, security, and product roles.
- The detailed least-privilege matrix lives in
  `.agents/state/softwarehouse-resource-access-matrix.md`.

These values are test/Stage 0 credentials and should be rotated manually in v2
as planned by the owner. Values are not stored in this file.

## Product Smoke Accounts

Owner personal application accounts are not agent runtime credentials. They may
be used only as temporary owner authority to provision or verify dedicated AI
smoke accounts, and must not be stored as agent-facing app credentials.

Each production app should have dedicated AI smoke credentials before agents
claim production verification:

- one normal user/customer smoke account when the app has customer workflows;
- one admin/operator smoke account when the app has protected admin or
  readiness workflows that require elevated app role;
- one workspace owner smoke account when the app's highest available authority
  is workspace ownership rather than a global admin panel.

Current Stage 1 account policy:

- Soar has `USER` and `ADMIN` roles. Use `soar_prod_test_email/password` for
  normal user smoke and `soar_prod_admin_smoke_email/password` for protected
  admin readiness smoke. Bind admin-smoke refs to DRE/QVE/SPA as
  `SMOKE_AUTH_EMAIL` and `SMOKE_AUTH_PASSWORD`; do not bind `SMOKE_AUTH_TOKEN`
  unless separately approved.
- Roost currently has a workspace-owner model and no separate global admin
  panel. Use `roost_prod_test_email/password` plus
  `roost_prod_test_workspace_name` as the AI owner/workspace smoke account.

2026-07-04 status:

- Roost production AI owner/workspace smoke account was provisioned and the
  Paperclip refs `roost_prod_test_email`, `roost_prod_test_password`, and
  `roost_prod_test_workspace_name` were rotated and bound to DRE/QVE/SPA.
- Soar production AI account provisioning is blocked by app readiness, not by
  missing owner intent: `/ready` is `503` and auth endpoints return a
  redaction-safe `Rate limit temporarily unavailable` error class. `LUC-80`
  owns restoring Soar auth/rate-limit readiness and then provisioning
  `soar_prod_test_*` plus `soar_prod_admin_smoke_*`.

Current Coolify gap:

- Browser login verified that the initial team `ai's Team` had no projects; the
  active infrastructure team is `LuckySparrow`.
- Coolify API tokens cannot be recovered after creation, so Stage 0 created new
  dedicated tokens and stored them in Paperclip secrets. Coolify permissions are
  single-scope in this UI: `read` and `deploy` are separate tokens.
- `coolify_read_api_token` was verified against `/api/v1/version`,
  `/api/v1/teams`, `/api/v1/projects`, `/api/v1/deployments`, and
  `/api/v1/applications`.
- `coolify_deploy_api_token` is deploy-scoped and should be used only behind
  release/deploy gates.

Optional, only if deployment checks require direct SSH:

- `VPS_SSH_HOST`
- `VPS_SSH_PORT`
- `VPS_SSH_USER`
- `VPS_SSH_PRIVATE_KEY`
- `VPS_SSH_KNOWN_HOSTS`

Initial allowed use:

- Read deployment status.
- Read build/deploy logs.
- Diagnose failed deploys.
- Collect deploy and smoke evidence.

Initial disallowed use without board approval:

- Restart production services.
- Change production env vars.
- Run destructive shell commands.
- Rotate infrastructure secrets.
- Trigger broad redeploys outside an approved release gate.

## Source Control

Likely required for Stage 1 PR/push/deploy loops:

- `GITHUB_TOKEN` or provider-specific token with least-privilege scopes.

Resource constraint:

- The owner does not have a paid GitHub plan. Do not assume paid GitHub
  features, paid Actions capacity, Advanced Security, paid hosted runners,
  enterprise-only controls, paid packages/storage, or paid GitHub AI features.
- Do not add GitHub workflows, scheduled automation, security campaigns, or
  notification-heavy checks unless the owner explicitly approves that exact
  change. The owner does not want repeated notification emails.

Allowed use:

- Read repo status, branches, PRs, checks, and workflow logs.
- Push only when the issue/activation packet explicitly allows it and source
  control gates are satisfied.
- Prefer local tests/scripts, CLI inspection, existing free GitHub features, and
  Coolify/VPS read-only observation before proposing paid or noisy automation.

## Product Apps

Declare app-specific secrets as exact refs once each app activation packet is
reviewed. Expected categories:

- Soar exchange/API provider credentials.
- Soar market-data provider credentials.
- Soar notification or webhook credentials.
- Roost hosting/database/storage credentials.
- Roost payment/subscription provider credentials, if applicable.
- App-specific production smoke-test credentials.

Production test-account naming convention:

- `<APP>_PROD_TEST_BASE_URL`
- `<APP>_PROD_TEST_EMAIL`
- `<APP>_PROD_TEST_PASSWORD`
- `<APP>_PROD_TEST_TOTP_SECRET` only if MFA is required

Known Stage 1 examples to create when values are available:

- `SOAR_PROD_TEST_BASE_URL`: configured as `soar_prod_base_url`
- `SOAR_PROD_TEST_EMAIL`: configured as `soar_prod_test_email`
- `SOAR_PROD_TEST_PASSWORD`: configured as `soar_prod_test_password`
- `ROOST_PROD_TEST_BASE_URL`: configured as `roost_prod_base_url`
- `ROOST_PROD_TEST_EMAIL`: configured as `roost_prod_test_email`
- `ROOST_PROD_TEST_PASSWORD`: configured as `roost_prod_test_password`

## Learning And Audit

- Missing access must be reported as a configuration defect with the exact
  missing secret ref name.
- Agents must not ask for raw values in task comments.
- Any proposed new secret requires a short justification, owner, scope, rotation
  expectation, and whether it is needed for read-only observation or mutation.
