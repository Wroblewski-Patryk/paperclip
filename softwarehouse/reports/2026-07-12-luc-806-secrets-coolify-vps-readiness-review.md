# LUC-806 Secrets, Coolify, and VPS Access Readiness Review

Date: 2026-07-12
Issue: `LUC-806`
Reviewer: `10 SPA (Security & Privacy Auditor)`
Result: `not ready`

## Scope

Review whether the LuckySparrow Software House local instance currently meets the Stage 1 readiness bar for:

- secret-ref usage instead of inline raw values;
- Coolify and VPS access scoped by least privilege;
- production mutation gated behind explicit approval/permit;
- local secret-provider health.

## Evidence Sources

- `GET /api/companies/{companyId}/secrets` on the local-trusted board surface
- `GET /api/companies/{companyId}/agents` on the local-trusted board surface
- `GET /api/companies/{companyId}/secret-providers/health`
- [docs/operations/coolify-vps-deployment-contract.md](/abs/path/C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/docs/operations/coolify-vps-deployment-contract.md:1)
- [softwarehouse/coolify-resource-model.md](/abs/path/C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/softwarehouse/coolify-resource-model.md:1)
- [softwarehouse/release-push-deploy-policy.md](/abs/path/C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/softwarehouse/release-push-deploy-policy.md:1)
- [docs/automation/agent-command-catalog.csv](/abs/path/C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/docs/automation/agent-command-catalog.csv:42)
- [softwarehouse/local-config.example.json](/abs/path/C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/softwarehouse/local-config.example.json:1)

## Verified Controls

### 1. Secret inventory exists and is actively referenced

Status: `implemented and verified`

- The local board secret inventory currently contains 46 managed secrets.
- 37 matched the Coolify, VPS, smoke-account, or related production-access scope inspected for this review.
- Relevant entries are active and recently resolved on 2026-07-12, including:
  - `coolify_read_api_token`
  - `coolify_deploy_api_token`
  - `coolify_project_id_soar`
  - `coolify_environment_uuid_soar_production`
  - `coolify_resource_uuid_soar_*`
  - `vps_ssh_host`
  - `vps_ssh_user`
  - `vps_ssh_private_key_path`
  - `vps_ssh_known_hosts`

### 2. Sensitive runtime env values are not stored inline in live agent configs

Status: `implemented and verified`

- For all 39 live agents, the inspected sensitive env keys matching `COOLIFY`, `VPS_`, `SMOKE_`, `TOKEN`, `PASSWORD`, `SECRET`, `API_KEY`, and `KNOWN_HOSTS` were checked.
- No inline plaintext values were found in those env entries.
- The inspected sensitive entries were all persisted as `secret_ref` objects.

### 3. Production mutation policy is documented as gated

Status: `implemented and verified`

- The command catalog classifies:
  - Coolify read/status/log operations as `safe_provider_read`
  - Coolify deploy/restart/rollback/env mutation as `protected_write`
- The deployment contract and release policy require a release mutation permit for deploy, restart, rollback, env mutation, DB mutation, and paid/live account mutation.

## Blocking Findings

### Finding 1. Local encrypted secret key file permissions are too broad

Status: `implemented but not verified safe`
Severity: `high`

Evidence:

- `GET /api/companies/{companyId}/secret-providers/health` returned provider status `warn`.
- Warning text: secret key file permissions are `666` for:
  - `C:\Personal\Projekty\Aplikacje\Paperclip_Softwarehouse\.paperclip\runtime\home\instances\default\secrets\master.key`

Why this blocks readiness:

- The configured provider is `local_encrypted`.
- A world-readable or broadly writable master key materially weakens the secrecy boundary for all locally encrypted company secrets.
- This is a direct contradiction of the expected local secret-manager safety baseline.

Required action:

- Restrict the key file to the runtime owner only.
- Re-run secret provider health and record a clean result.

### Finding 2. Coolify and VPS credentials are over-distributed relative to least-privilege policy

Status: `implemented but not least-privilege`
Severity: `high`

Evidence:

- 18 live agents currently carry Coolify and/or VPS access-related secret refs.
- 17 live agents currently hold read-capable Coolify credentials or equivalent read aliases.
- 6 live agents currently hold VPS SSH access material.
- 4 live agents currently hold the deploy-scoped Coolify token:
  - `09 CTO (Chief Technology Officer)`
  - `00 AIA (AI Assistant)`
  - `09 DRE (Deployment & Reliability Engineer)`
  - `10 SPA (Security & Privacy Auditor)`

Why this blocks readiness:

- Policy and command catalog ownership place Coolify/VPS provider reads under Ops-led handling and production mutation behind explicit protected-write gates.
- The live bindings are broader than the narrow roles needed for those operations.
- The strongest mismatch is deploy-token access outside the Ops-led path.
- Even if instructions tell agents not to mutate production, wide secret distribution is not least privilege.

Required action:

- Reduce deploy-scoped Coolify credentials to the minimum approved role set.
- Re-check whether broad read-only Coolify and VPS access is actually needed for non-Ops/non-Security roles.
- Remove legacy or convenience aliases that are no longer required once callers are updated.

## Non-Blocking Notes

Status: `implemented and verified`

- Compatibility aliases with `referenceCount: 0` currently exist for:
  - `vps_host`
  - `vps_ssh_private_key`
- This is cleanup debt, not the primary blocker.
- The active secret provider remains `local_encrypted` with `strictMode: false` in the tracked example config. That is accepted local-phase debt, but it should not be treated as a production-grade posture.

## Readiness Verdict

Overall result: `blocked`

The reviewed environment passes the basic "secrets exist and are referenced via `secret_ref`" test, and the mutation gate is documented. It does not currently meet access-readiness expectations because:

1. the local encrypted master key file permissions are unsafe; and
2. Coolify/VPS access is broader than the least-privilege policy allows.

## Next Owner Path

- Security routing owner: `10 CLO`
- Expected collaborating owner after routing: `09 DRE`
- Recheck owner after remediation: `10 SPA`
