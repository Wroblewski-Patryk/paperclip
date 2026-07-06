# Secrets, Deploys, And Evidence

Never write raw secrets into instructions, memory files, issue comments, logs, or docs. Use Paperclip secret refs and named environment bindings.

Coolify/VPS access is for observing deploy status, reading relevant logs, diagnosing failed deploys, and attaching evidence. Pushing, deployment changes, production restarts, paid-account mutation, destructive operations, and secret changes require the proper board gate.

Deploy-impacting work requires: repo path, git state, commit/push status, deploy status, smoke result, rollback note, and residual risk.

## Coolify Stage 0 Secret Refs

Deploy-capable and coordinating agents may receive Coolify runtime env bindings as Paperclip secret refs. Access is tiered:

- Coolify read observers may receive `COOLIFY_BASE_URL`, `COOLIFY_API_URL`, `COOLIFY_READ_API_TOKEN`, `COOLIFY_TEAM_ID_LUCKYSPARROW`, `COOLIFY_TEAM_NAME_LUCKYSPARROW`, Soar Coolify resource refs, Roost app refs, and app base URL refs.
- Coolify deploy operators may receive `COOLIFY_DEPLOY_API_TOKEN` only behind deploy/release gates.
- Coolify login operators may also receive `COOLIFY_LOGIN_EMAIL` and `COOLIFY_LOGIN_PASSWORD` for board-approved UI observation.
- Current login/deploy operators are `00 AIA`, `09 CTO`, `09 DRE`, `10 SPA`, and `12 CEO`.
- Current read-observer tier is documented in `.agents/state/softwarehouse-resource-access-matrix.md`.

Use these env vars when they are present. Do not ask the owner for raw Coolify values in comments or chat. If a required value is missing, report the exact missing secret/env name as a configuration defect.

Current configured Coolify/app refs include `COOLIFY_READ_API_TOKEN`, `COOLIFY_DEPLOY_API_TOKEN`, `COOLIFY_TEAM_ID_LUCKYSPARROW`, `COOLIFY_PROJECT_ID_SOAR`, `COOLIFY_PROJECT_UUID_SOAR`, `COOLIFY_ENVIRONMENT_UUID_SOAR_PRODUCTION`, `COOLIFY_RESOURCE_UUID_SOAR_WEB`, `COOLIFY_RESOURCE_UUID_SOAR_API`, worker/database resource refs, `COOLIFY_RESOURCE_UUID_ROOST_APP`, `SOAR_PROD_BASE_URL`, `SOAR_API_BASE_URL`, `ROOST_PROD_BASE_URL`, and `ROOST_API_BASE_URL`.

Production browser smoke accounts should use app-specific refs such as `SOAR_PROD_TEST_EMAIL`, `SOAR_PROD_TEST_PASSWORD`, `ROOST_PROD_TEST_EMAIL`, `ROOST_PROD_TEST_PASSWORD`, and `ROOST_PROD_TEST_WORKSPACE_NAME`. Never store those values in instructions or evidence.
