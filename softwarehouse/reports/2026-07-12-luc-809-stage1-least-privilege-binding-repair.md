# LUC-809 Stage 1 Least-Privilege Binding Repair

Date: 2026-07-12
Issue: `LUC-809`
Scope: reduce Stage 1 Coolify deploy-token and VPS SSH bindings to the minimum approved holder set for LuckySparrow Software House.

## Commands

- `node --check scripts/repair-stage1-least-privilege-bindings.mjs`
- `node scripts/repair-stage1-least-privilege-bindings.mjs --json`
- `node scripts/repair-stage1-least-privilege-bindings.mjs --apply --json`
- post-apply board readbacks:
  - `GET /api/companies/{companyId}/agents`
  - `GET /api/companies/{companyId}/secrets`

## Allowed Holder

- `09 DRE (Deployment & Reliability Engineer)`

## Before

### Coolify deploy token holders

- `00 AIA (AI Assistant)`
- `09 CTO (Chief Technology Officer)`
- `09 DRE (Deployment & Reliability Engineer)`
- `10 SPA (Security & Privacy Auditor)`

### VPS SSH material holders

- `00 AIA (AI Assistant)`
- `09 CTO (Chief Technology Officer)`
- `09 DRE (Deployment & Reliability Engineer)`
- `09 EDL (Engineering Delivery Lead)`
- `09 TSA (Technical Solution Architect)`
- `10 SPA (Security & Privacy Auditor)`

### Zero-ref alias classification

- `vps_host`: `referenceCount = 0`
- `vps_ssh_private_key`: `referenceCount = 0`

## Applied Change

- Added reusable repair command: `softwarehouse:least-privilege-bindings`
- Applied live binding removal for:
  - `00 AIA (AI Assistant)`: removed `COOLIFY_DEPLOY_API_TOKEN` and all `VPS_*` keys
  - `09 CTO (Chief Technology Officer)`: removed `COOLIFY_DEPLOY_API_TOKEN` and all `VPS_*` keys
  - `09 EDL (Engineering Delivery Lead)`: removed all `VPS_*` keys
  - `09 TSA (Technical Solution Architect)`: removed all `VPS_*` keys
  - `10 SPA (Security & Privacy Auditor)`: removed `COOLIFY_DEPLOY_API_TOKEN` and all `VPS_*` keys

## After

### Coolify deploy token holders

- `09 DRE (Deployment & Reliability Engineer)`

### VPS SSH material holders

- `09 DRE (Deployment & Reliability Engineer)`

### Secret reference counts after repair

- `coolify_deploy_api_token`: `1`
- `vps_ssh_host`: `2`
- `vps_ssh_port`: `1`
- `vps_ssh_user`: `1`
- `vps_ssh_private_key_path`: `2`
- `vps_ssh_private_key_passphrase`: `1`
- `vps_ssh_password`: `1`
- `vps_ssh_known_hosts`: `1`
- `vps_host`: `0`
- `vps_ssh_private_key`: `0`

## Result

Status: `implemented and verified`

- Stage 1 deploy-token and VPS SSH bindings now match the DRE-only owner path.
- Zero-ref aliases were classified, not deleted.
- No secret values were printed, copied into the repo, or posted to issue comments.
