# Softwarehouse Unblock Packet

Generated at: state-stable; use file mtime for freshness

This packet is generated from the local Paperclip API. It intentionally redacts secret values and records only metadata needed for safe gate decisions.

## Runtime

| Field | Value |
| --- | --- |
| API base | http://127.0.0.1:3200 |
| Company | ae26bb8b-8f5f-4a85-b341-78d4e1985975 |
| restartRequired | false |
| activeRunCount | state-stable; run pnpm softwarehouse:control-tick for live runtime counts |
| liveRunCount | state-stable; run pnpm softwarehouse:control-tick for live runtime counts |

## Gate Summary

| Project | Gate | Status | Owner | Fresh? | Latest evidence | Blocked issues | Allowed next action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Soar/Roost | LUC-30 | done | 09 DRE (Deployment & Reliability Engineer) | no | passed: Public smoke is still green: Soar API `/health`, Soar API `/ready`, Soar web, Roost API `/health`, and Roost web all returned `200` after the deploy queue wait. | 0 | Gate issue is terminal in the current tree; route any new finding as a fresh child/work item instead of resuming this gate. |
| Soar/Roost | LUC-31 | done | 09 QVE (QA & Verification Engineer) | no | passed: Soar accepted via [LUC-34](/LUC/issues/LUC-34): final strict RC Gate 1-4 `PASS`, `strictPassed=true`, protected production smoke passed for deployed `cf9011b43060c52941dae9232e9... | 0 | Gate issue is terminal in the current tree; route any new finding as a fresh child/work item instead of resuming this gate. |
| Soar/Roost | LUC-32 | done | 10 SPA (Security & Privacy Auditor) | no | passed: I reran the Soar targeted security slice after local Prisma client generation: 4 files passed, 18 tests passed, 0 failed. | 0 | Gate issue is terminal in the current tree; route any new finding as a fresh child/work item instead of resuming this gate. |

## Gate Details

### Soar/Roost / LUC-30

| Field | Value |
| --- | --- |
| Title | 09 Technology: VPS/Coolify deployment execution path |
| Status | done |
| Updated at | 2026-07-04T20:43:04.046Z |
| Owner | 09 DRE (Deployment & Reliability Engineer) |
| Purpose | VPS/Coolify deployment path and read-only production resource observation for Soar and Roost. |
| Allowed action | One read-only Coolify project/resource/deployment status recheck after current Coolify credential/resource metadata is present. |
| Forbidden action | No deploy trigger, restart, rollback, env mutation, push, shell mutation, or unrelated production probing. |
| Evidence required | Coolify project/team/resource metadata presence, exact read-only command or UI path, timestamp, resource statuses, and any unhealthy resource. |
| Accepted fresh facts | Coolify read token, team, project, environment, and resource ids are bound to the responsible runtime as secret refs.<br>A fresh Coolify reconciler run records pass/fail status for Soar/Roost resources without exposing secret values.<br>Explicit issue comment approving one read-only Coolify deployment/status recheck. |
| Operator prompt | Ensure Coolify read-only metadata is available through Paperclip secret refs; then allow exactly one deployment/resource status recheck and route any unhealthy resource to DRE/QVE/SPA. |
| Approval dry-run command | node scripts/record-softwarehouse-gate-approval.mjs --gate=LUC-30 |
| Approval apply command | node scripts/record-softwarehouse-gate-approval.mjs --gate=LUC-30 --apply |
| Recheck handoff | After current Coolify metadata exists, 09 DRE may run exactly one read-only Coolify status/log/resource recheck, then must post pass/fail evidence and route any unhealthy resource without mutating production. |
| Latest tracked secret freshness | 2026-08-03T21:27:22.508Z |
| Missing direct company secret keys | none |
| Covered by runtime aliases | coolify_api_token -> coolify_read_api_token, coolify_token -> coolify_read_api_token, coolify_team_id -> coolify_team_id_luckysparrow, coolify_soar_team_id -> coolify_team_id_luckysparrow, coolify_soar_project_id -> coolify_project_id_soar, coolify_soar_project_uuid -> coolify_project_uuid_soar, coolify_soar_production_environment -> coolify_environment_uuid_soar_production, coolify_soar_app_id -> coolify_resource_uuid_soar_web, coolify_soar_api_app_id -> coolify_resource_uuid_soar_api, coolify_soar_web_app_id -> coolify_resource_uuid_soar_web, coolify_soar_worker_backtest_app_id -> coolify_resource_uuid_soar_worker_backtest, coolify_soar_worker_execution_app_id -> coolify_resource_uuid_soar_worker_execution, coolify_soar_worker_market_data_app_id -> coolify_resource_uuid_soar_worker_market_data, coolify_soar_worker_market_stream_app_id -> coolify_resource_uuid_soar_worker_market_stream, coolify_soar_postgres_resource_id -> coolify_database_uuid_soar_postgresql, coolify_soar_redis_resource_id -> coolify_database_uuid_soar_redis, coolify_roost_app_id -> coolify_resource_uuid_roost_app |
| Secret updated after blocker | true |
| Explicit approval/evidence comment | false |
| Latest comment placeholder-only | false |
| Latest gate evidence status | passed |
| Latest gate evidence at | 2026-07-04T16:28:38.890Z |
| Latest gate evidence summary | Public smoke is still green: Soar API `/health`, Soar API `/ready`, Soar web, Roost API `/health`, and Roost web all returned `200` after the deploy queue wait. |
| Latest failure signals | none |
| Latest pass signals | Public smoke is still green: Soar API `/health`, Soar API `/ready`, Soar web, Roost API `/health`, and Roost web all returned `200` after the deploy queue wait. |

Tracked secret metadata:

| Key | Status | Latest version | Freshness at | Last rotated | Created at | Has value metadata |
| --- | --- | --- | --- | --- | --- | --- |
| coolify_base_url | active | 1 | 2026-07-04T00:21:08.369Z | 2026-07-04T00:21:08.369Z | 2026-07-04T00:21:08.334Z | true |
| coolify_read_api_token | active | 3 | 2026-08-03T21:27:22.508Z | 2026-08-03T21:27:22.508Z | 2026-07-04T00:37:27.407Z | true |
| coolify_team_id_luckysparrow | active | 1 | 2026-07-04T00:37:27.524Z | 2026-07-04T00:37:27.524Z | 2026-07-04T00:37:27.502Z | true |
| coolify_project_id_soar | active | 1 | 2026-07-04T00:37:27.619Z | 2026-07-04T00:37:27.619Z | 2026-07-04T00:37:27.601Z | true |
| coolify_project_uuid_soar | active | 1 | 2026-07-04T00:37:27.672Z | 2026-07-04T00:37:27.672Z | 2026-07-04T00:37:27.654Z | true |
| coolify_environment_uuid_soar_production | active | 1 | 2026-07-04T00:37:27.719Z | 2026-07-04T00:37:27.719Z | 2026-07-04T00:37:27.700Z | true |
| coolify_resource_uuid_soar_web | active | 1 | 2026-07-04T00:37:27.763Z | 2026-07-04T00:37:27.763Z | 2026-07-04T00:37:27.751Z | true |
| coolify_resource_uuid_soar_api | active | 1 | 2026-07-04T00:37:27.802Z | 2026-07-04T00:37:27.802Z | 2026-07-04T00:37:27.792Z | true |
| coolify_resource_uuid_soar_worker_backtest | active | 1 | 2026-07-04T00:37:27.846Z | 2026-07-04T00:37:27.846Z | 2026-07-04T00:37:27.834Z | true |
| coolify_resource_uuid_soar_worker_execution | active | 1 | 2026-07-04T00:37:27.885Z | 2026-07-04T00:37:27.885Z | 2026-07-04T00:37:27.872Z | true |
| coolify_resource_uuid_soar_worker_market_data | active | 1 | 2026-07-04T00:37:27.933Z | 2026-07-04T00:37:27.933Z | 2026-07-04T00:37:27.913Z | true |
| coolify_resource_uuid_soar_worker_market_stream | active | 1 | 2026-07-04T00:37:27.973Z | 2026-07-04T00:37:27.973Z | 2026-07-04T00:37:27.961Z | true |
| coolify_database_uuid_soar_postgresql | active | 1 | 2026-07-04T00:37:28.016Z | 2026-07-04T00:37:28.016Z | 2026-07-04T00:37:27.999Z | true |
| coolify_database_uuid_soar_redis | active | 1 | 2026-07-04T00:37:28.061Z | 2026-07-04T00:37:28.061Z | 2026-07-04T00:37:28.048Z | true |
| coolify_resource_uuid_roost_app | active | 1 | 2026-07-04T00:37:28.276Z | 2026-07-04T00:37:28.276Z | 2026-07-04T00:37:28.261Z | true |

Blocked issue sample:

| Issue | Status | Assignee | Title |
| --- | --- | --- | --- |

### Soar/Roost / LUC-31

| Field | Value |
| --- | --- |
| Title | 09 Technology: Production readiness verification for Soar/Roost |
| Status | done |
| Updated at | 2026-07-04T21:54:06.815Z |
| Owner | 09 QVE (QA & Verification Engineer) |
| Purpose | Production readiness verification for Soar and Roost through non-destructive smoke/user-flow proof. |
| Allowed action | One non-destructive smoke/readiness recheck after app test-account metadata or owner-approved read-only proof path is present. |
| Forbidden action | No deploy, restart, production data mutation, live trading/order action, destructive Roost file operation, secret disclosure, or unrelated probing. |
| Evidence required | Smoke account metadata presence, exact command or UI path, timestamp, endpoint/workflow tested, pass/fail result, and next blocker if any. |
| Accepted fresh facts | Soar or Roost production smoke credentials are bound as secret refs for the responsible verifier.<br>A fresh production smoke/readiness run records pass/fail evidence without exposing credentials.<br>Explicit issue comment approving one protected production smoke recheck. |
| Operator prompt | Ensure dedicated Soar/Roost smoke-account refs are available; then allow exactly one non-destructive smoke/readiness recheck and record evidence. |
| Approval dry-run command | node scripts/record-softwarehouse-gate-approval.mjs --gate=LUC-31 |
| Approval apply command | node scripts/record-softwarehouse-gate-approval.mjs --gate=LUC-31 --apply |
| Recheck handoff | After current smoke-account metadata exists, 09 QVE may run exactly one non-destructive production readiness recheck and must post pass/fail evidence. |
| Latest tracked secret freshness | 2026-07-23T13:35:02.766Z |
| Missing direct company secret keys | smoke_auth_email, smoke_auth_password |
| Covered by runtime aliases | none |
| Secret updated after blocker | true |
| Explicit approval/evidence comment | false |
| Latest comment placeholder-only | false |
| Latest gate evidence status | passed |
| Latest gate evidence at | 2026-07-04T21:54:06.811Z |
| Latest gate evidence summary | Soar accepted via [LUC-34](/LUC/issues/LUC-34): final strict RC Gate 1-4 `PASS`, `strictPassed=true`, protected production smoke passed for deployed `cf9011b43060c52941dae9232e9... |
| Latest failure signals | none |
| Latest pass signals | Soar accepted via [LUC-34](/LUC/issues/LUC-34): final strict RC Gate 1-4 `PASS`, `strictPassed=true`, protected production smoke passed for deployed `cf9011b43060c52941dae9232e9...<br>Command run: `node scripts/summarizeRcGates.mjs` from `C:/Personal/Projekty/Aplikacje/Soar` returned Gate 1 `PASS`, Gate 2 `PASS`, Gate 3 `PASS`, Gate 4 `PASS`; freshness metada... |

Tracked secret metadata:

| Key | Status | Latest version | Freshness at | Last rotated | Created at | Has value metadata |
| --- | --- | --- | --- | --- | --- | --- |
| soar_prod_base_url | active | 1 | 2026-07-04T00:37:28.103Z | 2026-07-04T00:37:28.103Z | 2026-07-04T00:37:28.088Z | true |
| soar_api_base_url | active | 1 | 2026-07-04T00:37:28.155Z | 2026-07-04T00:37:28.155Z | 2026-07-04T00:37:28.129Z | true |
| soar_prod_test_email | active | 1 | 2026-07-04T00:37:28.189Z | 2026-07-04T00:37:28.189Z | 2026-07-04T00:37:28.180Z | true |
| soar_prod_test_password | active | 2 | 2026-07-23T13:35:02.744Z | 2026-07-23T13:35:02.744Z | 2026-07-04T00:37:28.216Z | true |
| soar_prod_admin_smoke_email | active | 1 | 2026-07-04T17:00:52.154Z | 2026-07-04T17:00:52.154Z | 2026-07-04T17:00:52.114Z | true |
| soar_prod_admin_smoke_password | active | 1 | 2026-07-04T17:00:52.189Z | 2026-07-04T17:00:52.189Z | 2026-07-04T17:00:52.175Z | true |
| roost_prod_base_url | active | 1 | 2026-07-04T00:37:28.317Z | 2026-07-04T00:37:28.317Z | 2026-07-04T00:37:28.302Z | true |
| roost_api_base_url | active | 1 | 2026-07-04T00:37:28.353Z | 2026-07-04T00:37:28.353Z | 2026-07-04T00:37:28.342Z | true |
| roost_prod_test_email | active | 2 | 2026-07-04T16:48:00.931Z | 2026-07-04T16:48:00.931Z | 2026-07-04T00:37:28.384Z | true |
| roost_prod_test_password | active | 3 | 2026-07-23T13:35:02.766Z | 2026-07-23T13:35:02.766Z | 2026-07-04T00:37:28.433Z | true |
| roost_prod_test_workspace_name | active | 2 | 2026-07-04T16:48:01.293Z | 2026-07-04T16:48:01.293Z | 2026-07-04T00:37:28.474Z | true |

Blocked issue sample:

| Issue | Status | Assignee | Title |
| --- | --- | --- | --- |

### Soar/Roost / LUC-32

| Field | Value |
| --- | --- |
| Title | 10 Legal: Security secrets and production safety gate for Soar/Roost |
| Status | done |
| Updated at | 2026-07-04T13:47:06.703Z |
| Owner | 10 SPA (Security & Privacy Auditor) |
| Purpose | Security, secrets, and production-safety gate for Soar/Roost release and protected operations. |
| Allowed action | One redacted secret/resource metadata and safety-policy recheck after current Paperclip secret refs are bound. |
| Forbidden action | No raw secret exposure, secret rotation, production mutation, deploy/restart, paid service change, legal/customer/finance commitment, or LIVE trading/order proof. |
| Evidence required | Names-only secret/resource readiness, least-privilege binding scope, timestamp, safety decision, and residual risk. |
| Accepted fresh facts | Current Coolify/readiness/smoke secret refs are present and bound with least-privilege runtime scope.<br>A fresh SPA/DRE/QVE safety recheck records names-only readiness and any remaining protected-action blockers.<br>Explicit issue comment approving one redacted safety-gate recheck. |
| Operator prompt | Verify secret refs and least-privilege runtime access by metadata only; do not expose values, mutate secrets, or approve destructive production actions. |
| Approval dry-run command | node scripts/record-softwarehouse-gate-approval.mjs --gate=LUC-32 |
| Approval apply command | node scripts/record-softwarehouse-gate-approval.mjs --gate=LUC-32 --apply |
| Recheck handoff | After current secret/resource metadata exists, 10 SPA may run exactly one redacted safety-gate recheck and must post names-only evidence plus residual risk. |
| Latest tracked secret freshness | 2026-08-03T21:29:58.026Z |
| Missing direct company secret keys | coolify_api_url |
| Covered by runtime aliases | none |
| Secret updated after blocker | true |
| Explicit approval/evidence comment | false |
| Latest comment placeholder-only | false |
| Latest gate evidence status | passed |
| Latest gate evidence at | 2026-07-04T13:47:06.692Z |
| Latest gate evidence summary | I reran the Soar targeted security slice after local Prisma client generation: 4 files passed, 18 tests passed, 0 failed. |
| Latest failure signals | none |
| Latest pass signals | I reran the Soar targeted security slice after local Prisma client generation: 4 files passed, 18 tests passed, 0 failed.<br>[LUC-42](/LUC/issues/LUC-42) is done; Roost focused production env/CORS/security tests passed 6/6 on a safe local `companycore_test` DB with credentials redacted.<br>Roost has an unrelated full API-suite protected-flow failure noted by [LUC-42](/LUC/issues/LUC-42); the focused security/env gate passed. |

Tracked secret metadata:

| Key | Status | Latest version | Freshness at | Last rotated | Created at | Has value metadata |
| --- | --- | --- | --- | --- | --- | --- |
| coolify_read_api_token | active | 3 | 2026-08-03T21:27:22.508Z | 2026-08-03T21:27:22.508Z | 2026-07-04T00:37:27.407Z | true |
| coolify_deploy_api_token | active | 3 | 2026-08-03T21:29:58.026Z | 2026-08-03T21:29:58.026Z | 2026-07-04T00:37:27.447Z | true |
| coolify_base_url | active | 1 | 2026-07-04T00:21:08.369Z | 2026-07-04T00:21:08.369Z | 2026-07-04T00:21:08.334Z | true |
| coolify_team_id_luckysparrow | active | 1 | 2026-07-04T00:37:27.524Z | 2026-07-04T00:37:27.524Z | 2026-07-04T00:37:27.502Z | true |
| coolify_project_id_soar | active | 1 | 2026-07-04T00:37:27.619Z | 2026-07-04T00:37:27.619Z | 2026-07-04T00:37:27.601Z | true |
| coolify_project_uuid_soar | active | 1 | 2026-07-04T00:37:27.672Z | 2026-07-04T00:37:27.672Z | 2026-07-04T00:37:27.654Z | true |
| coolify_environment_uuid_soar_production | active | 1 | 2026-07-04T00:37:27.719Z | 2026-07-04T00:37:27.719Z | 2026-07-04T00:37:27.700Z | true |
| coolify_resource_uuid_soar_web | active | 1 | 2026-07-04T00:37:27.763Z | 2026-07-04T00:37:27.763Z | 2026-07-04T00:37:27.751Z | true |
| coolify_resource_uuid_soar_api | active | 1 | 2026-07-04T00:37:27.802Z | 2026-07-04T00:37:27.802Z | 2026-07-04T00:37:27.792Z | true |
| coolify_resource_uuid_roost_app | active | 1 | 2026-07-04T00:37:28.276Z | 2026-07-04T00:37:28.276Z | 2026-07-04T00:37:28.261Z | true |
| soar_prod_base_url | active | 1 | 2026-07-04T00:37:28.103Z | 2026-07-04T00:37:28.103Z | 2026-07-04T00:37:28.088Z | true |
| soar_api_base_url | active | 1 | 2026-07-04T00:37:28.155Z | 2026-07-04T00:37:28.155Z | 2026-07-04T00:37:28.129Z | true |
| roost_prod_base_url | active | 1 | 2026-07-04T00:37:28.317Z | 2026-07-04T00:37:28.317Z | 2026-07-04T00:37:28.302Z | true |
| roost_api_base_url | active | 1 | 2026-07-04T00:37:28.353Z | 2026-07-04T00:37:28.353Z | 2026-07-04T00:37:28.342Z | true |

Blocked issue sample:

| Issue | Status | Assignee | Title |
| --- | --- | --- | --- |

## Operating Decision

No non-terminal gate is fresh. Do not resume blocked delivery lanes; keep monitoring and wait for a new operator/credential fact.

## Agent Handoff

- If a gate is not fresh, PMs and specialist agents must stay quiet instead of reseeding the same lane.
- If operator approval is needed, show the operator prompt and approval commands, but do not run the apply command without explicit approval.
- If a gate becomes fresh, resume exactly one responsible lane and require the evidence listed above.
- If the lane fails, return the root blocker to `blocked` with exact owner/action and wait for a new fact.
- Do not treat this packet as approval for production mutation.

