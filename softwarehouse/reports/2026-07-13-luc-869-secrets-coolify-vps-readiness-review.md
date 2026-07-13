# LUC-869 Secrets, Coolify, and VPS Access Readiness Review

Date: 2026-07-13
Issue: `LUC-869`
Reviewer: `10 SPA (Security & Privacy Auditor)`
Result: `ready with cleanup debt`

## Scope

Review whether the LuckySparrow Software House local instance currently meets the
Stage 1 readiness bar for:

- required Coolify/VPS and protected-smoke secret inventory;
- `secret_ref` usage instead of inline sensitive values in live agent configs;
- least-privilege access for Coolify deploy-token and VPS SSH material;
- production mutation gating for deploy/restart/rollback/env/database changes;
- local secret-provider health for the active runtime.

## Evidence Sources

- local-trusted board reads:
  - `GET /api/health`
  - `GET /api/companies/{companyId}/agents`
  - `GET /api/companies/{companyId}/secrets/metadata`
  - `GET /api/companies/{companyId}/secret-providers/health`
- local ACL inspection:
  - `Get-Acl .paperclip/runtime/home/instances/default/secrets/master.key`
- least-privilege repair readback:
  - `node scripts/repair-stage1-least-privilege-bindings.mjs --json`
- policy docs:
  - `docs/operations/coolify-vps-deployment-contract.md`
  - `docs/operations/soar-coolify-vps-contract.md`
  - `softwarehouse/release-push-deploy-policy.md`
  - `docs/automation/agent-command-catalog.csv`

## Verified Controls

### 1. Required reviewed secret inventory exists

Status: `implemented and verified`

- `GET /api/health` returned `deploymentMode: local_trusted` and `status: ok`.
- `GET /api/companies/{companyId}/secrets/metadata` returned `46` active managed
  secrets in `local_encrypted`.
- Reviewed required entries are active with recent resolution timestamps on
  2026-07-13, including:
  - `coolify_read_api_token`
  - `coolify_deploy_api_token`
  - `coolify_project_id_soar`
  - `coolify_environment_uuid_soar_production`
  - `coolify_resource_uuid_soar_*`
  - `vps_ssh_host`
  - `vps_ssh_user`
  - `vps_ssh_private_key_path`
  - `vps_ssh_known_hosts`
  - protected smoke refs for Soar admin-smoke review

### 2. Sensitive runtime env values are stored as secret refs, not inline values

Status: `implemented and verified`

- A live names-only scan of `GET /api/companies/{companyId}/agents` found:
  - `39` agents total
  - `17` agents with reviewed sensitive env bindings
  - `517` reviewed sensitive env bindings matching Coolify, VPS, smoke,
    token, password, secret, API-key, and known-host patterns
  - `0` non-`secret_ref` bindings in that reviewed set
- No inline plaintext sensitive values were observed in the reviewed agent env
  bindings.

### 3. Least-privilege repair is live for Coolify deploy-token and VPS SSH access

Status: `implemented and verified`

- `node scripts/repair-stage1-least-privilege-bindings.mjs --json` reported
  `plannedActions: []`.
- The only live holder of `COOLIFY_DEPLOY_API_TOKEN` is:
  - `09 DRE (Deployment & Reliability Engineer)`
- The only live holder of VPS SSH material is:
  - `09 DRE (Deployment & Reliability Engineer)`
- This matches the current repaired runtime state and removes the earlier
  over-distribution posture.

### 4. Local encrypted secret provider is healthy and the key ACL is narrowed

Status: `implemented and verified`

- `GET /api/companies/{companyId}/secret-providers/health` reported:
  - `local_encrypted: ok`
  - key file path under the repo-local Paperclip runtime
- `Get-Acl` on `.paperclip/runtime/home/instances/default/secrets/master.key`
  showed access limited to:
  - the runtime user
  - `SYSTEM`
  - `Administrators`
- The previous broad-permission warning is no longer present in the current
  provider health result.

### 5. Production mutation remains gated behind explicit protected-write policy

Status: `implemented and verified`

- `docs/automation/agent-command-catalog.csv` classifies:
  - Coolify status/log/read operations as `safe_provider_read`
  - Coolify deploy/restart/rollback/env mutation as `protected_write`
- `docs/operations/coolify-vps-deployment-contract.md` requires a release
  mutation permit for deploy, restart, rollback, env mutation, database
  mutation, and paid/subscription mutation.
- `softwarehouse/release-push-deploy-policy.md` also requires a release
  mutation permit for manual redeploy and other protected production actions.

## Residual Cleanup Debt

### Note 1. Zero-reference legacy aliases remain active

Status: `implemented and verified`
Severity: `low`

- `vps_host` remains `active` with `referenceCount: 0`.
- `vps_ssh_private_key` remains `active` with `referenceCount: 0`.
- These are cleanup candidates, not readiness blockers.

### Note 2. Access-policy docs drift behind the repaired runtime bindings

Status: `present in docs, runtime is narrower`
Severity: `low`

- `.agents/state/softwarehouse-resource-access-matrix.md` still lists
  `00 AIA`, `09 CTO`, `09 DRE`, and `10 SPA` as Coolify deploy/login operators.
- `.agents/state/softwarehouse-secret-requirements.md` still says deploy-token
  and login refs are restricted to that broader set.
- Live runtime evidence now shows the deploy-token and VPS SSH owner path is
  narrowed to `09 DRE` only.
- This does not block readiness, but it is documentation drift that could cause
  future re-broadening if left uncorrected.

## Readiness Verdict

Overall result: `ready`

As of 2026-07-13, the LuckySparrow Software House local instance meets the
reviewed Stage 1 security/access readiness bar for secrets, Coolify/VPS least
privilege, and production mutation gating:

1. required reviewed secret metadata exists;
2. reviewed sensitive env bindings use `secret_ref` objects instead of inline
   values;
3. deploy-token and VPS SSH access are reduced to the DRE-only owner path;
4. the local encrypted provider is healthy and the key ACL is narrowed; and
5. production mutation remains documented as protected-write work requiring an
   explicit permit.

## Next Owner Path

- Routine recheck owner: `10 SPA`
- Optional cleanup owner for zero-ref aliases: `09 DRE`
- Optional cleanup owner for documentation drift: route through `10 CLO` to the
  Docs Memory path
