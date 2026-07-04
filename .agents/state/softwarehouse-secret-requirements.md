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
- `COOLIFY_API_TOKEN`
- `COOLIFY_TEAM_ID` or equivalent team/context id if required by the Coolify API
- `COOLIFY_PROJECT_ID_SOAR`
- `COOLIFY_PROJECT_ID_ROOST`
- `COOLIFY_RESOURCE_ID_SOAR`
- `COOLIFY_RESOURCE_ID_ROOST`

Configured in Paperclip on 2026-07-04 as `local_encrypted` managed secrets:

- `coolify_base_url` bound to runtime env `COOLIFY_BASE_URL`
- `coolify_api_url` bound to runtime env `COOLIFY_API_URL`
- `coolify_login_email` bound to runtime env `COOLIFY_LOGIN_EMAIL`
- `coolify_login_password` bound to runtime env `COOLIFY_LOGIN_PASSWORD`

Current binding scope:

- Base/API URL refs are available to selected deployment/coordinating agents.
- Login email/password refs are restricted to `00 AIA`, `09 CTO`, `09 DRE`,
  `10 SPA`, and `12 CEO`.
- The detailed least-privilege matrix lives in
  `.agents/state/softwarehouse-resource-access-matrix.md`.

These values are test/Stage 0 credentials and should be rotated manually in v2
as planned by the owner. Values are not stored in this file.

Current Coolify gap:

- `COOLIFY_API_TOKEN`, team id, project ids, and resource ids are not yet
  configured.
- A direct JSON login attempt against common Coolify paths did not expose a
  usable API token flow; `/login` returned a CSRF/session-style response.
- If Soar/Roost resources are not visible after login, switch team in Coolify
  before recording team/resource ids.

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

- `SOAR_PROD_TEST_BASE_URL`
- `SOAR_PROD_TEST_EMAIL`
- `SOAR_PROD_TEST_PASSWORD`
- `ROOST_PROD_TEST_BASE_URL`
- `ROOST_PROD_TEST_EMAIL`
- `ROOST_PROD_TEST_PASSWORD`

## Learning And Audit

- Missing access must be reported as a configuration defect with the exact
  missing secret ref name.
- Agents must not ask for raw values in task comments.
- Any proposed new secret requires a short justification, owner, scope, rotation
  expectation, and whether it is needed for read-only observation or mutation.
