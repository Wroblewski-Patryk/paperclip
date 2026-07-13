# LUC-907 Secrets, Coolify, and VPS Access Readiness Review

Date: 2026-07-13
Issue: `LUC-907`
Reviewer: `10 SPA (Security & Privacy Auditor)`
Result: `ready with low-severity documentation drift`

## Scope

Review whether the LuckySparrow Software House local instance currently meets the
Stage 1 security/access readiness bar for:

- required Coolify/VPS and protected-smoke secret inventory;
- `secret_ref` usage instead of inline sensitive values in live agent configs;
- least-privilege access for Coolify deploy-token and VPS SSH material;
- production mutation gating for deploy/restart/rollback/env/database changes;
- local secret-provider health for the active runtime.

## Evidence Sources

- local-trusted board reads:
  - `GET /api/health`
  - `GET /api/companies/{companyId}/agents`
  - `GET /api/companies/{companyId}/secrets`
  - `GET /api/companies/{companyId}/secret-providers/health`
- local ACL inspection:
  - `Get-Acl .paperclip/runtime/home/instances/default/secrets/master.key`
- least-privilege readback:
  - `node scripts/repair-stage1-least-privilege-bindings.mjs --json`
- policy docs:
  - `docs/automation/agent-command-catalog.csv`
  - `docs/operations/coolify-vps-deployment-contract.md`
  - `docs/operations/soar-coolify-vps-contract.md`
  - `.agents/state/softwarehouse-secret-requirements.md`
  - `.agents/state/softwarehouse-resource-access-matrix.md`

## Verified Controls

### 1. Required reviewed secret inventory exists

Status: `implemented and verified`

- `GET /api/health` returned `status: ok` and `deploymentMode: local_trusted`.
- `GET /api/companies/{companyId}/secrets` returned `46` active managed secrets.
- All `12` reviewed Stage 1 secret refs were present and active, with no missing
  entries:
  - `coolify_read_api_token`
  - `coolify_deploy_api_token`
  - `coolify_project_id_soar`
  - `coolify_environment_uuid_soar_production`
  - `coolify_resource_uuid_soar_web`
  - `coolify_resource_uuid_soar_api`
  - `vps_ssh_host`
  - `vps_ssh_user`
  - `vps_ssh_private_key_path`
  - `vps_ssh_known_hosts`
  - `soar_prod_admin_smoke_email`
  - `soar_prod_admin_smoke_password`

### 2. Sensitive runtime env values are stored as secret refs, not inline values

Status: `implemented and verified`

- A live board-read scan of `GET /api/companies/{companyId}/agents` found:
  - `39` agents total
  - `17` agents with reviewed sensitive env bindings
  - `517` reviewed sensitive env bindings matching Coolify, VPS, smoke,
    token, password, secret, API-key, and known-host patterns
  - `0` non-`secret_ref` bindings in that reviewed set
- No inline plaintext sensitive values were observed in the reviewed agent env
  bindings.

### 3. Coolify deploy-token and VPS SSH access stay reduced to the DRE-only owner path

Status: `implemented and verified`

- `node scripts/repair-stage1-least-privilege-bindings.mjs --json` reported
  `plannedActions: []`.
- The only live holder of `COOLIFY_DEPLOY_API_TOKEN` is:
  - `09 DRE (Deployment & Reliability Engineer)`
- The only live holder of VPS SSH material is:
  - `09 DRE (Deployment & Reliability Engineer)`
- This confirms the least-privilege repair remains live and no re-broadening was
  detected in current runtime bindings.

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
- External providers (`aws_secrets_manager`, `gcp_secret_manager`, `vault`)
  report `warn` because they are not configured for this local runtime. That is
  not a blocker for the reviewed Stage 1 local-encrypted posture.

### 5. Production mutation remains gated as protected-write work

Status: `implemented and verified`

- `docs/automation/agent-command-catalog.csv` classifies:
  - Coolify status/log/read operations as `safe_provider_read`
  - Coolify deploy/restart/rollback/env mutation as `protected_write`
- `docs/operations/coolify-vps-deployment-contract.md` requires a release
  mutation permit for deploy, restart, rollback, env mutation, database
  mutation, and paid/subscription mutation.
- `docs/operations/soar-coolify-vps-contract.md` also keeps read-only resource
  observation separate from deploy/restart/rollback actions.

## Residual Risk And Drift

### Note 1. Zero-reference legacy aliases remain active

Status: `implemented and verified`
Severity: `low`

- `vps_host` remains `active` with `referenceCount: 0`.
- `vps_ssh_private_key` remains `active` with `referenceCount: 0`.
- These are cleanup candidates, not readiness blockers.

### Note 2. Access-policy docs still describe a broader Coolify/login holder set than runtime

Status: `present in docs, runtime is narrower`
Severity: `low`

- `.agents/state/softwarehouse-secret-requirements.md` still says:
  - Coolify deploy token is restricted to `00 AIA`, `09 CTO`, `09 DRE`, and `10 SPA`
  - login email/password refs are restricted to the same broader set
- `.agents/state/softwarehouse-resource-access-matrix.md` still lists the same
  broader Coolify deploy/login operator set.
- Live runtime evidence now shows deploy-token and VPS SSH bindings are narrowed
  to `09 DRE` only.
- This does not block current readiness, but it is documentation drift that
  could cause future re-broadening if left uncorrected.

## Readiness Verdict

Overall result: `ready`

As of 2026-07-13, the LuckySparrow Software House local instance meets the
reviewed Stage 1 security/access readiness bar for secrets, Coolify/VPS least
privilege, and production mutation gating:

1. required reviewed secret metadata exists;
2. reviewed sensitive env bindings use `secret_ref` objects instead of inline
   values;
3. deploy-token and VPS SSH access remain reduced to the DRE-only owner path;
4. the local encrypted provider is healthy with narrowed ACLs on the key file; and
5. production mutation remains documented as protected-write work requiring an
   explicit permit.

## Next Owner Path

- Routine recheck owner: `10 SPA`
- Optional cleanup owner for zero-ref aliases: `09 DRE`
- Optional documentation-drift owner path: `10 CLO` to Docs Memory / access-policy
  maintenance
