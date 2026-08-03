# Task Synchronization Report

Generated: 2026-08-03T14:48:09.744Z

## Contract

Every task should identify the feature/module it changes, dependency expectations, affected files, test requirements, docs requirements, and proof links.

## Signals

- Actionable tasks without architecture links: 0
- Raw tasks without architecture links: 0
- Actionable implementation entities without task links: 1993
- Raw implementation entities without task links: 2125
- Classified task-linkage noise: 132
- Verified entities without proof evidence: 0

## Classified Task-Linkage Noise

- config_only_file: 132

## Actionable Tasks Without Architecture Links


## Actionable Implementation Without Task Links

- api_endpoint: USE /api (server/src/app.ts#/api)
- api_endpoint: USE /api/auth (server/src/app.ts#/api/auth)
- api_endpoint: USE /assets (server/src/app.ts#/assets)
- api_endpoint: GET /admin/users (server/src/routes/access.ts#/admin/users)
- api_endpoint: GET /admin/users/:userId/company-access (server/src/routes/access.ts#/admin/users/:userId/company-access)
- api_endpoint: PUT /admin/users/:userId/company-access (server/src/routes/access.ts#/admin/users/:userId/company-access)
- api_endpoint: POST /admin/users/:userId/demote-instance-admin (server/src/routes/access.ts#/admin/users/:userId/demote-instance-admin)
- api_endpoint: POST /admin/users/:userId/promote-instance-admin (server/src/routes/access.ts#/admin/users/:userId/promote-instance-admin)
- api_endpoint: GET /board-claim/:token (server/src/routes/access.ts#/board-claim/:token)
- api_endpoint: POST /board-claim/:token/claim (server/src/routes/access.ts#/board-claim/:token/claim)
- api_endpoint: POST /bootstrap/claim (server/src/routes/access.ts#/bootstrap/claim)
- api_endpoint: POST /cli-auth/challenges (server/src/routes/access.ts#/cli-auth/challenges)
- api_endpoint: GET /cli-auth/challenges/:id (server/src/routes/access.ts#/cli-auth/challenges/:id)
- api_endpoint: POST /cli-auth/challenges/:id/approve (server/src/routes/access.ts#/cli-auth/challenges/:id/approve)
- api_endpoint: POST /cli-auth/challenges/:id/cancel (server/src/routes/access.ts#/cli-auth/challenges/:id/cancel)
- api_endpoint: GET /cli-auth/me (server/src/routes/access.ts#/cli-auth/me)
- api_endpoint: POST /cli-auth/revoke-current (server/src/routes/access.ts#/cli-auth/revoke-current)
- api_endpoint: GET /companies/:companyId/invites (server/src/routes/access.ts#/companies/:companyId/invites)
- api_endpoint: POST /companies/:companyId/invites (server/src/routes/access.ts#/companies/:companyId/invites)
- api_endpoint: GET /companies/:companyId/join-requests (server/src/routes/access.ts#/companies/:companyId/join-requests)
- api_endpoint: POST /companies/:companyId/join-requests/:requestId/approve (server/src/routes/access.ts#/companies/:companyId/join-requests/:requestId/approve)
- api_endpoint: POST /companies/:companyId/join-requests/:requestId/reject (server/src/routes/access.ts#/companies/:companyId/join-requests/:requestId/reject)
- api_endpoint: GET /companies/:companyId/members (server/src/routes/access.ts#/companies/:companyId/members)
- api_endpoint: PATCH /companies/:companyId/members/:memberId (server/src/routes/access.ts#/companies/:companyId/members/:memberId)
- api_endpoint: POST /companies/:companyId/members/:memberId/archive (server/src/routes/access.ts#/companies/:companyId/members/:memberId/archive)
- api_endpoint: PATCH /companies/:companyId/members/:memberId/permissions (server/src/routes/access.ts#/companies/:companyId/members/:memberId/permissions)
- api_endpoint: PATCH /companies/:companyId/members/:memberId/role-and-grants (server/src/routes/access.ts#/companies/:companyId/members/:memberId/role-and-grants)
- api_endpoint: POST /companies/:companyId/openclaw/invite-prompt (server/src/routes/access.ts#/companies/:companyId/openclaw/invite-prompt)
- api_endpoint: GET /companies/:companyId/user-directory (server/src/routes/access.ts#/companies/:companyId/user-directory)
- api_endpoint: POST /invites/:inviteId/revoke (server/src/routes/access.ts#/invites/:inviteId/revoke)
- api_endpoint: GET /invites/:token (server/src/routes/access.ts#/invites/:token)
- api_endpoint: POST /invites/:token/accept (server/src/routes/access.ts#/invites/:token/accept)
- api_endpoint: GET /invites/:token/logo (server/src/routes/access.ts#/invites/:token/logo)
- api_endpoint: GET /invites/:token/onboarding (server/src/routes/access.ts#/invites/:token/onboarding)
- api_endpoint: GET /invites/:token/onboarding.txt (server/src/routes/access.ts#/invites/:token/onboarding.txt)
- api_endpoint: GET /invites/:token/skills/:skillName (server/src/routes/access.ts#/invites/:token/skills/:skillName)
- api_endpoint: GET /invites/:token/skills/index (server/src/routes/access.ts#/invites/:token/skills/index)
- api_endpoint: GET /invites/:token/test-resolution (server/src/routes/access.ts#/invites/:token/test-resolution)
- api_endpoint: POST /join-requests/:requestId/claim-api-key (server/src/routes/access.ts#/join-requests/:requestId/claim-api-key)
- api_endpoint: GET /skills/:skillName (server/src/routes/access.ts#/skills/:skillName)
- api_endpoint: GET /skills/available (server/src/routes/access.ts#/skills/available)
- api_endpoint: GET /skills/index (server/src/routes/access.ts#/skills/index)
- api_endpoint: GET /companies/:companyId/activity (server/src/routes/activity.ts#/companies/:companyId/activity)
- api_endpoint: POST /companies/:companyId/activity (server/src/routes/activity.ts#/companies/:companyId/activity)
- api_endpoint: GET /heartbeat-runs/:runId/issues (server/src/routes/activity.ts#/heartbeat-runs/:runId/issues)
- api_endpoint: GET /issues/:id/activity (server/src/routes/activity.ts#/issues/:id/activity)
- api_endpoint: GET /issues/:id/recovery-run-evidence (server/src/routes/activity.ts#/issues/:id/recovery-run-evidence)
- api_endpoint: GET /issues/:id/runs (server/src/routes/activity.ts#/issues/:id/runs)
- api_endpoint: GET /adapters (server/src/routes/adapters.ts#/adapters)
- api_endpoint: DELETE /adapters/:type (server/src/routes/adapters.ts#/adapters/:type)
- api_endpoint: PATCH /adapters/:type (server/src/routes/adapters.ts#/adapters/:type)
- api_endpoint: GET /adapters/:type/config-schema (server/src/routes/adapters.ts#/adapters/:type/config-schema)
- api_endpoint: PATCH /adapters/:type/override (server/src/routes/adapters.ts#/adapters/:type/override)
- api_endpoint: POST /adapters/:type/reinstall (server/src/routes/adapters.ts#/adapters/:type/reinstall)
- api_endpoint: POST /adapters/:type/reload (server/src/routes/adapters.ts#/adapters/:type/reload)
- api_endpoint: GET /adapters/:type/ui-parser.js (server/src/routes/adapters.ts#/adapters/:type/ui-parser.js)
- api_endpoint: POST /adapters/install (server/src/routes/adapters.ts#/adapters/install)
- api_endpoint: GET /companies/:companyId/admission-controls (server/src/routes/admission-control.ts#/companies/:companyId/admission-controls)
- api_endpoint: POST /companies/:companyId/admission-controls/transition (server/src/routes/admission-control.ts#/companies/:companyId/admission-controls/transition)
- api_endpoint: DELETE /agents/:id (server/src/routes/agents.ts#/agents/:id)
- api_endpoint: GET /agents/:id (server/src/routes/agents.ts#/agents/:id)
- api_endpoint: PATCH /agents/:id (server/src/routes/agents.ts#/agents/:id)
- api_endpoint: POST /agents/:id/approve (server/src/routes/agents.ts#/agents/:id/approve)
- api_endpoint: POST /agents/:id/claude-login (server/src/routes/agents.ts#/agents/:id/claude-login)
- api_endpoint: GET /agents/:id/config-revisions (server/src/routes/agents.ts#/agents/:id/config-revisions)
- api_endpoint: GET /agents/:id/config-revisions/:revisionId (server/src/routes/agents.ts#/agents/:id/config-revisions/:revisionId)
- api_endpoint: POST /agents/:id/config-revisions/:revisionId/rollback (server/src/routes/agents.ts#/agents/:id/config-revisions/:revisionId/rollback)
- api_endpoint: GET /agents/:id/configuration (server/src/routes/agents.ts#/agents/:id/configuration)
- api_endpoint: POST /agents/:id/heartbeat/invoke (server/src/routes/agents.ts#/agents/:id/heartbeat/invoke)
- api_endpoint: GET /agents/:id/instructions-bundle (server/src/routes/agents.ts#/agents/:id/instructions-bundle)
- api_endpoint: PATCH /agents/:id/instructions-bundle (server/src/routes/agents.ts#/agents/:id/instructions-bundle)
- api_endpoint: DELETE /agents/:id/instructions-bundle/file (server/src/routes/agents.ts#/agents/:id/instructions-bundle/file)
- api_endpoint: GET /agents/:id/instructions-bundle/file (server/src/routes/agents.ts#/agents/:id/instructions-bundle/file)
- api_endpoint: PUT /agents/:id/instructions-bundle/file (server/src/routes/agents.ts#/agents/:id/instructions-bundle/file)
- api_endpoint: PATCH /agents/:id/instructions-path (server/src/routes/agents.ts#/agents/:id/instructions-path)
- api_endpoint: GET /agents/:id/keys (server/src/routes/agents.ts#/agents/:id/keys)
- api_endpoint: POST /agents/:id/keys (server/src/routes/agents.ts#/agents/:id/keys)
- api_endpoint: DELETE /agents/:id/keys/:keyId (server/src/routes/agents.ts#/agents/:id/keys/:keyId)
- api_endpoint: POST /agents/:id/pause (server/src/routes/agents.ts#/agents/:id/pause)
- api_endpoint: PATCH /agents/:id/permissions (server/src/routes/agents.ts#/agents/:id/permissions)

## Raw Task-Linkage Samples

### Raw Tasks Without Architecture Links


### Raw Implementation Without Task Links

- api_endpoint: USE /api (server/src/app.ts#/api)
- api_endpoint: USE /api/auth (server/src/app.ts#/api/auth)
- api_endpoint: USE /assets (server/src/app.ts#/assets)
- api_endpoint: GET /admin/users (server/src/routes/access.ts#/admin/users)
- api_endpoint: GET /admin/users/:userId/company-access (server/src/routes/access.ts#/admin/users/:userId/company-access)
- api_endpoint: PUT /admin/users/:userId/company-access (server/src/routes/access.ts#/admin/users/:userId/company-access)
- api_endpoint: POST /admin/users/:userId/demote-instance-admin (server/src/routes/access.ts#/admin/users/:userId/demote-instance-admin)
- api_endpoint: POST /admin/users/:userId/promote-instance-admin (server/src/routes/access.ts#/admin/users/:userId/promote-instance-admin)
- api_endpoint: GET /board-claim/:token (server/src/routes/access.ts#/board-claim/:token)
- api_endpoint: POST /board-claim/:token/claim (server/src/routes/access.ts#/board-claim/:token/claim)
- api_endpoint: POST /bootstrap/claim (server/src/routes/access.ts#/bootstrap/claim)
- api_endpoint: POST /cli-auth/challenges (server/src/routes/access.ts#/cli-auth/challenges)
- api_endpoint: GET /cli-auth/challenges/:id (server/src/routes/access.ts#/cli-auth/challenges/:id)
- api_endpoint: POST /cli-auth/challenges/:id/approve (server/src/routes/access.ts#/cli-auth/challenges/:id/approve)
- api_endpoint: POST /cli-auth/challenges/:id/cancel (server/src/routes/access.ts#/cli-auth/challenges/:id/cancel)
- api_endpoint: GET /cli-auth/me (server/src/routes/access.ts#/cli-auth/me)
- api_endpoint: POST /cli-auth/revoke-current (server/src/routes/access.ts#/cli-auth/revoke-current)
- api_endpoint: GET /companies/:companyId/invites (server/src/routes/access.ts#/companies/:companyId/invites)
- api_endpoint: POST /companies/:companyId/invites (server/src/routes/access.ts#/companies/:companyId/invites)
- api_endpoint: GET /companies/:companyId/join-requests (server/src/routes/access.ts#/companies/:companyId/join-requests)
- api_endpoint: POST /companies/:companyId/join-requests/:requestId/approve (server/src/routes/access.ts#/companies/:companyId/join-requests/:requestId/approve)
- api_endpoint: POST /companies/:companyId/join-requests/:requestId/reject (server/src/routes/access.ts#/companies/:companyId/join-requests/:requestId/reject)
- api_endpoint: GET /companies/:companyId/members (server/src/routes/access.ts#/companies/:companyId/members)
- api_endpoint: PATCH /companies/:companyId/members/:memberId (server/src/routes/access.ts#/companies/:companyId/members/:memberId)
- api_endpoint: POST /companies/:companyId/members/:memberId/archive (server/src/routes/access.ts#/companies/:companyId/members/:memberId/archive)
- api_endpoint: PATCH /companies/:companyId/members/:memberId/permissions (server/src/routes/access.ts#/companies/:companyId/members/:memberId/permissions)
- api_endpoint: PATCH /companies/:companyId/members/:memberId/role-and-grants (server/src/routes/access.ts#/companies/:companyId/members/:memberId/role-and-grants)
- api_endpoint: POST /companies/:companyId/openclaw/invite-prompt (server/src/routes/access.ts#/companies/:companyId/openclaw/invite-prompt)
- api_endpoint: GET /companies/:companyId/user-directory (server/src/routes/access.ts#/companies/:companyId/user-directory)
- api_endpoint: POST /invites/:inviteId/revoke (server/src/routes/access.ts#/invites/:inviteId/revoke)
- api_endpoint: GET /invites/:token (server/src/routes/access.ts#/invites/:token)
- api_endpoint: POST /invites/:token/accept (server/src/routes/access.ts#/invites/:token/accept)
- api_endpoint: GET /invites/:token/logo (server/src/routes/access.ts#/invites/:token/logo)
- api_endpoint: GET /invites/:token/onboarding (server/src/routes/access.ts#/invites/:token/onboarding)
- api_endpoint: GET /invites/:token/onboarding.txt (server/src/routes/access.ts#/invites/:token/onboarding.txt)
- api_endpoint: GET /invites/:token/skills/:skillName (server/src/routes/access.ts#/invites/:token/skills/:skillName)
- api_endpoint: GET /invites/:token/skills/index (server/src/routes/access.ts#/invites/:token/skills/index)
- api_endpoint: GET /invites/:token/test-resolution (server/src/routes/access.ts#/invites/:token/test-resolution)
- api_endpoint: POST /join-requests/:requestId/claim-api-key (server/src/routes/access.ts#/join-requests/:requestId/claim-api-key)
- api_endpoint: GET /skills/:skillName (server/src/routes/access.ts#/skills/:skillName)