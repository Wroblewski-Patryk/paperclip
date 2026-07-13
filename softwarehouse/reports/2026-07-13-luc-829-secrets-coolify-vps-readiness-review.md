# LUC-829 Secrets, Coolify, and VPS Access Readiness Review

Date: 2026-07-13
Issue: `LUC-829`
Reviewer: `10 SPA (Security & Privacy Auditor)`
Result: `ready with cleanup debt`

## Scope

Review whether the LuckySparrow Software House local instance currently meets the Stage 1 readiness bar for:

- required secret inventory for Coolify/VPS and production smoke access;
- `secret_ref` usage instead of inline raw values in live agent configs;
- least-privilege access for Coolify deploy and VPS SSH credentials;
- production mutation gating for deploy/restart/rollback/env changes;
- local encrypted secret-provider health for the active runtime.

## Evidence Sources

- `node scripts/repair-stage1-least-privilege-bindings.mjs --json`
- names-only local board reads to:
  - `GET /api/companies/{companyId}/secrets`
  - `GET /api/companies/{companyId}/agents`
  - `GET /api/companies/{companyId}/secret-providers/health`
- local ACL inspection:
  - `Get-Acl .paperclip/runtime/home/instances/default/secrets/master.key`
- policy docs:
  - `docs/operations/coolify-vps-deployment-contract.md`
  - `softwarehouse/coolify-resource-model.md`
  - `softwarehouse/release-push-deploy-policy.md`
  - `docs/automation/agent-command-catalog.csv`

## Verified Controls

### 1. Secret inventory exists for the reviewed scope

Status: `implemented and verified`

- Local names-only secret metadata returned 46 managed secrets.
- 37 secrets matched the Coolify, VPS, smoke-account, or related production-access scope reviewed here.
- Relevant entries remain active, including:
  - `coolify_read_api_token`
  - `coolify_deploy_api_token`
  - `coolify_project_id_soar`
  - `coolify_environment_uuid_soar_production`
  - `coolify_resource_uuid_soar_*`
  - `vps_ssh_host`
  - `vps_ssh_user`
  - `vps_ssh_private_key_path`
  - `vps_ssh_known_hosts`

### 2. Sensitive runtime env values are stored as secret refs, not inline values

Status: `implemented and verified`

- A names-only scan of live agent `adapterConfig.env` entries found 517 sensitive bindings across 39 agents.
- Sensitive matching included Coolify, VPS, smoke-account, token, password, secret, API-key, and known-host patterns.
- `nonSecretRefCount` was `0`.
- No inline plaintext values were observed in the reviewed env bindings.

### 3. Least-privilege repair is live for deploy-token and VPS SSH access

Status: `implemented and verified`

- `node scripts/repair-stage1-least-privilege-bindings.mjs --json` now reports no planned actions.
- The only holder of `COOLIFY_DEPLOY_API_TOKEN` is `09 DRE (Deployment & Reliability Engineer)`.
- The only holder of VPS SSH material is `09 DRE (Deployment & Reliability Engineer)`.
- This closes the July 12, 2026 over-distribution finding previously recorded in `LUC-806`.

### 4. Local encrypted secret provider is healthy and the master key ACL is narrowed

Status: `implemented and verified`

- `GET /api/companies/{companyId}/secret-providers/health` reports `local_encrypted` status `ok` on 2026-07-13.
- The provider message references the runtime key file at `.paperclip/runtime/home/instances/default/secrets/master.key`.
- Local ACL inspection shows access limited to the runtime user, `SYSTEM`, and `Administrators`.
- This closes the earlier July 12, 2026 key-permission blocker from `LUC-806`.

### 5. Production mutation remains gated behind explicit protected-write policy

Status: `implemented and verified`

- `docs/automation/agent-command-catalog.csv` classifies:
  - `Coolify status/log/read operation` as `safe_provider_read`
  - `Coolify deploy/restart/rollback/env mutation` as `protected_write`
- `docs/operations/coolify-vps-deployment-contract.md` requires a release mutation permit for deploy, restart, rollback, env mutation, DB mutation, and paid/subscription mutation.
- `softwarehouse/release-push-deploy-policy.md` also states that manual redeploy requires a release mutation permit.

## Residual Cleanup Debt

### Note 1. Zero-reference legacy aliases remain

Status: `implemented and verified`
Severity: `low`

- `vps_host` remains `active` with `referenceCount: 0`.
- `vps_ssh_private_key` remains `active` with `referenceCount: 0`.
- These are cleanup candidates, not readiness blockers.

### Note 2. External secret providers are not configured for this local runtime

Status: `present in code, behavior unknown for this deployment`
Severity: `low`

- `aws_secrets_manager`, `gcp_secret_manager`, and `vault` report `warn` in provider health.
- The active Stage 1 local path is still `local_encrypted`, and that provider is healthy.
- This is acceptable for the current local Software House lane and does not block the reviewed Coolify/VPS readiness question.

## Readiness Verdict

Overall result: `ready`

As of 2026-07-13, the LuckySparrow Software House local instance meets the reviewed Stage 1 security/access readiness bar for secrets, Coolify/VPS least privilege, and production mutation gating:

1. required names-only secret inventory exists;
2. reviewed sensitive env bindings use `secret_ref` objects instead of inline values;
3. deploy-token and VPS SSH bindings are reduced to the DRE-only owner path;
4. the local encrypted secret provider is healthy with narrowed ACLs on the key file; and
5. production mutation remains documented as protected-write work requiring explicit permit.

## Next Owner Path

- Routine owner for future recheck: `10 SPA`
- Optional cleanup owner for zero-ref aliases: `09 DRE`
