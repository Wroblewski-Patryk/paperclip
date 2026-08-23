# Architecture Graph

Generated: 2026-08-23T00:03:39.837Z

## Canonical Exports

- `architecture-awareness.json`
- `architecture-awareness.csv`
- `architecture-graph.mmd`
- `../status/architecture-awareness-report.md`

## Entity Index

| Type | Status | Name | Path | Owner |
| --- | --- | --- | --- | --- |
| agent | implemented | LLM Wiki Maintainer | packages/plugins/plugin-llm-wiki/agents/wiki-maintainer/AGENTS.md | Plugin Platform Lead |
| agent | implemented | AGENTS | packages/teams-catalog/catalog/bundled/company-defaults/core-exec-team/agents/ceo/AGENTS.md | Engineering Delivery Lead |
| agent | implemented | AGENTS | packages/teams-catalog/catalog/bundled/company-defaults/core-exec-team/agents/cto/AGENTS.md | Engineering Delivery Lead |
| agent | implemented | AGENTS | packages/teams-catalog/catalog/bundled/company-defaults/core-exec-team/agents/qa/AGENTS.md | Engineering Delivery Lead |
| agent | implemented | AGENTS | packages/teams-catalog/catalog/bundled/product/product-design/agents/ux-designer/AGENTS.md | Engineering Delivery Lead |
| agent | implemented | AGENTS | packages/teams-catalog/catalog/bundled/software-development/product-engineering/agents/cto/AGENTS.md | Engineering Delivery Lead |
| agent | implemented | AGENTS | packages/teams-catalog/catalog/bundled/software-development/product-engineering/agents/qa/AGENTS.md | Engineering Delivery Lead |
| agent | implemented | AGENTS | packages/teams-catalog/catalog/bundled/software-development/product-engineering/agents/senior-coder/AGENTS.md | Engineering Delivery Lead |
| agent | implemented | AGENTS | packages/teams-catalog/catalog/optional/content/content-machine/agents/content-lead/AGENTS.md | Engineering Delivery Lead |
| agent | implemented | AGENTS | packages/teams-catalog/catalog/optional/operations/agent-enablement/agents/ai-agent-development-partner/AGENTS.md | Engineering Delivery Lead |
| agent | implemented | Coder Agent Template | skills/paperclip-create-agent/references/agents/coder.md | Engineering Delivery Lead |
| agent | implemented | QA Agent Template | skills/paperclip-create-agent/references/agents/qa.md | Engineering Delivery Lead |
| agent | implemented | SecurityEngineer Agent Template | skills/paperclip-create-agent/references/agents/securityengineer.md | Engineering Delivery Lead |
| agent | implemented | UX Designer Agent Template | skills/paperclip-create-agent/references/agents/uxdesigner.md | Engineering Delivery Lead |
| api_endpoint | implemented | USE /api | server/src/app.ts#/api | Backend Platform Lead |
| api_endpoint | implemented | USE /api/auth | server/src/app.ts#/api/auth | Backend Platform Lead |
| api_endpoint | implemented | USE /assets | server/src/app.ts#/assets | Backend Platform Lead |
| api_endpoint | implemented | GET /admin/users | server/src/routes/access.ts#/admin/users | Backend Platform Lead |
| api_endpoint | implemented | GET /admin/users/:userId/company-access | server/src/routes/access.ts#/admin/users/:userId/company-access | Backend Platform Lead |
| api_endpoint | implemented | PUT /admin/users/:userId/company-access | server/src/routes/access.ts#/admin/users/:userId/company-access | Backend Platform Lead |
| api_endpoint | implemented | POST /admin/users/:userId/demote-instance-admin | server/src/routes/access.ts#/admin/users/:userId/demote-instance-admin | Backend Platform Lead |
| api_endpoint | implemented | POST /admin/users/:userId/promote-instance-admin | server/src/routes/access.ts#/admin/users/:userId/promote-instance-admin | Backend Platform Lead |
| api_endpoint | implemented | GET /board-claim/:token | server/src/routes/access.ts#/board-claim/:token | Backend Platform Lead |
| api_endpoint | implemented | POST /board-claim/:token/claim | server/src/routes/access.ts#/board-claim/:token/claim | Backend Platform Lead |
| api_endpoint | implemented | POST /bootstrap/claim | server/src/routes/access.ts#/bootstrap/claim | Backend Platform Lead |
| api_endpoint | implemented | POST /cli-auth/challenges | server/src/routes/access.ts#/cli-auth/challenges | Backend Platform Lead |
| api_endpoint | implemented | GET /cli-auth/challenges/:id | server/src/routes/access.ts#/cli-auth/challenges/:id | Backend Platform Lead |
| api_endpoint | implemented | POST /cli-auth/challenges/:id/approve | server/src/routes/access.ts#/cli-auth/challenges/:id/approve | Backend Platform Lead |
| api_endpoint | implemented | POST /cli-auth/challenges/:id/cancel | server/src/routes/access.ts#/cli-auth/challenges/:id/cancel | Backend Platform Lead |
| api_endpoint | implemented | GET /cli-auth/me | server/src/routes/access.ts#/cli-auth/me | Backend Platform Lead |
| api_endpoint | implemented | POST /cli-auth/revoke-current | server/src/routes/access.ts#/cli-auth/revoke-current | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/invites | server/src/routes/access.ts#/companies/:companyId/invites | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/invites | server/src/routes/access.ts#/companies/:companyId/invites | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/join-requests | server/src/routes/access.ts#/companies/:companyId/join-requests | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/join-requests/:requestId/approve | server/src/routes/access.ts#/companies/:companyId/join-requests/:requestId/approve | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/join-requests/:requestId/reject | server/src/routes/access.ts#/companies/:companyId/join-requests/:requestId/reject | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/members | server/src/routes/access.ts#/companies/:companyId/members | Backend Platform Lead |
| api_endpoint | implemented | PATCH /companies/:companyId/members/:memberId | server/src/routes/access.ts#/companies/:companyId/members/:memberId | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/members/:memberId/archive | server/src/routes/access.ts#/companies/:companyId/members/:memberId/archive | Backend Platform Lead |
| api_endpoint | implemented | PATCH /companies/:companyId/members/:memberId/permissions | server/src/routes/access.ts#/companies/:companyId/members/:memberId/permissions | Backend Platform Lead |
| api_endpoint | implemented | PATCH /companies/:companyId/members/:memberId/role-and-grants | server/src/routes/access.ts#/companies/:companyId/members/:memberId/role-and-grants | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/openclaw/invite-prompt | server/src/routes/access.ts#/companies/:companyId/openclaw/invite-prompt | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/user-directory | server/src/routes/access.ts#/companies/:companyId/user-directory | Backend Platform Lead |
| api_endpoint | implemented | POST /invites/:inviteId/revoke | server/src/routes/access.ts#/invites/:inviteId/revoke | Backend Platform Lead |
| api_endpoint | implemented | GET /invites/:token | server/src/routes/access.ts#/invites/:token | Backend Platform Lead |
| api_endpoint | implemented | POST /invites/:token/accept | server/src/routes/access.ts#/invites/:token/accept | Backend Platform Lead |
| api_endpoint | implemented | GET /invites/:token/logo | server/src/routes/access.ts#/invites/:token/logo | Backend Platform Lead |
| api_endpoint | implemented | GET /invites/:token/onboarding | server/src/routes/access.ts#/invites/:token/onboarding | Backend Platform Lead |
| api_endpoint | implemented | GET /invites/:token/onboarding.txt | server/src/routes/access.ts#/invites/:token/onboarding.txt | Backend Platform Lead |
| api_endpoint | implemented | GET /invites/:token/skills/:skillName | server/src/routes/access.ts#/invites/:token/skills/:skillName | Backend Platform Lead |
| api_endpoint | implemented | GET /invites/:token/skills/index | server/src/routes/access.ts#/invites/:token/skills/index | Backend Platform Lead |
| api_endpoint | implemented | GET /invites/:token/test-resolution | server/src/routes/access.ts#/invites/:token/test-resolution | Backend Platform Lead |
| api_endpoint | implemented | POST /join-requests/:requestId/claim-api-key | server/src/routes/access.ts#/join-requests/:requestId/claim-api-key | Backend Platform Lead |
| api_endpoint | implemented | GET /skills/:skillName | server/src/routes/access.ts#/skills/:skillName | Backend Platform Lead |
| api_endpoint | implemented | GET /skills/available | server/src/routes/access.ts#/skills/available | Backend Platform Lead |
| api_endpoint | implemented | GET /skills/index | server/src/routes/access.ts#/skills/index | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/activity | server/src/routes/activity.ts#/companies/:companyId/activity | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/activity | server/src/routes/activity.ts#/companies/:companyId/activity | Backend Platform Lead |
| api_endpoint | implemented | GET /heartbeat-runs/:runId/issues | server/src/routes/activity.ts#/heartbeat-runs/:runId/issues | Backend Platform Lead |
| api_endpoint | implemented | GET /issues/:id/activity | server/src/routes/activity.ts#/issues/:id/activity | Backend Platform Lead |
| api_endpoint | implemented | GET /issues/:id/recovery-run-evidence | server/src/routes/activity.ts#/issues/:id/recovery-run-evidence | Backend Platform Lead |
| api_endpoint | implemented | GET /issues/:id/runs | server/src/routes/activity.ts#/issues/:id/runs | Backend Platform Lead |
| api_endpoint | implemented | GET /adapters | server/src/routes/adapters.ts#/adapters | Backend Platform Lead |
| api_endpoint | implemented | DELETE /adapters/:type | server/src/routes/adapters.ts#/adapters/:type | Backend Platform Lead |
| api_endpoint | implemented | PATCH /adapters/:type | server/src/routes/adapters.ts#/adapters/:type | Backend Platform Lead |
| api_endpoint | implemented | GET /adapters/:type/config-schema | server/src/routes/adapters.ts#/adapters/:type/config-schema | Backend Platform Lead |
| api_endpoint | implemented | PATCH /adapters/:type/override | server/src/routes/adapters.ts#/adapters/:type/override | Backend Platform Lead |
| api_endpoint | implemented | POST /adapters/:type/reinstall | server/src/routes/adapters.ts#/adapters/:type/reinstall | Backend Platform Lead |
| api_endpoint | implemented | POST /adapters/:type/reload | server/src/routes/adapters.ts#/adapters/:type/reload | Backend Platform Lead |
| api_endpoint | implemented | GET /adapters/:type/ui-parser.js | server/src/routes/adapters.ts#/adapters/:type/ui-parser.js | Backend Platform Lead |
| api_endpoint | implemented | POST /adapters/install | server/src/routes/adapters.ts#/adapters/install | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/admission-controls | server/src/routes/admission-control.ts#/companies/:companyId/admission-controls | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/admission-controls/transition | server/src/routes/admission-control.ts#/companies/:companyId/admission-controls/transition | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/agent-availability | server/src/routes/admission-control.ts#/companies/:companyId/agent-availability | Backend Platform Lead |
| api_endpoint | implemented | PUT /companies/:companyId/agent-availability | server/src/routes/admission-control.ts#/companies/:companyId/agent-availability | Backend Platform Lead |
| api_endpoint | implemented | DELETE /agents/:id | server/src/routes/agents.ts#/agents/:id | Backend Platform Lead |
| api_endpoint | implemented | GET /agents/:id | server/src/routes/agents.ts#/agents/:id | Backend Platform Lead |
| api_endpoint | implemented | PATCH /agents/:id | server/src/routes/agents.ts#/agents/:id | Backend Platform Lead |
| api_endpoint | implemented | POST /agents/:id/approve | server/src/routes/agents.ts#/agents/:id/approve | Backend Platform Lead |
| api_endpoint | implemented | POST /agents/:id/claude-login | server/src/routes/agents.ts#/agents/:id/claude-login | Backend Platform Lead |
| api_endpoint | implemented | GET /agents/:id/config-revisions | server/src/routes/agents.ts#/agents/:id/config-revisions | Backend Platform Lead |
| api_endpoint | implemented | GET /agents/:id/config-revisions/:revisionId | server/src/routes/agents.ts#/agents/:id/config-revisions/:revisionId | Backend Platform Lead |
| api_endpoint | implemented | POST /agents/:id/config-revisions/:revisionId/rollback | server/src/routes/agents.ts#/agents/:id/config-revisions/:revisionId/rollback | Backend Platform Lead |
| api_endpoint | implemented | GET /agents/:id/configuration | server/src/routes/agents.ts#/agents/:id/configuration | Backend Platform Lead |
| api_endpoint | implemented | POST /agents/:id/heartbeat/invoke | server/src/routes/agents.ts#/agents/:id/heartbeat/invoke | Backend Platform Lead |
| api_endpoint | implemented | GET /agents/:id/instructions-bundle | server/src/routes/agents.ts#/agents/:id/instructions-bundle | Backend Platform Lead |
| api_endpoint | implemented | PATCH /agents/:id/instructions-bundle | server/src/routes/agents.ts#/agents/:id/instructions-bundle | Backend Platform Lead |
| api_endpoint | implemented | DELETE /agents/:id/instructions-bundle/file | server/src/routes/agents.ts#/agents/:id/instructions-bundle/file | Backend Platform Lead |
| api_endpoint | implemented | GET /agents/:id/instructions-bundle/file | server/src/routes/agents.ts#/agents/:id/instructions-bundle/file | Backend Platform Lead |
| api_endpoint | implemented | PUT /agents/:id/instructions-bundle/file | server/src/routes/agents.ts#/agents/:id/instructions-bundle/file | Backend Platform Lead |
| api_endpoint | implemented | PATCH /agents/:id/instructions-path | server/src/routes/agents.ts#/agents/:id/instructions-path | Backend Platform Lead |
| api_endpoint | implemented | GET /agents/:id/keys | server/src/routes/agents.ts#/agents/:id/keys | Backend Platform Lead |
| api_endpoint | implemented | POST /agents/:id/keys | server/src/routes/agents.ts#/agents/:id/keys | Backend Platform Lead |
| api_endpoint | implemented | DELETE /agents/:id/keys/:keyId | server/src/routes/agents.ts#/agents/:id/keys/:keyId | Backend Platform Lead |
| api_endpoint | implemented | POST /agents/:id/pause | server/src/routes/agents.ts#/agents/:id/pause | Backend Platform Lead |
| api_endpoint | implemented | PATCH /agents/:id/permissions | server/src/routes/agents.ts#/agents/:id/permissions | Backend Platform Lead |
| api_endpoint | implemented | POST /agents/:id/resume | server/src/routes/agents.ts#/agents/:id/resume | Backend Platform Lead |
| api_endpoint | implemented | GET /agents/:id/runtime-state | server/src/routes/agents.ts#/agents/:id/runtime-state | Backend Platform Lead |
| api_endpoint | implemented | POST /agents/:id/runtime-state/reset-session | server/src/routes/agents.ts#/agents/:id/runtime-state/reset-session | Backend Platform Lead |
| api_endpoint | implemented | GET /agents/:id/skills | server/src/routes/agents.ts#/agents/:id/skills | Backend Platform Lead |
| api_endpoint | implemented | POST /agents/:id/skills/sync | server/src/routes/agents.ts#/agents/:id/skills/sync | Backend Platform Lead |
| api_endpoint | implemented | GET /agents/:id/task-sessions | server/src/routes/agents.ts#/agents/:id/task-sessions | Backend Platform Lead |
| api_endpoint | implemented | POST /agents/:id/terminate | server/src/routes/agents.ts#/agents/:id/terminate | Backend Platform Lead |
| api_endpoint | implemented | POST /agents/:id/wakeup | server/src/routes/agents.ts#/agents/:id/wakeup | Backend Platform Lead |
| api_endpoint | implemented | GET /agents/me | server/src/routes/agents.ts#/agents/me | Backend Platform Lead |
| api_endpoint | implemented | GET /agents/me/inbox-lite | server/src/routes/agents.ts#/agents/me/inbox-lite | Backend Platform Lead |
| api_endpoint | implemented | GET /agents/me/inbox/mine | server/src/routes/agents.ts#/agents/me/inbox/mine | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/adapters/:type/detect-model | server/src/routes/agents.ts#/companies/:companyId/adapters/:type/detect-model | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/adapters/:type/model-profiles | server/src/routes/agents.ts#/companies/:companyId/adapters/:type/model-profiles | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/adapters/:type/models | server/src/routes/agents.ts#/companies/:companyId/adapters/:type/models | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/adapters/:type/test-environment | server/src/routes/agents.ts#/companies/:companyId/adapters/:type/test-environment | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/agent-configurations | server/src/routes/agents.ts#/companies/:companyId/agent-configurations | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/agent-hires | server/src/routes/agents.ts#/companies/:companyId/agent-hires | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/agents | server/src/routes/agents.ts#/companies/:companyId/agents | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/agents | server/src/routes/agents.ts#/companies/:companyId/agents | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/heartbeat-runs | server/src/routes/agents.ts#/companies/:companyId/heartbeat-runs | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/live-runs | server/src/routes/agents.ts#/companies/:companyId/live-runs | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/org | server/src/routes/agents.ts#/companies/:companyId/org | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/org.png | server/src/routes/agents.ts#/companies/:companyId/org.png | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/org.svg | server/src/routes/agents.ts#/companies/:companyId/org.svg | Backend Platform Lead |
| api_endpoint | implemented | GET /heartbeat-runs/:runId | server/src/routes/agents.ts#/heartbeat-runs/:runId | Backend Platform Lead |
| api_endpoint | implemented | POST /heartbeat-runs/:runId/cancel | server/src/routes/agents.ts#/heartbeat-runs/:runId/cancel | Backend Platform Lead |
| api_endpoint | implemented | GET /heartbeat-runs/:runId/events | server/src/routes/agents.ts#/heartbeat-runs/:runId/events | Backend Platform Lead |
| api_endpoint | implemented | GET /heartbeat-runs/:runId/log | server/src/routes/agents.ts#/heartbeat-runs/:runId/log | Backend Platform Lead |
| api_endpoint | implemented | POST /heartbeat-runs/:runId/watchdog-decisions | server/src/routes/agents.ts#/heartbeat-runs/:runId/watchdog-decisions | Backend Platform Lead |
| api_endpoint | implemented | GET /heartbeat-runs/:runId/workspace-operations | server/src/routes/agents.ts#/heartbeat-runs/:runId/workspace-operations | Backend Platform Lead |
| api_endpoint | implemented | GET /instance/scheduler-heartbeats | server/src/routes/agents.ts#/instance/scheduler-heartbeats | Backend Platform Lead |
| api_endpoint | implemented | GET /issues/:issueId/active-run | server/src/routes/agents.ts#/issues/:issueId/active-run | Backend Platform Lead |
| api_endpoint | implemented | GET /issues/:issueId/live-runs | server/src/routes/agents.ts#/issues/:issueId/live-runs | Backend Platform Lead |
| api_endpoint | implemented | GET /workspace-operations/:operationId/log | server/src/routes/agents.ts#/workspace-operations/:operationId/log | Backend Platform Lead |
| api_endpoint | implemented | GET /approvals/:id | server/src/routes/approvals.ts#/approvals/:id | Backend Platform Lead |
| api_endpoint | implemented | POST /approvals/:id/approve | server/src/routes/approvals.ts#/approvals/:id/approve | Backend Platform Lead |
| api_endpoint | implemented | GET /approvals/:id/comments | server/src/routes/approvals.ts#/approvals/:id/comments | Backend Platform Lead |
| api_endpoint | implemented | POST /approvals/:id/comments | server/src/routes/approvals.ts#/approvals/:id/comments | Backend Platform Lead |
| api_endpoint | implemented | GET /approvals/:id/issues | server/src/routes/approvals.ts#/approvals/:id/issues | Backend Platform Lead |
| api_endpoint | implemented | POST /approvals/:id/reject | server/src/routes/approvals.ts#/approvals/:id/reject | Backend Platform Lead |
| api_endpoint | implemented | POST /approvals/:id/request-revision | server/src/routes/approvals.ts#/approvals/:id/request-revision | Backend Platform Lead |
| api_endpoint | implemented | POST /approvals/:id/resubmit | server/src/routes/approvals.ts#/approvals/:id/resubmit | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/approvals | server/src/routes/approvals.ts#/companies/:companyId/approvals | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/approvals | server/src/routes/approvals.ts#/companies/:companyId/approvals | Backend Platform Lead |
| api_endpoint | implemented | GET /assets/:assetId/content | server/src/routes/assets.ts#/assets/:assetId/content | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/assets/images | server/src/routes/assets.ts#/companies/:companyId/assets/images | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/logo | server/src/routes/assets.ts#/companies/:companyId/logo | Backend Platform Lead |
| api_endpoint | implemented | GET /get-session | server/src/routes/auth.ts#/get-session | Backend Platform Lead |
| api_endpoint | implemented | GET /profile | server/src/routes/auth.ts#/profile | Backend Platform Lead |
| api_endpoint | implemented | PATCH /profile | server/src/routes/auth.ts#/profile | Backend Platform Lead |
| api_endpoint | implemented | GET /cloud-upstreams | server/src/routes/cloud-upstreams.ts#/cloud-upstreams | Backend Platform Lead |
| api_endpoint | implemented | POST /cloud-upstreams/:connectionId/push-runs | server/src/routes/cloud-upstreams.ts#/cloud-upstreams/:connectionId/push-runs | Backend Platform Lead |
| api_endpoint | implemented | GET /cloud-upstreams/:connectionId/push-runs/:runId | server/src/routes/cloud-upstreams.ts#/cloud-upstreams/:connectionId/push-runs/:runId | Backend Platform Lead |
| api_endpoint | implemented | POST /cloud-upstreams/:connectionId/push-runs/:runId/activation | server/src/routes/cloud-upstreams.ts#/cloud-upstreams/:connectionId/push-runs/:runId/activation | Backend Platform Lead |
| api_endpoint | implemented | POST /cloud-upstreams/:connectionId/push-runs/:runId/cancel | server/src/routes/cloud-upstreams.ts#/cloud-upstreams/:connectionId/push-runs/:runId/cancel | Backend Platform Lead |
| api_endpoint | implemented | POST /cloud-upstreams/:connectionId/push-runs/preview | server/src/routes/cloud-upstreams.ts#/cloud-upstreams/:connectionId/push-runs/preview | Backend Platform Lead |
| api_endpoint | implemented | POST /cloud-upstreams/connect/finish | server/src/routes/cloud-upstreams.ts#/cloud-upstreams/connect/finish | Backend Platform Lead |
| api_endpoint | implemented | POST /cloud-upstreams/connect/start | server/src/routes/cloud-upstreams.ts#/cloud-upstreams/connect/start | Backend Platform Lead |
| api_endpoint | implemented | GET / | server/src/routes/companies.ts#/ | Backend Platform Lead |
| api_endpoint | implemented | POST / | server/src/routes/companies.ts#/ | Backend Platform Lead |
| api_endpoint | implemented | DELETE /:companyId | server/src/routes/companies.ts#/:companyId | Backend Platform Lead |
| api_endpoint | implemented | GET /:companyId | server/src/routes/companies.ts#/:companyId | Backend Platform Lead |
| api_endpoint | implemented | PATCH /:companyId | server/src/routes/companies.ts#/:companyId | Backend Platform Lead |
| api_endpoint | implemented | POST /:companyId/archive | server/src/routes/companies.ts#/:companyId/archive | Backend Platform Lead |
| api_endpoint | implemented | GET /:companyId/artifacts | server/src/routes/companies.ts#/:companyId/artifacts | Backend Platform Lead |
| api_endpoint | implemented | PATCH /:companyId/branding | server/src/routes/companies.ts#/:companyId/branding | Backend Platform Lead |
| api_endpoint | implemented | POST /:companyId/export | server/src/routes/companies.ts#/:companyId/export | Backend Platform Lead |
| api_endpoint | implemented | POST /:companyId/exports | server/src/routes/companies.ts#/:companyId/exports | Backend Platform Lead |
| api_endpoint | implemented | POST /:companyId/exports/preview | server/src/routes/companies.ts#/:companyId/exports/preview | Backend Platform Lead |
| api_endpoint | implemented | GET /:companyId/feedback-traces | server/src/routes/companies.ts#/:companyId/feedback-traces | Backend Platform Lead |
| api_endpoint | implemented | POST /:companyId/imports/apply | server/src/routes/companies.ts#/:companyId/imports/apply | Backend Platform Lead |
| api_endpoint | implemented | POST /:companyId/imports/preview | server/src/routes/companies.ts#/:companyId/imports/preview | Backend Platform Lead |
| api_endpoint | implemented | GET /import/jobs/:jobId | server/src/routes/companies.ts#/import/jobs/:jobId | Backend Platform Lead |
| api_endpoint | implemented | POST /import/preview | server/src/routes/companies.ts#/import/preview | Backend Platform Lead |
| api_endpoint | implemented | GET /issues | server/src/routes/companies.ts#/issues | Backend Platform Lead |
| api_endpoint | implemented | GET /stats | server/src/routes/companies.ts#/stats | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/skills | server/src/routes/company-skills.ts#/companies/:companyId/skills | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/skills | server/src/routes/company-skills.ts#/companies/:companyId/skills | Backend Platform Lead |
| api_endpoint | implemented | DELETE /companies/:companyId/skills/:skillId | server/src/routes/company-skills.ts#/companies/:companyId/skills/:skillId | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/skills/:skillId | server/src/routes/company-skills.ts#/companies/:companyId/skills/:skillId | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/skills/:skillId/audit | server/src/routes/company-skills.ts#/companies/:companyId/skills/:skillId/audit | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/skills/:skillId/files | server/src/routes/company-skills.ts#/companies/:companyId/skills/:skillId/files | Backend Platform Lead |
| api_endpoint | implemented | PATCH /companies/:companyId/skills/:skillId/files | server/src/routes/company-skills.ts#/companies/:companyId/skills/:skillId/files | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/skills/:skillId/install-update | server/src/routes/company-skills.ts#/companies/:companyId/skills/:skillId/install-update | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/skills/:skillId/reset | server/src/routes/company-skills.ts#/companies/:companyId/skills/:skillId/reset | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/skills/:skillId/update-status | server/src/routes/company-skills.ts#/companies/:companyId/skills/:skillId/update-status | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/skills/import | server/src/routes/company-skills.ts#/companies/:companyId/skills/import | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/skills/install-catalog | server/src/routes/company-skills.ts#/companies/:companyId/skills/install-catalog | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/skills/scan-projects | server/src/routes/company-skills.ts#/companies/:companyId/skills/scan-projects | Backend Platform Lead |
| api_endpoint | implemented | GET /skills/catalog | server/src/routes/company-skills.ts#/skills/catalog | Backend Platform Lead |
| api_endpoint | implemented | GET /skills/catalog/:catalogId | server/src/routes/company-skills.ts#/skills/catalog/:catalogId | Backend Platform Lead |
| api_endpoint | implemented | GET /skills/catalog/:catalogId/files | server/src/routes/company-skills.ts#/skills/catalog/:catalogId/files | Backend Platform Lead |
| api_endpoint | implemented | PATCH /agents/:agentId/budgets | server/src/routes/costs.ts#/agents/:agentId/budgets | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/budget-incidents/:incidentId/resolve | server/src/routes/costs.ts#/companies/:companyId/budget-incidents/:incidentId/resolve | Backend Platform Lead |
| api_endpoint | implemented | PATCH /companies/:companyId/budgets | server/src/routes/costs.ts#/companies/:companyId/budgets | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/budgets/overview | server/src/routes/costs.ts#/companies/:companyId/budgets/overview | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/budgets/policies | server/src/routes/costs.ts#/companies/:companyId/budgets/policies | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/cost-events | server/src/routes/costs.ts#/companies/:companyId/cost-events | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/costs/by-agent | server/src/routes/costs.ts#/companies/:companyId/costs/by-agent | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/costs/by-agent-model | server/src/routes/costs.ts#/companies/:companyId/costs/by-agent-model | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/costs/by-biller | server/src/routes/costs.ts#/companies/:companyId/costs/by-biller | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/costs/by-project | server/src/routes/costs.ts#/companies/:companyId/costs/by-project | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/costs/by-provider | server/src/routes/costs.ts#/companies/:companyId/costs/by-provider | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/costs/finance-by-biller | server/src/routes/costs.ts#/companies/:companyId/costs/finance-by-biller | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/costs/finance-by-kind | server/src/routes/costs.ts#/companies/:companyId/costs/finance-by-kind | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/costs/finance-events | server/src/routes/costs.ts#/companies/:companyId/costs/finance-events | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/costs/finance-summary | server/src/routes/costs.ts#/companies/:companyId/costs/finance-summary | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/costs/model-profiles | server/src/routes/costs.ts#/companies/:companyId/costs/model-profiles | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/costs/quota-windows | server/src/routes/costs.ts#/companies/:companyId/costs/quota-windows | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/costs/summary | server/src/routes/costs.ts#/companies/:companyId/costs/summary | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/costs/window-spend | server/src/routes/costs.ts#/companies/:companyId/costs/window-spend | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/finance-events | server/src/routes/costs.ts#/companies/:companyId/finance-events | Backend Platform Lead |
| api_endpoint | implemented | GET /issues/:id/cost-summary | server/src/routes/costs.ts#/issues/:id/cost-summary | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/dashboard | server/src/routes/dashboard.ts#/companies/:companyId/dashboard | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/next-legal-actions | server/src/routes/dashboard.ts#/companies/:companyId/next-legal-actions | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/situation | server/src/routes/dashboard.ts#/companies/:companyId/situation | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/decisions | server/src/routes/decision-center.ts#/companies/:companyId/decisions | Backend Platform Lead |
| api_endpoint | implemented | DELETE /companies/:companyId/decisions/:sourceType/:sourceId/defer | server/src/routes/decision-center.ts#/companies/:companyId/decisions/:sourceType/:sourceId/defer | Backend Platform Lead |
| api_endpoint | implemented | PUT /companies/:companyId/decisions/:sourceType/:sourceId/defer | server/src/routes/decision-center.ts#/companies/:companyId/decisions/:sourceType/:sourceId/defer | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/decisions/interaction/:sourceId/prepare | server/src/routes/decision-center.ts#/companies/:companyId/decisions/interaction/:sourceId/prepare | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/decisions/interaction/:sourceId/reroute | server/src/routes/decision-center.ts#/companies/:companyId/decisions/interaction/:sourceId/reroute | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/deliveries | server/src/routes/deliveries.ts#/companies/:companyId/deliveries | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/deliveries | server/src/routes/deliveries.ts#/companies/:companyId/deliveries | Backend Platform Lead |
| api_endpoint | implemented | GET /deliveries/:id | server/src/routes/deliveries.ts#/deliveries/:id | Backend Platform Lead |
| api_endpoint | implemented | POST /deliveries/:id/dispatch | server/src/routes/deliveries.ts#/deliveries/:id/dispatch | Backend Platform Lead |
| api_endpoint | implemented | POST /deliveries/:id/outcome | server/src/routes/deliveries.ts#/deliveries/:id/outcome | Backend Platform Lead |
| api_endpoint | implemented | PATCH /deliveries/:id/status | server/src/routes/deliveries.ts#/deliveries/:id/status | Backend Platform Lead |
| api_endpoint | implemented | POST /deliveries/:id/transition | server/src/routes/deliveries.ts#/deliveries/:id/transition | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/environments | server/src/routes/environments.ts#/companies/:companyId/environments | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/environments | server/src/routes/environments.ts#/companies/:companyId/environments | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/environments/capabilities | server/src/routes/environments.ts#/companies/:companyId/environments/capabilities | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/environments/probe-config | server/src/routes/environments.ts#/companies/:companyId/environments/probe-config | Backend Platform Lead |
| api_endpoint | implemented | GET /environment-leases/:leaseId | server/src/routes/environments.ts#/environment-leases/:leaseId | Backend Platform Lead |
| api_endpoint | implemented | DELETE /environments/:id | server/src/routes/environments.ts#/environments/:id | Backend Platform Lead |
| api_endpoint | implemented | GET /environments/:id | server/src/routes/environments.ts#/environments/:id | Backend Platform Lead |
| api_endpoint | implemented | PATCH /environments/:id | server/src/routes/environments.ts#/environments/:id | Backend Platform Lead |
| api_endpoint | implemented | GET /environments/:id/leases | server/src/routes/environments.ts#/environments/:id/leases | Backend Platform Lead |
| api_endpoint | implemented | POST /environments/:id/probe | server/src/routes/environments.ts#/environments/:id/probe | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/execution-workspaces | server/src/routes/execution-workspaces.ts#/companies/:companyId/execution-workspaces | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/execution-workspaces/diagnostics | server/src/routes/execution-workspaces.ts#/companies/:companyId/execution-workspaces/diagnostics | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/execution-workspaces/maintenance | server/src/routes/execution-workspaces.ts#/companies/:companyId/execution-workspaces/maintenance | Backend Platform Lead |
| api_endpoint | implemented | GET /execution-workspaces/:id | server/src/routes/execution-workspaces.ts#/execution-workspaces/:id | Backend Platform Lead |
| api_endpoint | implemented | PATCH /execution-workspaces/:id | server/src/routes/execution-workspaces.ts#/execution-workspaces/:id | Backend Platform Lead |
| api_endpoint | implemented | GET /execution-workspaces/:id/close-readiness | server/src/routes/execution-workspaces.ts#/execution-workspaces/:id/close-readiness | Backend Platform Lead |
| api_endpoint | implemented | POST /execution-workspaces/:id/runtime-commands/:action | server/src/routes/execution-workspaces.ts#/execution-workspaces/:id/runtime-commands/:action | Backend Platform Lead |
| api_endpoint | implemented | POST /execution-workspaces/:id/runtime-services/:action | server/src/routes/execution-workspaces.ts#/execution-workspaces/:id/runtime-services/:action | Backend Platform Lead |
| api_endpoint | implemented | GET /execution-workspaces/:id/workspace-operations | server/src/routes/execution-workspaces.ts#/execution-workspaces/:id/workspace-operations | Backend Platform Lead |
| api_endpoint | implemented | GET /issues/:issueId/file-resources/content | server/src/routes/file-resources.ts#/issues/:issueId/file-resources/content | Backend Platform Lead |
| api_endpoint | implemented | GET /issues/:issueId/file-resources/list | server/src/routes/file-resources.ts#/issues/:issueId/file-resources/list | Backend Platform Lead |
| api_endpoint | implemented | GET /issues/:issueId/file-resources/resolve | server/src/routes/file-resources.ts#/issues/:issueId/file-resources/resolve | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/goals | server/src/routes/goals.ts#/companies/:companyId/goals | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/goals | server/src/routes/goals.ts#/companies/:companyId/goals | Backend Platform Lead |
| api_endpoint | implemented | DELETE /goals/:id | server/src/routes/goals.ts#/goals/:id | Backend Platform Lead |
| api_endpoint | implemented | GET /goals/:id | server/src/routes/goals.ts#/goals/:id | Backend Platform Lead |
| api_endpoint | implemented | PATCH /goals/:id | server/src/routes/goals.ts#/goals/:id | Backend Platform Lead |
| api_endpoint | implemented | GET / | server/src/routes/health.ts#/ | Backend Platform Lead |
| api_endpoint | implemented | POST /dev-server/restart | server/src/routes/health.ts#/dev-server/restart | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/inbox-dismissals | server/src/routes/inbox-dismissals.ts#/companies/:companyId/inbox-dismissals | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/inbox-dismissals | server/src/routes/inbox-dismissals.ts#/companies/:companyId/inbox-dismissals | Backend Platform Lead |
| api_endpoint | implemented | POST /instance/database-backups | server/src/routes/instance-database-backups.ts#/instance/database-backups | Backend Platform Lead |
| api_endpoint | implemented | GET /instance/settings/experimental | server/src/routes/instance-settings.ts#/instance/settings/experimental | Backend Platform Lead |
| api_endpoint | implemented | PATCH /instance/settings/experimental | server/src/routes/instance-settings.ts#/instance/settings/experimental | Backend Platform Lead |
| api_endpoint | implemented | POST /instance/settings/experimental/issue-graph-liveness-auto-recovery/preview | server/src/routes/instance-settings.ts#/instance/settings/experimental/issue-graph-liveness-auto-recovery/preview | Backend Platform Lead |
| api_endpoint | implemented | POST /instance/settings/experimental/issue-graph-liveness-auto-recovery/run | server/src/routes/instance-settings.ts#/instance/settings/experimental/issue-graph-liveness-auto-recovery/run | Backend Platform Lead |
| api_endpoint | implemented | GET /instance/settings/general | server/src/routes/instance-settings.ts#/instance/settings/general | Backend Platform Lead |
| api_endpoint | implemented | PATCH /instance/settings/general | server/src/routes/instance-settings.ts#/instance/settings/general | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/tree-control/preview | server/src/routes/issue-tree-control.ts#/issues/:id/tree-control/preview | Backend Platform Lead |
| api_endpoint | implemented | GET /issues/:id/tree-control/state | server/src/routes/issue-tree-control.ts#/issues/:id/tree-control/state | Backend Platform Lead |
| api_endpoint | implemented | GET /issues/:id/tree-holds | server/src/routes/issue-tree-control.ts#/issues/:id/tree-holds | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/tree-holds | server/src/routes/issue-tree-control.ts#/issues/:id/tree-holds | Backend Platform Lead |
| api_endpoint | implemented | GET /issues/:id/tree-holds/:holdId | server/src/routes/issue-tree-control.ts#/issues/:id/tree-holds/:holdId | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/tree-holds/:holdId/release | server/src/routes/issue-tree-control.ts#/issues/:id/tree-holds/:holdId/release | Backend Platform Lead |
| api_endpoint | implemented | DELETE /attachments/:attachmentId | server/src/routes/issues.ts#/attachments/:attachmentId | Backend Platform Lead |
| api_endpoint | implemented | GET /attachments/:attachmentId/content | server/src/routes/issues.ts#/attachments/:attachmentId/content | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/issues | server/src/routes/issues.ts#/companies/:companyId/issues | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/issues | server/src/routes/issues.ts#/companies/:companyId/issues | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/issues/:issueId/attachments | server/src/routes/issues.ts#/companies/:companyId/issues/:issueId/attachments | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/issues/count | server/src/routes/issues.ts#/companies/:companyId/issues/count | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/labels | server/src/routes/issues.ts#/companies/:companyId/labels | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/labels | server/src/routes/issues.ts#/companies/:companyId/labels | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/search | server/src/routes/issues.ts#/companies/:companyId/search | Backend Platform Lead |
| api_endpoint | implemented | GET /feedback-traces/:traceId | server/src/routes/issues.ts#/feedback-traces/:traceId | Backend Platform Lead |
| api_endpoint | implemented | GET /feedback-traces/:traceId/bundle | server/src/routes/issues.ts#/feedback-traces/:traceId/bundle | Backend Platform Lead |
| api_endpoint | implemented | GET /issues | server/src/routes/issues.ts#/issues | Backend Platform Lead |
| api_endpoint | implemented | DELETE /issues/:id | server/src/routes/issues.ts#/issues/:id | Backend Platform Lead |
| api_endpoint | implemented | GET /issues/:id | server/src/routes/issues.ts#/issues/:id | Backend Platform Lead |
| api_endpoint | implemented | PATCH /issues/:id | server/src/routes/issues.ts#/issues/:id | Backend Platform Lead |
| api_endpoint | implemented | GET /issues/:id/accepted-plan-decompositions | server/src/routes/issues.ts#/issues/:id/accepted-plan-decompositions | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/accepted-plan-decompositions | server/src/routes/issues.ts#/issues/:id/accepted-plan-decompositions | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/admin/force-release | server/src/routes/issues.ts#/issues/:id/admin/force-release | Backend Platform Lead |
| api_endpoint | implemented | GET /issues/:id/approvals | server/src/routes/issues.ts#/issues/:id/approvals | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/approvals | server/src/routes/issues.ts#/issues/:id/approvals | Backend Platform Lead |
| api_endpoint | implemented | DELETE /issues/:id/approvals/:approvalId | server/src/routes/issues.ts#/issues/:id/approvals/:approvalId | Backend Platform Lead |
| api_endpoint | implemented | GET /issues/:id/assignment-proposals | server/src/routes/issues.ts#/issues/:id/assignment-proposals | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/assignment-proposals | server/src/routes/issues.ts#/issues/:id/assignment-proposals | Backend Platform Lead |
| api_endpoint | implemented | GET /issues/:id/attachments | server/src/routes/issues.ts#/issues/:id/attachments | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/checkout | server/src/routes/issues.ts#/issues/:id/checkout | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/children | server/src/routes/issues.ts#/issues/:id/children | Backend Platform Lead |
| api_endpoint | implemented | GET /issues/:id/comments | server/src/routes/issues.ts#/issues/:id/comments | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/comments | server/src/routes/issues.ts#/issues/:id/comments | Backend Platform Lead |
| api_endpoint | implemented | DELETE /issues/:id/comments/:commentId | server/src/routes/issues.ts#/issues/:id/comments/:commentId | Backend Platform Lead |
| api_endpoint | implemented | GET /issues/:id/comments/:commentId | server/src/routes/issues.ts#/issues/:id/comments/:commentId | Backend Platform Lead |
| api_endpoint | implemented | GET /issues/:id/delegation-reports | server/src/routes/issues.ts#/issues/:id/delegation-reports | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/delegation-reports | server/src/routes/issues.ts#/issues/:id/delegation-reports | Backend Platform Lead |
| api_endpoint | implemented | GET /issues/:id/documents | server/src/routes/issues.ts#/issues/:id/documents | Backend Platform Lead |
| api_endpoint | implemented | DELETE /issues/:id/documents/:key | server/src/routes/issues.ts#/issues/:id/documents/:key | Backend Platform Lead |
| api_endpoint | implemented | GET /issues/:id/documents/:key | server/src/routes/issues.ts#/issues/:id/documents/:key | Backend Platform Lead |
| api_endpoint | implemented | PUT /issues/:id/documents/:key | server/src/routes/issues.ts#/issues/:id/documents/:key | Backend Platform Lead |
| api_endpoint | implemented | GET /issues/:id/documents/:key/annotations | server/src/routes/issues.ts#/issues/:id/documents/:key/annotations | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/documents/:key/annotations | server/src/routes/issues.ts#/issues/:id/documents/:key/annotations | Backend Platform Lead |
| api_endpoint | implemented | GET /issues/:id/documents/:key/annotations/:threadId | server/src/routes/issues.ts#/issues/:id/documents/:key/annotations/:threadId | Backend Platform Lead |
| api_endpoint | implemented | PATCH /issues/:id/documents/:key/annotations/:threadId | server/src/routes/issues.ts#/issues/:id/documents/:key/annotations/:threadId | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/documents/:key/annotations/:threadId/comments | server/src/routes/issues.ts#/issues/:id/documents/:key/annotations/:threadId/comments | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/documents/:key/lock | server/src/routes/issues.ts#/issues/:id/documents/:key/lock | Backend Platform Lead |
| api_endpoint | implemented | GET /issues/:id/documents/:key/revisions | server/src/routes/issues.ts#/issues/:id/documents/:key/revisions | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/documents/:key/revisions/:revisionId/restore | server/src/routes/issues.ts#/issues/:id/documents/:key/revisions/:revisionId/restore | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/documents/:key/unlock | server/src/routes/issues.ts#/issues/:id/documents/:key/unlock | Backend Platform Lead |
| api_endpoint | implemented | GET /issues/:id/feedback-traces | server/src/routes/issues.ts#/issues/:id/feedback-traces | Backend Platform Lead |
| api_endpoint | implemented | GET /issues/:id/feedback-votes | server/src/routes/issues.ts#/issues/:id/feedback-votes | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/feedback-votes | server/src/routes/issues.ts#/issues/:id/feedback-votes | Backend Platform Lead |
| api_endpoint | implemented | GET /issues/:id/heartbeat-context | server/src/routes/issues.ts#/issues/:id/heartbeat-context | Backend Platform Lead |
| api_endpoint | implemented | DELETE /issues/:id/inbox-archive | server/src/routes/issues.ts#/issues/:id/inbox-archive | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/inbox-archive | server/src/routes/issues.ts#/issues/:id/inbox-archive | Backend Platform Lead |
| api_endpoint | implemented | GET /issues/:id/interactions | server/src/routes/issues.ts#/issues/:id/interactions | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/interactions | server/src/routes/issues.ts#/issues/:id/interactions | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/interactions/:interactionId/accept | server/src/routes/issues.ts#/issues/:id/interactions/:interactionId/accept | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/interactions/:interactionId/cancel | server/src/routes/issues.ts#/issues/:id/interactions/:interactionId/cancel | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/interactions/:interactionId/reject | server/src/routes/issues.ts#/issues/:id/interactions/:interactionId/reject | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/interactions/:interactionId/respond | server/src/routes/issues.ts#/issues/:id/interactions/:interactionId/respond | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/low-trust/promotions | server/src/routes/issues.ts#/issues/:id/low-trust/promotions | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/monitor/check-now | server/src/routes/issues.ts#/issues/:id/monitor/check-now | Backend Platform Lead |
| api_endpoint | implemented | DELETE /issues/:id/read | server/src/routes/issues.ts#/issues/:id/read | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/read | server/src/routes/issues.ts#/issues/:id/read | Backend Platform Lead |
| api_endpoint | implemented | GET /issues/:id/recovery-actions | server/src/routes/issues.ts#/issues/:id/recovery-actions | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/recovery-actions/resolve | server/src/routes/issues.ts#/issues/:id/recovery-actions/resolve | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/release | server/src/routes/issues.ts#/issues/:id/release | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/scheduled-retry/retry-now | server/src/routes/issues.ts#/issues/:id/scheduled-retry/retry-now | Backend Platform Lead |
| api_endpoint | implemented | GET /issues/:id/work-products | server/src/routes/issues.ts#/issues/:id/work-products | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/work-products | server/src/routes/issues.ts#/issues/:id/work-products | Backend Platform Lead |
| api_endpoint | implemented | GET /issues/:id/work-proposals | server/src/routes/issues.ts#/issues/:id/work-proposals | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/work-proposals | server/src/routes/issues.ts#/issues/:id/work-proposals | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/work-proposals/:proposalId/status | server/src/routes/issues.ts#/issues/:id/work-proposals/:proposalId/status | Backend Platform Lead |
| api_endpoint | implemented | DELETE /labels/:labelId | server/src/routes/issues.ts#/labels/:labelId | Backend Platform Lead |
| api_endpoint | implemented | DELETE /work-products/:id | server/src/routes/issues.ts#/work-products/:id | Backend Platform Lead |
| api_endpoint | implemented | PATCH /work-products/:id | server/src/routes/issues.ts#/work-products/:id | Backend Platform Lead |
| api_endpoint | implemented | GET /llms/agent-configuration.txt | server/src/routes/llms.ts#/llms/agent-configuration.txt | Backend Platform Lead |
| api_endpoint | implemented | GET /llms/agent-configuration/:adapterType.txt | server/src/routes/llms.ts#/llms/agent-configuration/:adapterType.txt | Backend Platform Lead |
| api_endpoint | implemented | GET /llms/agent-icons.txt | server/src/routes/llms.ts#/llms/agent-icons.txt | Backend Platform Lead |
| api_endpoint | implemented | GET /openapi.json | server/src/routes/openapi.ts#/openapi.json | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/organizational-observations | server/src/routes/organizational-observations.ts#/companies/:companyId/organizational-observations | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/organizational-observations | server/src/routes/organizational-observations.ts#/companies/:companyId/organizational-observations | Backend Platform Lead |
| api_endpoint | implemented | GET /organizational-observations/:id | server/src/routes/organizational-observations.ts#/organizational-observations/:id | Backend Platform Lead |
| api_endpoint | implemented | PATCH /organizational-observations/:id | server/src/routes/organizational-observations.ts#/organizational-observations/:id | Backend Platform Lead |
| api_endpoint | implemented | POST /organizational-observations/:id/evaluate-promotion | server/src/routes/organizational-observations.ts#/organizational-observations/:id/evaluate-promotion | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/organizational-records | server/src/routes/organizational-records.ts#/companies/:companyId/organizational-records | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/organizational-records | server/src/routes/organizational-records.ts#/companies/:companyId/organizational-records | Backend Platform Lead |
| api_endpoint | implemented | GET /organizational-records/:id | server/src/routes/organizational-records.ts#/organizational-records/:id | Backend Platform Lead |
| api_endpoint | implemented | PATCH /organizational-records/:id | server/src/routes/organizational-records.ts#/organizational-records/:id | Backend Platform Lead |
| api_endpoint | implemented | GET /_plugins/:pluginId/ui/*filePath | server/src/routes/plugin-ui-static.ts#/_plugins/:pluginId/ui/*filePath | Backend Platform Lead |
| api_endpoint | implemented | GET /plugins | server/src/routes/plugins.ts#/plugins | Backend Platform Lead |
| api_endpoint | implemented | DELETE /plugins/:pluginId | server/src/routes/plugins.ts#/plugins/:pluginId | Backend Platform Lead |
| api_endpoint | implemented | GET /plugins/:pluginId | server/src/routes/plugins.ts#/plugins/:pluginId | Backend Platform Lead |
| api_endpoint | implemented | POST /plugins/:pluginId/actions/:key | server/src/routes/plugins.ts#/plugins/:pluginId/actions/:key | Backend Platform Lead |
| api_endpoint | implemented | USE /plugins/:pluginId/api | server/src/routes/plugins.ts#/plugins/:pluginId/api | Backend Platform Lead |
| api_endpoint | implemented | POST /plugins/:pluginId/bridge/action | server/src/routes/plugins.ts#/plugins/:pluginId/bridge/action | Backend Platform Lead |
| api_endpoint | implemented | POST /plugins/:pluginId/bridge/data | server/src/routes/plugins.ts#/plugins/:pluginId/bridge/data | Backend Platform Lead |
| api_endpoint | implemented | GET /plugins/:pluginId/bridge/stream/:channel | server/src/routes/plugins.ts#/plugins/:pluginId/bridge/stream/:channel | Backend Platform Lead |
| api_endpoint | implemented | GET /plugins/:pluginId/companies/:companyId/local-folders | server/src/routes/plugins.ts#/plugins/:pluginId/companies/:companyId/local-folders | Backend Platform Lead |
| api_endpoint | implemented | PUT /plugins/:pluginId/companies/:companyId/local-folders/:folderKey | server/src/routes/plugins.ts#/plugins/:pluginId/companies/:companyId/local-folders/:folderKey | Backend Platform Lead |
| api_endpoint | implemented | GET /plugins/:pluginId/companies/:companyId/local-folders/:folderKey/status | server/src/routes/plugins.ts#/plugins/:pluginId/companies/:companyId/local-folders/:folderKey/status | Backend Platform Lead |
| api_endpoint | implemented | POST /plugins/:pluginId/companies/:companyId/local-folders/:folderKey/validate | server/src/routes/plugins.ts#/plugins/:pluginId/companies/:companyId/local-folders/:folderKey/validate | Backend Platform Lead |
| api_endpoint | implemented | GET /plugins/:pluginId/config | server/src/routes/plugins.ts#/plugins/:pluginId/config | Backend Platform Lead |
| api_endpoint | implemented | POST /plugins/:pluginId/config | server/src/routes/plugins.ts#/plugins/:pluginId/config | Backend Platform Lead |
| api_endpoint | implemented | POST /plugins/:pluginId/config/test | server/src/routes/plugins.ts#/plugins/:pluginId/config/test | Backend Platform Lead |
| api_endpoint | implemented | GET /plugins/:pluginId/dashboard | server/src/routes/plugins.ts#/plugins/:pluginId/dashboard | Backend Platform Lead |
| api_endpoint | implemented | POST /plugins/:pluginId/data/:key | server/src/routes/plugins.ts#/plugins/:pluginId/data/:key | Backend Platform Lead |
| api_endpoint | implemented | POST /plugins/:pluginId/disable | server/src/routes/plugins.ts#/plugins/:pluginId/disable | Backend Platform Lead |
| api_endpoint | implemented | POST /plugins/:pluginId/enable | server/src/routes/plugins.ts#/plugins/:pluginId/enable | Backend Platform Lead |
| api_endpoint | implemented | GET /plugins/:pluginId/health | server/src/routes/plugins.ts#/plugins/:pluginId/health | Backend Platform Lead |
| api_endpoint | implemented | GET /plugins/:pluginId/jobs | server/src/routes/plugins.ts#/plugins/:pluginId/jobs | Backend Platform Lead |
| api_endpoint | implemented | GET /plugins/:pluginId/jobs/:jobId/runs | server/src/routes/plugins.ts#/plugins/:pluginId/jobs/:jobId/runs | Backend Platform Lead |
| api_endpoint | implemented | POST /plugins/:pluginId/jobs/:jobId/trigger | server/src/routes/plugins.ts#/plugins/:pluginId/jobs/:jobId/trigger | Backend Platform Lead |
| api_endpoint | implemented | GET /plugins/:pluginId/logs | server/src/routes/plugins.ts#/plugins/:pluginId/logs | Backend Platform Lead |
| api_endpoint | implemented | POST /plugins/:pluginId/upgrade | server/src/routes/plugins.ts#/plugins/:pluginId/upgrade | Backend Platform Lead |
| api_endpoint | implemented | POST /plugins/:pluginId/webhooks/:endpointKey | server/src/routes/plugins.ts#/plugins/:pluginId/webhooks/:endpointKey | Backend Platform Lead |
| api_endpoint | implemented | GET /plugins/examples | server/src/routes/plugins.ts#/plugins/examples | Backend Platform Lead |
| api_endpoint | implemented | POST /plugins/install | server/src/routes/plugins.ts#/plugins/install | Backend Platform Lead |
| api_endpoint | implemented | GET /plugins/tools | server/src/routes/plugins.ts#/plugins/tools | Backend Platform Lead |
| api_endpoint | implemented | POST /plugins/tools/execute | server/src/routes/plugins.ts#/plugins/tools/execute | Backend Platform Lead |
| api_endpoint | implemented | GET /plugins/ui-contributions | server/src/routes/plugins.ts#/plugins/ui-contributions | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/projects | server/src/routes/projects.ts#/companies/:companyId/projects | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/projects | server/src/routes/projects.ts#/companies/:companyId/projects | Backend Platform Lead |
| api_endpoint | implemented | DELETE /projects/:id | server/src/routes/projects.ts#/projects/:id | Backend Platform Lead |
| api_endpoint | implemented | GET /projects/:id | server/src/routes/projects.ts#/projects/:id | Backend Platform Lead |
| api_endpoint | implemented | PATCH /projects/:id | server/src/routes/projects.ts#/projects/:id | Backend Platform Lead |
| api_endpoint | implemented | GET /projects/:id/workspaces | server/src/routes/projects.ts#/projects/:id/workspaces | Backend Platform Lead |
| api_endpoint | implemented | POST /projects/:id/workspaces | server/src/routes/projects.ts#/projects/:id/workspaces | Backend Platform Lead |
| api_endpoint | implemented | DELETE /projects/:id/workspaces/:workspaceId | server/src/routes/projects.ts#/projects/:id/workspaces/:workspaceId | Backend Platform Lead |
| api_endpoint | implemented | PATCH /projects/:id/workspaces/:workspaceId | server/src/routes/projects.ts#/projects/:id/workspaces/:workspaceId | Backend Platform Lead |
| api_endpoint | implemented | POST /projects/:id/workspaces/:workspaceId/runtime-commands/:action | server/src/routes/projects.ts#/projects/:id/workspaces/:workspaceId/runtime-commands/:action | Backend Platform Lead |
| api_endpoint | implemented | POST /projects/:id/workspaces/:workspaceId/runtime-services/:action | server/src/routes/projects.ts#/projects/:id/workspaces/:workspaceId/runtime-services/:action | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/resource-memberships/me | server/src/routes/resource-memberships.ts#/companies/:companyId/resource-memberships/me | Backend Platform Lead |
| api_endpoint | implemented | PUT /companies/:companyId/resource-memberships/me/agents/:agentId | server/src/routes/resource-memberships.ts#/companies/:companyId/resource-memberships/me/agents/:agentId | Backend Platform Lead |
| api_endpoint | implemented | PUT /companies/:companyId/resource-memberships/me/projects/:projectId | server/src/routes/resource-memberships.ts#/companies/:companyId/resource-memberships/me/projects/:projectId | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/routines | server/src/routes/routines.ts#/companies/:companyId/routines | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/routines | server/src/routes/routines.ts#/companies/:companyId/routines | Backend Platform Lead |
| api_endpoint | implemented | DELETE /routine-triggers/:id | server/src/routes/routines.ts#/routine-triggers/:id | Backend Platform Lead |
| api_endpoint | implemented | PATCH /routine-triggers/:id | server/src/routes/routines.ts#/routine-triggers/:id | Backend Platform Lead |
| api_endpoint | implemented | POST /routine-triggers/:id/rotate-secret | server/src/routes/routines.ts#/routine-triggers/:id/rotate-secret | Backend Platform Lead |
| api_endpoint | implemented | POST /routine-triggers/public/:publicId/fire | server/src/routes/routines.ts#/routine-triggers/public/:publicId/fire | Backend Platform Lead |
| api_endpoint | implemented | GET /routines/:id | server/src/routes/routines.ts#/routines/:id | Backend Platform Lead |
| api_endpoint | implemented | PATCH /routines/:id | server/src/routes/routines.ts#/routines/:id | Backend Platform Lead |
| api_endpoint | implemented | GET /routines/:id/revisions | server/src/routes/routines.ts#/routines/:id/revisions | Backend Platform Lead |
| api_endpoint | implemented | POST /routines/:id/revisions/:revisionId/restore | server/src/routes/routines.ts#/routines/:id/revisions/:revisionId/restore | Backend Platform Lead |
| api_endpoint | implemented | POST /routines/:id/run | server/src/routes/routines.ts#/routines/:id/run | Backend Platform Lead |
| api_endpoint | implemented | GET /routines/:id/runs | server/src/routes/routines.ts#/routines/:id/runs | Backend Platform Lead |
| api_endpoint | implemented | POST /routines/:id/triggers | server/src/routes/routines.ts#/routines/:id/triggers | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/secret-provider-configs | server/src/routes/secrets.ts#/companies/:companyId/secret-provider-configs | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/secret-provider-configs | server/src/routes/secrets.ts#/companies/:companyId/secret-provider-configs | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/secret-provider-configs/discovery/preview | server/src/routes/secrets.ts#/companies/:companyId/secret-provider-configs/discovery/preview | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/secret-providers | server/src/routes/secrets.ts#/companies/:companyId/secret-providers | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/secret-providers/health | server/src/routes/secrets.ts#/companies/:companyId/secret-providers/health | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/secrets | server/src/routes/secrets.ts#/companies/:companyId/secrets | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/secrets | server/src/routes/secrets.ts#/companies/:companyId/secrets | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/secrets/metadata | server/src/routes/secrets.ts#/companies/:companyId/secrets/metadata | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/secrets/remote-import | server/src/routes/secrets.ts#/companies/:companyId/secrets/remote-import | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/secrets/remote-import/preview | server/src/routes/secrets.ts#/companies/:companyId/secrets/remote-import/preview | Backend Platform Lead |
| api_endpoint | implemented | DELETE /secret-provider-configs/:id | server/src/routes/secrets.ts#/secret-provider-configs/:id | Backend Platform Lead |
| api_endpoint | implemented | GET /secret-provider-configs/:id | server/src/routes/secrets.ts#/secret-provider-configs/:id | Backend Platform Lead |
| api_endpoint | implemented | PATCH /secret-provider-configs/:id | server/src/routes/secrets.ts#/secret-provider-configs/:id | Backend Platform Lead |
| api_endpoint | implemented | POST /secret-provider-configs/:id/default | server/src/routes/secrets.ts#/secret-provider-configs/:id/default | Backend Platform Lead |
| api_endpoint | implemented | POST /secret-provider-configs/:id/health | server/src/routes/secrets.ts#/secret-provider-configs/:id/health | Backend Platform Lead |
| api_endpoint | implemented | DELETE /secrets/:id | server/src/routes/secrets.ts#/secrets/:id | Backend Platform Lead |
| api_endpoint | implemented | PATCH /secrets/:id | server/src/routes/secrets.ts#/secrets/:id | Backend Platform Lead |
| api_endpoint | implemented | GET /secrets/:id/access-events | server/src/routes/secrets.ts#/secrets/:id/access-events | Backend Platform Lead |
| api_endpoint | implemented | POST /secrets/:id/rotate | server/src/routes/secrets.ts#/secrets/:id/rotate | Backend Platform Lead |
| api_endpoint | implemented | GET /secrets/:id/usage | server/src/routes/secrets.ts#/secrets/:id/usage | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/sidebar-badges | server/src/routes/sidebar-badges.ts#/companies/:companyId/sidebar-badges | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/sidebar-preferences/me | server/src/routes/sidebar-preferences.ts#/companies/:companyId/sidebar-preferences/me | Backend Platform Lead |
| api_endpoint | implemented | PUT /companies/:companyId/sidebar-preferences/me | server/src/routes/sidebar-preferences.ts#/companies/:companyId/sidebar-preferences/me | Backend Platform Lead |
| api_endpoint | implemented | GET /sidebar-preferences/me | server/src/routes/sidebar-preferences.ts#/sidebar-preferences/me | Backend Platform Lead |
| api_endpoint | implemented | PUT /sidebar-preferences/me | server/src/routes/sidebar-preferences.ts#/sidebar-preferences/me | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/softwarehouse/backlog | server/src/routes/softwarehouse.ts#/companies/:companyId/softwarehouse/backlog | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/softwarehouse/coolify/featherly-inventory | server/src/routes/softwarehouse.ts#/companies/:companyId/softwarehouse/coolify/featherly-inventory | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/softwarehouse/hierarchy-health | server/src/routes/softwarehouse.ts#/companies/:companyId/softwarehouse/hierarchy-health | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/softwarehouse/issue-templates | server/src/routes/softwarehouse.ts#/companies/:companyId/softwarehouse/issue-templates | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/softwarehouse/knowledge | server/src/routes/softwarehouse.ts#/companies/:companyId/softwarehouse/knowledge | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/softwarehouse/portfolio-projection/:version | server/src/routes/softwarehouse.ts#/companies/:companyId/softwarehouse/portfolio-projection/:version | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/softwarehouse/project-truth-probe | server/src/routes/softwarehouse.ts#/companies/:companyId/softwarehouse/project-truth-probe | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/softwarehouse/status | server/src/routes/softwarehouse.ts#/companies/:companyId/softwarehouse/status | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/softwarehouse/tools | server/src/routes/softwarehouse.ts#/companies/:companyId/softwarehouse/tools | Backend Platform Lead |
| api_endpoint | implemented | POST /autonomy/decisions/:id/canary-authorizations | server/src/routes/supervision.ts#/autonomy/decisions/:id/canary-authorizations | Backend Platform Lead |
| api_endpoint | implemented | POST /autonomy/decisions/:id/dispatch | server/src/routes/supervision.ts#/autonomy/decisions/:id/dispatch | Backend Platform Lead |
| api_endpoint | implemented | GET /autonomy/decisions/:id/evaluations | server/src/routes/supervision.ts#/autonomy/decisions/:id/evaluations | Backend Platform Lead |
| api_endpoint | implemented | POST /autonomy/decisions/:id/evaluations | server/src/routes/supervision.ts#/autonomy/decisions/:id/evaluations | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/autonomy/canary-authorizations | server/src/routes/supervision.ts#/companies/:companyId/autonomy/canary-authorizations | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/autonomy/constraints | server/src/routes/supervision.ts#/companies/:companyId/autonomy/constraints | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/autonomy/decisions | server/src/routes/supervision.ts#/companies/:companyId/autonomy/decisions | Backend Platform Lead |
| api_endpoint | implemented | PATCH /companies/:companyId/autonomy/envelope-capacity | server/src/routes/supervision.ts#/companies/:companyId/autonomy/envelope-capacity | Backend Platform Lead |
| api_endpoint | implemented | PATCH /companies/:companyId/autonomy/envelope-stage | server/src/routes/supervision.ts#/companies/:companyId/autonomy/envelope-stage | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/autonomy/envelopes | server/src/routes/supervision.ts#/companies/:companyId/autonomy/envelopes | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/autonomy/executions | server/src/routes/supervision.ts#/companies/:companyId/autonomy/executions | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/autonomy/health | server/src/routes/supervision.ts#/companies/:companyId/autonomy/health | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/autonomy/intents | server/src/routes/supervision.ts#/companies/:companyId/autonomy/intents | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/autonomy/intents/:issueId | server/src/routes/supervision.ts#/companies/:companyId/autonomy/intents/:issueId | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/autonomy/interrupts | server/src/routes/supervision.ts#/companies/:companyId/autonomy/interrupts | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/autonomy/interrupts | server/src/routes/supervision.ts#/companies/:companyId/autonomy/interrupts | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/autonomy/learned-policies | server/src/routes/supervision.ts#/companies/:companyId/autonomy/learned-policies | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/autonomy/learned-policies | server/src/routes/supervision.ts#/companies/:companyId/autonomy/learned-policies | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/supervision/archive | server/src/routes/supervision.ts#/companies/:companyId/supervision/archive | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/supervision/cycles | server/src/routes/supervision.ts#/companies/:companyId/supervision/cycles | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/supervision/findings | server/src/routes/supervision.ts#/companies/:companyId/supervision/findings | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/supervision/findings | server/src/routes/supervision.ts#/companies/:companyId/supervision/findings | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/supervision/interventions | server/src/routes/supervision.ts#/companies/:companyId/supervision/interventions | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/supervision/observation-windows | server/src/routes/supervision.ts#/companies/:companyId/supervision/observation-windows | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/supervision/recover | server/src/routes/supervision.ts#/companies/:companyId/supervision/recover | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/supervision/root-causes | server/src/routes/supervision.ts#/companies/:companyId/supervision/root-causes | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/supervision/safeguards | server/src/routes/supervision.ts#/companies/:companyId/supervision/safeguards | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/supervision/shadow-comparisons | server/src/routes/supervision.ts#/companies/:companyId/supervision/shadow-comparisons | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/supervision/shadow-comparisons | server/src/routes/supervision.ts#/companies/:companyId/supervision/shadow-comparisons | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/supervision/snapshot | server/src/routes/supervision.ts#/companies/:companyId/supervision/snapshot | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/supervision/stalled-ready/dispatch | server/src/routes/supervision.ts#/companies/:companyId/supervision/stalled-ready/dispatch | Backend Platform Lead |
| api_endpoint | implemented | POST /supervision/cycles/:id/finish | server/src/routes/supervision.ts#/supervision/cycles/:id/finish | Backend Platform Lead |
| api_endpoint | implemented | GET /supervision/findings/:id | server/src/routes/supervision.ts#/supervision/findings/:id | Backend Platform Lead |
| api_endpoint | implemented | POST /supervision/findings/:id/root-cause | server/src/routes/supervision.ts#/supervision/findings/:id/root-cause | Backend Platform Lead |
| api_endpoint | implemented | POST /supervision/observation-windows/:id/complete | server/src/routes/supervision.ts#/supervision/observation-windows/:id/complete | Backend Platform Lead |
| api_endpoint | implemented | POST /supervision/root-causes/:id/close | server/src/routes/supervision.ts#/supervision/root-causes/:id/close | Backend Platform Lead |
| api_endpoint | implemented | PATCH /supervision/safeguards/:id | server/src/routes/supervision.ts#/supervision/safeguards/:id | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/teams/catalog/:catalogId/install | server/src/routes/teams-catalog.ts#/companies/:companyId/teams/catalog/:catalogId/install | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/teams/catalog/:catalogId/preview | server/src/routes/teams-catalog.ts#/companies/:companyId/teams/catalog/:catalogId/preview | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/teams/catalog/installed | server/src/routes/teams-catalog.ts#/companies/:companyId/teams/catalog/installed | Backend Platform Lead |
| api_endpoint | implemented | GET /teams/catalog | server/src/routes/teams-catalog.ts#/teams/catalog | Backend Platform Lead |
| api_endpoint | implemented | GET /teams/catalog/:catalogId | server/src/routes/teams-catalog.ts#/teams/catalog/:catalogId | Backend Platform Lead |
| api_endpoint | implemented | GET /teams/catalog/:catalogId/files | server/src/routes/teams-catalog.ts#/teams/catalog/:catalogId/files | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/users/:userSlug/profile | server/src/routes/user-profiles.ts#/companies/:companyId/users/:userSlug/profile | Backend Platform Lead |
| component | implemented | index.tsx | packages/plugins/examples/plugin-authoring-smoke-example/src/ui/index.tsx | Plugin Platform Lead |
| component | implemented | index.tsx | packages/plugins/examples/plugin-file-browser-example/src/ui/index.tsx | Plugin Platform Lead |
| component | implemented | index.tsx | packages/plugins/examples/plugin-hello-world-example/src/ui/index.tsx | Plugin Platform Lead |
| component | implemented | AsciiArtAnimation.tsx | packages/plugins/examples/plugin-kitchen-sink-example/src/ui/AsciiArtAnimation.tsx | Plugin Platform Lead |
| component | implemented | index.tsx | packages/plugins/examples/plugin-kitchen-sink-example/src/ui/index.tsx | Plugin Platform Lead |
| component | implemented | index.tsx | packages/plugins/examples/plugin-orchestration-smoke-example/src/ui/index.tsx | Plugin Platform Lead |
| component | implemented | app.tsx | packages/plugins/plugin-llm-wiki/src/ui/app.tsx | Plugin Platform Lead |
| component | implemented | index.tsx | packages/plugins/plugin-llm-wiki/src/ui/index.tsx | Plugin Platform Lead |
| component | implemented | index.tsx | packages/plugins/plugin-workspace-diff/src/ui/index.tsx | Plugin Platform Lead |

## Relation Index

| Type | From | To | Evidence |
| --- | --- | --- | --- |
| connected_to | api_endpoint:delete-adapters-type:261ac82c9d | module:src-routes:b474eba4ee | server/src/routes/adapters.ts |
| connected_to | api_endpoint:delete-agents-id-instructions-bundle-file:9723d64054 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:delete-agents-id-keys-keyid:6bf2a864ac | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:delete-agents-id:c6de105f68 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:delete-attachments-attachmentid:cb78eb2436 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:delete-companies-companyid-decisions-sourcetype-sourceid-defer:44288d577b | module:src-routes:b474eba4ee | server/src/routes/decision-center.ts |
| connected_to | api_endpoint:delete-companies-companyid-skills-skillid:e7012699de | module:src-routes:b474eba4ee | server/src/routes/company-skills.ts |
| connected_to | api_endpoint:delete-companyid:fa9018b8ee | module:src-routes:b474eba4ee | server/src/routes/companies.ts |
| connected_to | api_endpoint:delete-environments-id:3083c8cd96 | module:src-routes:b474eba4ee | server/src/routes/environments.ts |
| connected_to | api_endpoint:delete-goals-id:20eb55dd6f | module:src-routes:b474eba4ee | server/src/routes/goals.ts |
| connected_to | api_endpoint:delete-issues-id-approvals-approvalid:dd67d7a416 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:delete-issues-id-comments-commentid:3d11410216 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:delete-issues-id-documents-key:22236cf8b8 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:delete-issues-id-inbox-archive:0c441a5932 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:delete-issues-id-read:90724c71d6 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:delete-issues-id:25bc792ec0 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:delete-labels-labelid:ebf7ec7abb | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:delete-plugins-pluginid:25cdd2a3ba | module:src-routes:b474eba4ee | server/src/routes/plugins.ts |
| connected_to | api_endpoint:delete-projects-id-workspaces-workspaceid:27f68d039d | module:src-routes:b474eba4ee | server/src/routes/projects.ts |
| connected_to | api_endpoint:delete-projects-id:30ad270478 | module:src-routes:b474eba4ee | server/src/routes/projects.ts |
| connected_to | api_endpoint:delete-routine-triggers-id:d887e85e1a | module:src-routes:b474eba4ee | server/src/routes/routines.ts |
| connected_to | api_endpoint:delete-secret-provider-configs-id:a8b0b47873 | module:src-routes:b474eba4ee | server/src/routes/secrets.ts |
| connected_to | api_endpoint:delete-secrets-id:ec9eb5e9d5 | module:src-routes:b474eba4ee | server/src/routes/secrets.ts |
| connected_to | api_endpoint:delete-work-products-id:341b11e409 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:get-adapters-type-config-schema:560735ad04 | module:src-routes:b474eba4ee | server/src/routes/adapters.ts |
| connected_to | api_endpoint:get-adapters-type-ui-parser-js:4ce075592a | module:src-routes:b474eba4ee | server/src/routes/adapters.ts |
| connected_to | api_endpoint:get-adapters:fef3859e41 | module:src-routes:b474eba4ee | server/src/routes/adapters.ts |
| connected_to | api_endpoint:get-admin-users-userid-company-access:3b3fbf2f12 | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:get-admin-users:33fe871543 | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:get-agents-id-config-revisions-revisionid:1a564dc5df | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:get-agents-id-config-revisions:fbe843c331 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:get-agents-id-configuration:3e0d9718f2 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:get-agents-id-instructions-bundle-file:142fa16360 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:get-agents-id-instructions-bundle:391b7f7844 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:get-agents-id-keys:d1e979567e | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:get-agents-id-runtime-state:901571eae9 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:get-agents-id-skills:bb743efba9 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:get-agents-id-task-sessions:326fbda0b5 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:get-agents-id:b7553c57f5 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:get-agents-me-inbox-lite:95dcd630e9 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:get-agents-me-inbox-mine:3607fb9817 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:get-agents-me:e9cba0d6e9 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:get-approvals-id-comments:d1c42a0ff7 | module:src-routes:b474eba4ee | server/src/routes/approvals.ts |
| connected_to | api_endpoint:get-approvals-id-issues:6c6b090d8c | module:src-routes:b474eba4ee | server/src/routes/approvals.ts |
| connected_to | api_endpoint:get-approvals-id:5ef46e391d | module:src-routes:b474eba4ee | server/src/routes/approvals.ts |
| connected_to | api_endpoint:get-assets-assetid-content:40c445f6a0 | module:src-routes:b474eba4ee | server/src/routes/assets.ts |
| connected_to | api_endpoint:get-attachments-attachmentid-content:fe4ebfa19c | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:get-autonomy-decisions-id-evaluations:b95767c335 | module:src-routes:b474eba4ee | server/src/routes/supervision.ts |
| connected_to | api_endpoint:get-board-claim-token:d9c5491ac0 | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:get-cli-auth-challenges-id:c4a6ea60c4 | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:get-cli-auth-me:04f4342f2d | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:get-cloud-upstreams-connectionid-push-runs-runid:d809f897df | module:src-routes:b474eba4ee | server/src/routes/cloud-upstreams.ts |
| connected_to | api_endpoint:get-cloud-upstreams:e681f2d029 | module:src-routes:b474eba4ee | server/src/routes/cloud-upstreams.ts |
| connected_to | api_endpoint:get-companies-companyid-activity:8a8290c529 | module:src-routes:b474eba4ee | server/src/routes/activity.ts |
| connected_to | api_endpoint:get-companies-companyid-adapters-type-detect-model:ce6f62715c | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:get-companies-companyid-adapters-type-model-profiles:ae29579111 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:get-companies-companyid-adapters-type-models:a19b916b35 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:get-companies-companyid-admission-controls:764bca8826 | module:src-routes:b474eba4ee | server/src/routes/admission-control.ts |
| connected_to | api_endpoint:get-companies-companyid-agent-availability:a699e3826b | module:src-routes:b474eba4ee | server/src/routes/admission-control.ts |
| connected_to | api_endpoint:get-companies-companyid-agent-configurations:ed14af9e8e | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:get-companies-companyid-agents:d019714997 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:get-companies-companyid-approvals:c48c0d67dc | module:src-routes:b474eba4ee | server/src/routes/approvals.ts |
| connected_to | api_endpoint:get-companies-companyid-autonomy-canary-authorizations:bd238d29ea | module:src-routes:b474eba4ee | server/src/routes/supervision.ts |
| connected_to | api_endpoint:get-companies-companyid-autonomy-constraints:023fd0438e | module:src-routes:b474eba4ee | server/src/routes/supervision.ts |
| connected_to | api_endpoint:get-companies-companyid-autonomy-decisions:f807eab5c3 | module:src-routes:b474eba4ee | server/src/routes/supervision.ts |
| connected_to | api_endpoint:get-companies-companyid-autonomy-envelopes:dac4b216f1 | module:src-routes:b474eba4ee | server/src/routes/supervision.ts |
| connected_to | api_endpoint:get-companies-companyid-autonomy-executions:636d7ee7c7 | module:src-routes:b474eba4ee | server/src/routes/supervision.ts |
| connected_to | api_endpoint:get-companies-companyid-autonomy-health:9f73f441ba | module:src-routes:b474eba4ee | server/src/routes/supervision.ts |
| connected_to | api_endpoint:get-companies-companyid-autonomy-intents:ae33eef89a | module:src-routes:b474eba4ee | server/src/routes/supervision.ts |
| connected_to | api_endpoint:get-companies-companyid-autonomy-interrupts:740b81ab0c | module:src-routes:b474eba4ee | server/src/routes/supervision.ts |
| connected_to | api_endpoint:get-companies-companyid-autonomy-learned-policies:2fbc709c04 | module:src-routes:b474eba4ee | server/src/routes/supervision.ts |
| connected_to | api_endpoint:get-companies-companyid-budgets-overview:0c07689cee | module:src-routes:b474eba4ee | server/src/routes/costs.ts |
| connected_to | api_endpoint:get-companies-companyid-costs-by-agent-model:7e7c96901d | module:src-routes:b474eba4ee | server/src/routes/costs.ts |
| connected_to | api_endpoint:get-companies-companyid-costs-by-agent:2f81a3d772 | module:src-routes:b474eba4ee | server/src/routes/costs.ts |
| connected_to | api_endpoint:get-companies-companyid-costs-by-biller:23ede2b60e | module:src-routes:b474eba4ee | server/src/routes/costs.ts |
| connected_to | api_endpoint:get-companies-companyid-costs-by-project:c6ae4b6cf7 | module:src-routes:b474eba4ee | server/src/routes/costs.ts |
| connected_to | api_endpoint:get-companies-companyid-costs-by-provider:416dc7583e | module:src-routes:b474eba4ee | server/src/routes/costs.ts |
| connected_to | api_endpoint:get-companies-companyid-costs-finance-by-biller:18c0f34105 | module:src-routes:b474eba4ee | server/src/routes/costs.ts |
| connected_to | api_endpoint:get-companies-companyid-costs-finance-by-kind:cd7b8a5569 | module:src-routes:b474eba4ee | server/src/routes/costs.ts |
| connected_to | api_endpoint:get-companies-companyid-costs-finance-events:e3b9d969a1 | module:src-routes:b474eba4ee | server/src/routes/costs.ts |
| connected_to | api_endpoint:get-companies-companyid-costs-finance-summary:17508ef4d3 | module:src-routes:b474eba4ee | server/src/routes/costs.ts |
| connected_to | api_endpoint:get-companies-companyid-costs-model-profiles:8f87d0f78d | module:src-routes:b474eba4ee | server/src/routes/costs.ts |
| connected_to | api_endpoint:get-companies-companyid-costs-quota-windows:4ef8d8f2f9 | module:src-routes:b474eba4ee | server/src/routes/costs.ts |
| connected_to | api_endpoint:get-companies-companyid-costs-summary:86652e5a51 | module:src-routes:b474eba4ee | server/src/routes/costs.ts |
| connected_to | api_endpoint:get-companies-companyid-costs-window-spend:d19c064103 | module:src-routes:b474eba4ee | server/src/routes/costs.ts |
| connected_to | api_endpoint:get-companies-companyid-dashboard:a3b85af771 | module:src-routes:b474eba4ee | server/src/routes/dashboard.ts |
| connected_to | api_endpoint:get-companies-companyid-decisions:384fd2f187 | module:src-routes:b474eba4ee | server/src/routes/decision-center.ts |
| connected_to | api_endpoint:get-companies-companyid-deliveries:df67bf764e | module:src-routes:b474eba4ee | server/src/routes/deliveries.ts |
| connected_to | api_endpoint:get-companies-companyid-environments-capabilities:3cf50e822b | module:src-routes:b474eba4ee | server/src/routes/environments.ts |
| connected_to | api_endpoint:get-companies-companyid-environments:ac6e4c8a72 | module:src-routes:b474eba4ee | server/src/routes/environments.ts |
| connected_to | api_endpoint:get-companies-companyid-execution-workspaces-diagnostics:2fdcaaeb62 | module:src-routes:b474eba4ee | server/src/routes/execution-workspaces.ts |
| connected_to | api_endpoint:get-companies-companyid-execution-workspaces:e228eb46e6 | module:src-routes:b474eba4ee | server/src/routes/execution-workspaces.ts |
| connected_to | api_endpoint:get-companies-companyid-goals:9613e9d197 | module:src-routes:b474eba4ee | server/src/routes/goals.ts |
| connected_to | api_endpoint:get-companies-companyid-heartbeat-runs:d255fe604d | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:get-companies-companyid-inbox-dismissals:656da7ce6f | module:src-routes:b474eba4ee | server/src/routes/inbox-dismissals.ts |
| connected_to | api_endpoint:get-companies-companyid-invites:54237100fc | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:get-companies-companyid-issues-count:62899e97cb | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:get-companies-companyid-issues:b22d0cfedf | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:get-companies-companyid-join-requests:9bd7c19898 | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:get-companies-companyid-labels:7a4294dc35 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:get-companies-companyid-live-runs:6caa7bf8d9 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:get-companies-companyid-members:a23f467618 | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:get-companies-companyid-next-legal-actions:14abadcb91 | module:src-routes:b474eba4ee | server/src/routes/dashboard.ts |
| connected_to | api_endpoint:get-companies-companyid-org-png:e2b0a62a36 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:get-companies-companyid-org-svg:757b161560 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:get-companies-companyid-org:1972369169 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:get-companies-companyid-organizational-observations:34363ae361 | module:src-routes:b474eba4ee | server/src/routes/organizational-observations.ts |
| connected_to | api_endpoint:get-companies-companyid-organizational-records:b10d421ec7 | module:src-routes:b474eba4ee | server/src/routes/organizational-records.ts |
| connected_to | api_endpoint:get-companies-companyid-projects:b6e728483f | module:src-routes:b474eba4ee | server/src/routes/projects.ts |
| connected_to | api_endpoint:get-companies-companyid-resource-memberships-me:4e09e1dfc6 | module:src-routes:b474eba4ee | server/src/routes/resource-memberships.ts |
| connected_to | api_endpoint:get-companies-companyid-routines:8484ff1997 | module:src-routes:b474eba4ee | server/src/routes/routines.ts |
| connected_to | api_endpoint:get-companies-companyid-search:c483ad4e92 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:get-companies-companyid-secret-provider-configs:642ee94be8 | module:src-routes:b474eba4ee | server/src/routes/secrets.ts |
| connected_to | api_endpoint:get-companies-companyid-secret-providers-health:58835833c8 | module:src-routes:b474eba4ee | server/src/routes/secrets.ts |
| connected_to | api_endpoint:get-companies-companyid-secret-providers:94417f6fd6 | module:src-routes:b474eba4ee | server/src/routes/secrets.ts |
| connected_to | api_endpoint:get-companies-companyid-secrets-metadata:8149151529 | module:src-routes:b474eba4ee | server/src/routes/secrets.ts |
| connected_to | api_endpoint:get-companies-companyid-secrets:e5d1260266 | module:src-routes:b474eba4ee | server/src/routes/secrets.ts |
| connected_to | api_endpoint:get-companies-companyid-sidebar-badges:3672ff6f03 | module:src-routes:b474eba4ee | server/src/routes/sidebar-badges.ts |
| connected_to | api_endpoint:get-companies-companyid-sidebar-preferences-me:baf708a5fe | module:src-routes:b474eba4ee | server/src/routes/sidebar-preferences.ts |
| connected_to | api_endpoint:get-companies-companyid-situation:782e7df67f | module:src-routes:b474eba4ee | server/src/routes/dashboard.ts |
| connected_to | api_endpoint:get-companies-companyid-skills-skillid-files:2bb8de60d9 | module:src-routes:b474eba4ee | server/src/routes/company-skills.ts |
| connected_to | api_endpoint:get-companies-companyid-skills-skillid-update-status:ec7b242ca5 | module:src-routes:b474eba4ee | server/src/routes/company-skills.ts |
| connected_to | api_endpoint:get-companies-companyid-skills-skillid:5caa9c49a1 | module:src-routes:b474eba4ee | server/src/routes/company-skills.ts |
| connected_to | api_endpoint:get-companies-companyid-skills:936e7dcc51 | module:src-routes:b474eba4ee | server/src/routes/company-skills.ts |
| connected_to | api_endpoint:get-companies-companyid-softwarehouse-backlog:1f9fdb29d0 | module:src-routes:b474eba4ee | server/src/routes/softwarehouse.ts |
| connected_to | api_endpoint:get-companies-companyid-softwarehouse-coolify-featherly-inventory:2d5de315f1 | module:src-routes:b474eba4ee | server/src/routes/softwarehouse.ts |
| connected_to | api_endpoint:get-companies-companyid-softwarehouse-hierarchy-health:65d7d1249e | module:src-routes:b474eba4ee | server/src/routes/softwarehouse.ts |
| connected_to | api_endpoint:get-companies-companyid-softwarehouse-issue-templates:c959b5150c | module:src-routes:b474eba4ee | server/src/routes/softwarehouse.ts |
| connected_to | api_endpoint:get-companies-companyid-softwarehouse-knowledge:4e9c016808 | module:src-routes:b474eba4ee | server/src/routes/softwarehouse.ts |
| connected_to | api_endpoint:get-companies-companyid-softwarehouse-portfolio-projection-version:350f91c1c6 | module:src-routes:b474eba4ee | server/src/routes/softwarehouse.ts |
| connected_to | api_endpoint:get-companies-companyid-softwarehouse-status:d4ad9a23e7 | module:src-routes:b474eba4ee | server/src/routes/softwarehouse.ts |
| connected_to | api_endpoint:get-companies-companyid-softwarehouse-tools:f7d8321117 | module:src-routes:b474eba4ee | server/src/routes/softwarehouse.ts |
| connected_to | api_endpoint:get-companies-companyid-supervision-findings:edb0faef10 | module:src-routes:b474eba4ee | server/src/routes/supervision.ts |
| connected_to | api_endpoint:get-companies-companyid-supervision-shadow-comparisons:01c6757c7d | module:src-routes:b474eba4ee | server/src/routes/supervision.ts |
| connected_to | api_endpoint:get-companies-companyid-supervision-snapshot:ecde994c63 | module:src-routes:b474eba4ee | server/src/routes/supervision.ts |
| connected_to | api_endpoint:get-companies-companyid-teams-catalog-installed:24f6dfb582 | module:src-routes:b474eba4ee | server/src/routes/teams-catalog.ts |
| connected_to | api_endpoint:get-companies-companyid-user-directory:7d2f0cc67b | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:get-companies-companyid-users-userslug-profile:ba4a566949 | module:src-routes:b474eba4ee | server/src/routes/user-profiles.ts |
| connected_to | api_endpoint:get-companyid-artifacts:05894db53f | module:src-routes:b474eba4ee | server/src/routes/companies.ts |
| connected_to | api_endpoint:get-companyid-feedback-traces:022db1d66e | module:src-routes:b474eba4ee | server/src/routes/companies.ts |
| connected_to | api_endpoint:get-companyid:6575a2d654 | module:src-routes:b474eba4ee | server/src/routes/companies.ts |
| connected_to | api_endpoint:get-deliveries-id:14cdad6d18 | module:src-routes:b474eba4ee | server/src/routes/deliveries.ts |
| connected_to | api_endpoint:get-environment-leases-leaseid:581bf1fb7c | module:src-routes:b474eba4ee | server/src/routes/environments.ts |
| connected_to | api_endpoint:get-environments-id-leases:aa82420d24 | module:src-routes:b474eba4ee | server/src/routes/environments.ts |
| connected_to | api_endpoint:get-environments-id:d85fd35295 | module:src-routes:b474eba4ee | server/src/routes/environments.ts |
| connected_to | api_endpoint:get-execution-workspaces-id-close-readiness:290891b565 | module:src-routes:b474eba4ee | server/src/routes/execution-workspaces.ts |
| connected_to | api_endpoint:get-execution-workspaces-id-workspace-operations:017ded6929 | module:src-routes:b474eba4ee | server/src/routes/execution-workspaces.ts |
| connected_to | api_endpoint:get-execution-workspaces-id:cfa7051bc9 | module:src-routes:b474eba4ee | server/src/routes/execution-workspaces.ts |
| connected_to | api_endpoint:get-feedback-traces-traceid-bundle:ce915e36a3 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:get-feedback-traces-traceid:451ffb476b | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:get-get-session:b582887f38 | module:src-routes:b474eba4ee | server/src/routes/auth.ts |
| connected_to | api_endpoint:get-goals-id:48ea40de41 | module:src-routes:b474eba4ee | server/src/routes/goals.ts |
| connected_to | api_endpoint:get-heartbeat-runs-runid-events:72b2905a17 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:get-heartbeat-runs-runid-issues:9f825c252e | module:src-routes:b474eba4ee | server/src/routes/activity.ts |
| connected_to | api_endpoint:get-heartbeat-runs-runid-log:36370e2e5f | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:get-heartbeat-runs-runid-workspace-operations:e03957ac78 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:get-heartbeat-runs-runid:d0dd3fb197 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:get-import-jobs-jobid:ecdba4676b | module:src-routes:b474eba4ee | server/src/routes/companies.ts |
| connected_to | api_endpoint:get-instance-scheduler-heartbeats:0614a006b4 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:get-instance-settings-experimental:8e6a98cb77 | module:src-routes:b474eba4ee | server/src/routes/instance-settings.ts |
| connected_to | api_endpoint:get-instance-settings-general:2dd8a87daa | module:src-routes:b474eba4ee | server/src/routes/instance-settings.ts |
| connected_to | api_endpoint:get-invites-token-logo:0359e06c69 | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:get-invites-token-onboarding-txt:8136c71c72 | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:get-invites-token-onboarding:f4690dfdbc | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:get-invites-token-skills-index:d6fa5a337c | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:get-invites-token-skills-skillname:798eb6ec7a | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:get-invites-token-test-resolution:570be3e103 | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:get-invites-token:04d08a93b4 | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:get-issues-id-accepted-plan-decompositions:e68952a4d0 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:get-issues-id-activity:392a36c1ad | module:src-routes:b474eba4ee | server/src/routes/activity.ts |
| connected_to | api_endpoint:get-issues-id-approvals:e90953f7e0 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:get-issues-id-assignment-proposals:bd21034acf | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:get-issues-id-attachments:8491afc869 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:get-issues-id-comments-commentid:bcfbaf1adb | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:get-issues-id-comments:fd09b4b3e0 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:get-issues-id-cost-summary:0593bc8a8f | module:src-routes:b474eba4ee | server/src/routes/costs.ts |
| connected_to | api_endpoint:get-issues-id-delegation-reports:328c4f48ca | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:get-issues-id-documents-key-annotations-threadid:8bdbab1e4a | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:get-issues-id-documents-key-annotations:5a4fb5ff0a | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:get-issues-id-documents-key-revisions:b3625ae801 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:get-issues-id-documents-key:28d56ea5c3 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:get-issues-id-documents:3a9ec09bee | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:get-issues-id-feedback-traces:6067fb6497 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:get-issues-id-feedback-votes:64de234535 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:get-issues-id-heartbeat-context:7b3b447f00 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:get-issues-id-interactions:a2186ba971 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:get-issues-id-recovery-actions:c8cf660fb2 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:get-issues-id-recovery-run-evidence:3d22a9149d | module:src-routes:b474eba4ee | server/src/routes/activity.ts |
| connected_to | api_endpoint:get-issues-id-runs:99852dc332 | module:src-routes:b474eba4ee | server/src/routes/activity.ts |
| connected_to | api_endpoint:get-issues-id-tree-control-state:a918474983 | module:src-routes:b474eba4ee | server/src/routes/issue-tree-control.ts |
| connected_to | api_endpoint:get-issues-id-tree-holds-holdid:eb5b8cee5e | module:src-routes:b474eba4ee | server/src/routes/issue-tree-control.ts |
| connected_to | api_endpoint:get-issues-id-tree-holds:029658b474 | module:src-routes:b474eba4ee | server/src/routes/issue-tree-control.ts |
| connected_to | api_endpoint:get-issues-id-work-products:04df07996a | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:get-issues-id-work-proposals:3a8ca0a9c8 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:get-issues-id:6e711795d8 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:get-issues-issueid-active-run:a891bbec94 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:get-issues-issueid-file-resources-content:f3d13abf65 | module:src-routes:b474eba4ee | server/src/routes/file-resources.ts |
| connected_to | api_endpoint:get-issues-issueid-file-resources-list:2166c68a83 | module:src-routes:b474eba4ee | server/src/routes/file-resources.ts |
| connected_to | api_endpoint:get-issues-issueid-file-resources-resolve:553be5442e | module:src-routes:b474eba4ee | server/src/routes/file-resources.ts |
| connected_to | api_endpoint:get-issues-issueid-live-runs:33b259691b | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:get-issues:35e084a6d4 | module:src-routes:b474eba4ee | server/src/routes/companies.ts |
| connected_to | api_endpoint:get-issues:65cf881d3e | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:get-llms-agent-configuration-adaptertype-txt:c343431471 | module:src-routes:b474eba4ee | server/src/routes/llms.ts |
| connected_to | api_endpoint:get-llms-agent-configuration-txt:c8e02eb2f5 | module:src-routes:b474eba4ee | server/src/routes/llms.ts |
| connected_to | api_endpoint:get-llms-agent-icons-txt:c8930f09e3 | module:src-routes:b474eba4ee | server/src/routes/llms.ts |
| connected_to | api_endpoint:get-openapi-json:b0791285d6 | module:src-routes:b474eba4ee | server/src/routes/openapi.ts |
| connected_to | api_endpoint:get-organizational-observations-id:4e449453a8 | module:src-routes:b474eba4ee | server/src/routes/organizational-observations.ts |
| connected_to | api_endpoint:get-organizational-records-id:438e14f639 | module:src-routes:b474eba4ee | server/src/routes/organizational-records.ts |
| connected_to | api_endpoint:get-plugins-examples:7b61af24e8 | module:src-routes:b474eba4ee | server/src/routes/plugins.ts |
| connected_to | api_endpoint:get-plugins-pluginid-bridge-stream-channel:1050cc9cd0 | module:src-routes:b474eba4ee | server/src/routes/plugins.ts |
| connected_to | api_endpoint:get-plugins-pluginid-companies-companyid-local-folders-folderkey-status:12783004d3 | module:src-routes:b474eba4ee | server/src/routes/plugins.ts |
| connected_to | api_endpoint:get-plugins-pluginid-companies-companyid-local-folders:53d40f82c4 | module:src-routes:b474eba4ee | server/src/routes/plugins.ts |
| connected_to | api_endpoint:get-plugins-pluginid-config:024a19d936 | module:src-routes:b474eba4ee | server/src/routes/plugins.ts |
| connected_to | api_endpoint:get-plugins-pluginid-dashboard:f2d3c46c6d | module:src-routes:b474eba4ee | server/src/routes/plugins.ts |
| connected_to | api_endpoint:get-plugins-pluginid-health:41266bbdd7 | module:src-routes:b474eba4ee | server/src/routes/plugins.ts |
| connected_to | api_endpoint:get-plugins-pluginid-jobs-jobid-runs:89ba437a88 | module:src-routes:b474eba4ee | server/src/routes/plugins.ts |
| connected_to | api_endpoint:get-plugins-pluginid-jobs:14403f836d | module:src-routes:b474eba4ee | server/src/routes/plugins.ts |
| connected_to | api_endpoint:get-plugins-pluginid-logs:fefd3f0ff2 | module:src-routes:b474eba4ee | server/src/routes/plugins.ts |
| connected_to | api_endpoint:get-plugins-pluginid-ui-filepath:7b7bc13a3f | module:src-routes:b474eba4ee | server/src/routes/plugin-ui-static.ts |
| connected_to | api_endpoint:get-plugins-pluginid:315e6c2e8e | module:src-routes:b474eba4ee | server/src/routes/plugins.ts |
| connected_to | api_endpoint:get-plugins-tools:82cb9eb056 | module:src-routes:b474eba4ee | server/src/routes/plugins.ts |
| connected_to | api_endpoint:get-plugins-ui-contributions:bf78a616af | module:src-routes:b474eba4ee | server/src/routes/plugins.ts |
| connected_to | api_endpoint:get-plugins:58a6d6e45a | module:src-routes:b474eba4ee | server/src/routes/plugins.ts |
| connected_to | api_endpoint:get-profile:13548266f1 | module:src-routes:b474eba4ee | server/src/routes/auth.ts |
| connected_to | api_endpoint:get-projects-id-workspaces:75f617b4bc | module:src-routes:b474eba4ee | server/src/routes/projects.ts |
| connected_to | api_endpoint:get-projects-id:c7e2f47640 | module:src-routes:b474eba4ee | server/src/routes/projects.ts |
| connected_to | api_endpoint:get-routines-id-revisions:ad30cab667 | module:src-routes:b474eba4ee | server/src/routes/routines.ts |
| connected_to | api_endpoint:get-routines-id-runs:84677e8459 | module:src-routes:b474eba4ee | server/src/routes/routines.ts |
| connected_to | api_endpoint:get-routines-id:bd9f4a9a49 | module:src-routes:b474eba4ee | server/src/routes/routines.ts |
| connected_to | api_endpoint:get-secret-provider-configs-id:f4da205f0b | module:src-routes:b474eba4ee | server/src/routes/secrets.ts |
| connected_to | api_endpoint:get-secrets-id-access-events:9e4fe2fc50 | module:src-routes:b474eba4ee | server/src/routes/secrets.ts |
| connected_to | api_endpoint:get-secrets-id-usage:1ea7133e6d | module:src-routes:b474eba4ee | server/src/routes/secrets.ts |
| connected_to | api_endpoint:get-sidebar-preferences-me:448fe52e72 | module:src-routes:b474eba4ee | server/src/routes/sidebar-preferences.ts |
| connected_to | api_endpoint:get-skills-available:22c9c8ab43 | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:get-skills-catalog-catalogid-files:aae3e8d848 | module:src-routes:b474eba4ee | server/src/routes/company-skills.ts |
| connected_to | api_endpoint:get-skills-catalog-catalogid:275ccb0fad | module:src-routes:b474eba4ee | server/src/routes/company-skills.ts |
| connected_to | api_endpoint:get-skills-catalog:08dc76d7c2 | module:src-routes:b474eba4ee | server/src/routes/company-skills.ts |
| connected_to | api_endpoint:get-skills-index:3a397e2a57 | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:get-skills-skillname:ae576a04b5 | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:get-stats:0796a498cf | module:src-routes:b474eba4ee | server/src/routes/companies.ts |
| connected_to | api_endpoint:get-supervision-findings-id:c9b67ec6d6 | module:src-routes:b474eba4ee | server/src/routes/supervision.ts |
| connected_to | api_endpoint:get-teams-catalog-catalogid-files:fcb08e7ed0 | module:src-routes:b474eba4ee | server/src/routes/teams-catalog.ts |
| connected_to | api_endpoint:get-teams-catalog-catalogid:19cb4e2e51 | module:src-routes:b474eba4ee | server/src/routes/teams-catalog.ts |
| connected_to | api_endpoint:get-teams-catalog:f7b7634db7 | module:src-routes:b474eba4ee | server/src/routes/teams-catalog.ts |
| connected_to | api_endpoint:get-workspace-operations-operationid-log:ee0dc83a19 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:get:8bfb6330f8 | module:src-routes:b474eba4ee | server/src/routes/health.ts |
| connected_to | api_endpoint:get:8eccc9c964 | module:src-routes:b474eba4ee | server/src/routes/companies.ts |
| connected_to | api_endpoint:patch-adapters-type-override:c14c9ac392 | module:src-routes:b474eba4ee | server/src/routes/adapters.ts |
| connected_to | api_endpoint:patch-adapters-type:41c5b8dd7f | module:src-routes:b474eba4ee | server/src/routes/adapters.ts |
| connected_to | api_endpoint:patch-agents-agentid-budgets:b984034495 | module:src-routes:b474eba4ee | server/src/routes/costs.ts |
| connected_to | api_endpoint:patch-agents-id-instructions-bundle:91c9921d29 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:patch-agents-id-instructions-path:6a9884631e | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:patch-agents-id-permissions:898943b4bc | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:patch-agents-id:94857b88e1 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:patch-companies-companyid-autonomy-envelope-capacity:5cfb6d78a2 | module:src-routes:b474eba4ee | server/src/routes/supervision.ts |
| connected_to | api_endpoint:patch-companies-companyid-autonomy-envelope-stage:8123be8ad5 | module:src-routes:b474eba4ee | server/src/routes/supervision.ts |
| connected_to | api_endpoint:patch-companies-companyid-budgets:505a046daf | module:src-routes:b474eba4ee | server/src/routes/costs.ts |
| connected_to | api_endpoint:patch-companies-companyid-members-memberid-permissions:c6f459b1e3 | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:patch-companies-companyid-members-memberid-role-and-grants:c4579dea85 | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:patch-companies-companyid-members-memberid:30da414d0a | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:patch-companies-companyid-skills-skillid-files:58f148d5ff | module:src-routes:b474eba4ee | server/src/routes/company-skills.ts |
| connected_to | api_endpoint:patch-companyid-branding:63e7d834a0 | module:src-routes:b474eba4ee | server/src/routes/companies.ts |
| connected_to | api_endpoint:patch-companyid:4f2eaf7359 | module:src-routes:b474eba4ee | server/src/routes/companies.ts |
| connected_to | api_endpoint:patch-deliveries-id-status:219ae2f286 | module:src-routes:b474eba4ee | server/src/routes/deliveries.ts |
| connected_to | api_endpoint:patch-environments-id:7fdc1ee34d | module:src-routes:b474eba4ee | server/src/routes/environments.ts |
| connected_to | api_endpoint:patch-execution-workspaces-id:414e9e82c4 | module:src-routes:b474eba4ee | server/src/routes/execution-workspaces.ts |
| connected_to | api_endpoint:patch-goals-id:326c8d903a | module:src-routes:b474eba4ee | server/src/routes/goals.ts |
| connected_to | api_endpoint:patch-instance-settings-experimental:1f2adfc25e | module:src-routes:b474eba4ee | server/src/routes/instance-settings.ts |
| connected_to | api_endpoint:patch-instance-settings-general:767e968738 | module:src-routes:b474eba4ee | server/src/routes/instance-settings.ts |
| connected_to | api_endpoint:patch-issues-id-documents-key-annotations-threadid:64a0db4924 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:patch-issues-id:f1783bb077 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:patch-organizational-observations-id:94b357e6e3 | module:src-routes:b474eba4ee | server/src/routes/organizational-observations.ts |
| connected_to | api_endpoint:patch-organizational-records-id:9d6e99cf2e | module:src-routes:b474eba4ee | server/src/routes/organizational-records.ts |
| connected_to | api_endpoint:patch-profile:b979c11b08 | module:src-routes:b474eba4ee | server/src/routes/auth.ts |
| connected_to | api_endpoint:patch-projects-id-workspaces-workspaceid:d177a71fea | module:src-routes:b474eba4ee | server/src/routes/projects.ts |
| connected_to | api_endpoint:patch-projects-id:4efe287486 | module:src-routes:b474eba4ee | server/src/routes/projects.ts |
| connected_to | api_endpoint:patch-routine-triggers-id:ee6cc7bfb3 | module:src-routes:b474eba4ee | server/src/routes/routines.ts |
| connected_to | api_endpoint:patch-routines-id:be6dea0f77 | module:src-routes:b474eba4ee | server/src/routes/routines.ts |
| connected_to | api_endpoint:patch-secret-provider-configs-id:fa79ea1b34 | module:src-routes:b474eba4ee | server/src/routes/secrets.ts |
| connected_to | api_endpoint:patch-secrets-id:0e6dc8f855 | module:src-routes:b474eba4ee | server/src/routes/secrets.ts |
| connected_to | api_endpoint:patch-supervision-safeguards-id:1debfb97d0 | module:src-routes:b474eba4ee | server/src/routes/supervision.ts |
| connected_to | api_endpoint:patch-work-products-id:2f3dccec71 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:post-adapters-install:950e22d07a | module:src-routes:b474eba4ee | server/src/routes/adapters.ts |
| connected_to | api_endpoint:post-adapters-type-reinstall:8642263b64 | module:src-routes:b474eba4ee | server/src/routes/adapters.ts |
| connected_to | api_endpoint:post-adapters-type-reload:2228ac8fa5 | module:src-routes:b474eba4ee | server/src/routes/adapters.ts |
| connected_to | api_endpoint:post-admin-users-userid-demote-instance-admin:3a7867c655 | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:post-admin-users-userid-promote-instance-admin:9efb5ddd30 | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:post-agents-id-approve:0cd86fce15 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:post-agents-id-claude-login:8b13b9757d | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:post-agents-id-config-revisions-revisionid-rollback:a950707ad9 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:post-agents-id-heartbeat-invoke:a462051032 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:post-agents-id-keys:da479a1e90 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:post-agents-id-pause:f05fb62282 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:post-agents-id-resume:192eabd6c5 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:post-agents-id-runtime-state-reset-session:4f9efc9d6c | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:post-agents-id-skills-sync:e961fcf232 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:post-agents-id-terminate:bb72e95318 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:post-agents-id-wakeup:8df876e077 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:post-approvals-id-approve:e59f5d01d4 | module:src-routes:b474eba4ee | server/src/routes/approvals.ts |
| connected_to | api_endpoint:post-approvals-id-comments:574efa6f4b | module:src-routes:b474eba4ee | server/src/routes/approvals.ts |
| connected_to | api_endpoint:post-approvals-id-reject:a63c8944a0 | module:src-routes:b474eba4ee | server/src/routes/approvals.ts |
| connected_to | api_endpoint:post-approvals-id-request-revision:42bffdccb7 | module:src-routes:b474eba4ee | server/src/routes/approvals.ts |
| connected_to | api_endpoint:post-approvals-id-resubmit:b200b29c54 | module:src-routes:b474eba4ee | server/src/routes/approvals.ts |
| connected_to | api_endpoint:post-autonomy-decisions-id-canary-authorizations:09a318e96c | module:src-routes:b474eba4ee | server/src/routes/supervision.ts |
| connected_to | api_endpoint:post-autonomy-decisions-id-dispatch:2b16f422e9 | module:src-routes:b474eba4ee | server/src/routes/supervision.ts |
| connected_to | api_endpoint:post-autonomy-decisions-id-evaluations:180ebc3e80 | module:src-routes:b474eba4ee | server/src/routes/supervision.ts |
| connected_to | api_endpoint:post-board-claim-token-claim:25b57a422f | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:post-bootstrap-claim:8055e4b75b | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:post-cli-auth-challenges-id-approve:1d43631fc5 | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:post-cli-auth-challenges-id-cancel:f3da6a28a7 | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:post-cli-auth-challenges:2e850d8ddd | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:post-cli-auth-revoke-current:c773ad068f | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:post-cloud-upstreams-connect-finish:e3e149a9e2 | module:src-routes:b474eba4ee | server/src/routes/cloud-upstreams.ts |
| connected_to | api_endpoint:post-cloud-upstreams-connect-start:345a38d521 | module:src-routes:b474eba4ee | server/src/routes/cloud-upstreams.ts |
| connected_to | api_endpoint:post-cloud-upstreams-connectionid-push-runs-preview:a4e3a58a0b | module:src-routes:b474eba4ee | server/src/routes/cloud-upstreams.ts |
| connected_to | api_endpoint:post-cloud-upstreams-connectionid-push-runs-runid-activation:bb09f87962 | module:src-routes:b474eba4ee | server/src/routes/cloud-upstreams.ts |
| connected_to | api_endpoint:post-cloud-upstreams-connectionid-push-runs-runid-cancel:77b67319c1 | module:src-routes:b474eba4ee | server/src/routes/cloud-upstreams.ts |
| connected_to | api_endpoint:post-cloud-upstreams-connectionid-push-runs:70a106dae3 | module:src-routes:b474eba4ee | server/src/routes/cloud-upstreams.ts |
| connected_to | api_endpoint:post-companies-companyid-activity:553426d5a8 | module:src-routes:b474eba4ee | server/src/routes/activity.ts |
| connected_to | api_endpoint:post-companies-companyid-adapters-type-test-environment:aab9a34e43 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:post-companies-companyid-admission-controls-transition:dd94cee5f3 | module:src-routes:b474eba4ee | server/src/routes/admission-control.ts |
| connected_to | api_endpoint:post-companies-companyid-agent-hires:cea9f95e37 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:post-companies-companyid-agents:2957bd6d18 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:post-companies-companyid-approvals:c2dfa7d6a7 | module:src-routes:b474eba4ee | server/src/routes/approvals.ts |
| connected_to | api_endpoint:post-companies-companyid-assets-images:f2f2e79bf4 | module:src-routes:b474eba4ee | server/src/routes/assets.ts |
| connected_to | api_endpoint:post-companies-companyid-autonomy-intents-issueid:6435d8c571 | module:src-routes:b474eba4ee | server/src/routes/supervision.ts |
| connected_to | api_endpoint:post-companies-companyid-autonomy-interrupts:53e9ab8066 | module:src-routes:b474eba4ee | server/src/routes/supervision.ts |
| connected_to | api_endpoint:post-companies-companyid-autonomy-learned-policies:737a50a518 | module:src-routes:b474eba4ee | server/src/routes/supervision.ts |
| connected_to | api_endpoint:post-companies-companyid-budget-incidents-incidentid-resolve:69ac426dd0 | module:src-routes:b474eba4ee | server/src/routes/costs.ts |
| connected_to | api_endpoint:post-companies-companyid-budgets-policies:1a5497206f | module:src-routes:b474eba4ee | server/src/routes/costs.ts |
| connected_to | api_endpoint:post-companies-companyid-cost-events:0b7985783b | module:src-routes:b474eba4ee | server/src/routes/costs.ts |
| connected_to | api_endpoint:post-companies-companyid-decisions-interaction-sourceid-prepare:db3769e283 | module:src-routes:b474eba4ee | server/src/routes/decision-center.ts |
| connected_to | api_endpoint:post-companies-companyid-decisions-interaction-sourceid-reroute:7f2d7f6fb0 | module:src-routes:b474eba4ee | server/src/routes/decision-center.ts |
| connected_to | api_endpoint:post-companies-companyid-deliveries:295187fbac | module:src-routes:b474eba4ee | server/src/routes/deliveries.ts |
| connected_to | api_endpoint:post-companies-companyid-environments-probe-config:79f7ee336e | module:src-routes:b474eba4ee | server/src/routes/environments.ts |
| connected_to | api_endpoint:post-companies-companyid-environments:641573a90a | module:src-routes:b474eba4ee | server/src/routes/environments.ts |
| connected_to | api_endpoint:post-companies-companyid-execution-workspaces-maintenance:5ac6c113e2 | module:src-routes:b474eba4ee | server/src/routes/execution-workspaces.ts |
| connected_to | api_endpoint:post-companies-companyid-finance-events:b2a9880193 | module:src-routes:b474eba4ee | server/src/routes/costs.ts |
| connected_to | api_endpoint:post-companies-companyid-goals:e9fd068118 | module:src-routes:b474eba4ee | server/src/routes/goals.ts |
| connected_to | api_endpoint:post-companies-companyid-inbox-dismissals:3dcb9a9d1c | module:src-routes:b474eba4ee | server/src/routes/inbox-dismissals.ts |
| connected_to | api_endpoint:post-companies-companyid-invites:f3ce94e1a0 | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:post-companies-companyid-issues-issueid-attachments:b822ad6d73 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:post-companies-companyid-issues:7e9c829338 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:post-companies-companyid-join-requests-requestid-approve:699471a98d | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:post-companies-companyid-join-requests-requestid-reject:0f793bb2f6 | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:post-companies-companyid-labels:7ed3dff442 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:post-companies-companyid-logo:99357095f8 | module:src-routes:b474eba4ee | server/src/routes/assets.ts |
| connected_to | api_endpoint:post-companies-companyid-members-memberid-archive:0c0c5b3bf5 | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:post-companies-companyid-openclaw-invite-prompt:9fa78ee08b | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:post-companies-companyid-organizational-observations:3ba5962214 | module:src-routes:b474eba4ee | server/src/routes/organizational-observations.ts |
| connected_to | api_endpoint:post-companies-companyid-organizational-records:4060dac119 | module:src-routes:b474eba4ee | server/src/routes/organizational-records.ts |
| connected_to | api_endpoint:post-companies-companyid-projects:63080338c4 | module:src-routes:b474eba4ee | server/src/routes/projects.ts |
| connected_to | api_endpoint:post-companies-companyid-routines:07b5ecc760 | module:src-routes:b474eba4ee | server/src/routes/routines.ts |
| connected_to | api_endpoint:post-companies-companyid-secret-provider-configs-discovery-preview:c17050567e | module:src-routes:b474eba4ee | server/src/routes/secrets.ts |
| connected_to | api_endpoint:post-companies-companyid-secret-provider-configs:ce10b3128d | module:src-routes:b474eba4ee | server/src/routes/secrets.ts |
| connected_to | api_endpoint:post-companies-companyid-secrets-remote-import-preview:97833da121 | module:src-routes:b474eba4ee | server/src/routes/secrets.ts |
| connected_to | api_endpoint:post-companies-companyid-secrets-remote-import:eb24dce127 | module:src-routes:b474eba4ee | server/src/routes/secrets.ts |
| connected_to | api_endpoint:post-companies-companyid-secrets:099995f195 | module:src-routes:b474eba4ee | server/src/routes/secrets.ts |
| connected_to | api_endpoint:post-companies-companyid-skills-import:efdbce96b6 | module:src-routes:b474eba4ee | server/src/routes/company-skills.ts |
| connected_to | api_endpoint:post-companies-companyid-skills-install-catalog:b3f897bcd0 | module:src-routes:b474eba4ee | server/src/routes/company-skills.ts |
| connected_to | api_endpoint:post-companies-companyid-skills-scan-projects:358b598911 | module:src-routes:b474eba4ee | server/src/routes/company-skills.ts |
| connected_to | api_endpoint:post-companies-companyid-skills-skillid-audit:6708632596 | module:src-routes:b474eba4ee | server/src/routes/company-skills.ts |
| connected_to | api_endpoint:post-companies-companyid-skills-skillid-install-update:b248091857 | module:src-routes:b474eba4ee | server/src/routes/company-skills.ts |
| connected_to | api_endpoint:post-companies-companyid-skills-skillid-reset:e5ace138d7 | module:src-routes:b474eba4ee | server/src/routes/company-skills.ts |
| connected_to | api_endpoint:post-companies-companyid-skills:f08e80bc2d | module:src-routes:b474eba4ee | server/src/routes/company-skills.ts |
| connected_to | api_endpoint:post-companies-companyid-softwarehouse-project-truth-probe:2590b31e4a | module:src-routes:b474eba4ee | server/src/routes/softwarehouse.ts |
| connected_to | api_endpoint:post-companies-companyid-supervision-archive:ca5c8c7a57 | module:src-routes:b474eba4ee | server/src/routes/supervision.ts |
| connected_to | api_endpoint:post-companies-companyid-supervision-cycles:c67256fc1e | module:src-routes:b474eba4ee | server/src/routes/supervision.ts |
| connected_to | api_endpoint:post-companies-companyid-supervision-findings:50af1629da | module:src-routes:b474eba4ee | server/src/routes/supervision.ts |
| connected_to | api_endpoint:post-companies-companyid-supervision-interventions:2fbc2a169e | module:src-routes:b474eba4ee | server/src/routes/supervision.ts |
| connected_to | api_endpoint:post-companies-companyid-supervision-observation-windows:0fffc031c0 | module:src-routes:b474eba4ee | server/src/routes/supervision.ts |
| connected_to | api_endpoint:post-companies-companyid-supervision-recover:a00258c0ba | module:src-routes:b474eba4ee | server/src/routes/supervision.ts |
| connected_to | api_endpoint:post-companies-companyid-supervision-root-causes:f226ac8db2 | module:src-routes:b474eba4ee | server/src/routes/supervision.ts |
| connected_to | api_endpoint:post-companies-companyid-supervision-safeguards:a4b692f0f4 | module:src-routes:b474eba4ee | server/src/routes/supervision.ts |
| connected_to | api_endpoint:post-companies-companyid-supervision-shadow-comparisons:7dc6082d28 | module:src-routes:b474eba4ee | server/src/routes/supervision.ts |
| connected_to | api_endpoint:post-companies-companyid-supervision-stalled-ready-dispatch:d4651d35ce | module:src-routes:b474eba4ee | server/src/routes/supervision.ts |
| connected_to | api_endpoint:post-companies-companyid-teams-catalog-catalogid-install:370d0ca00c | module:src-routes:b474eba4ee | server/src/routes/teams-catalog.ts |
| connected_to | api_endpoint:post-companies-companyid-teams-catalog-catalogid-preview:6f7efc9cd7 | module:src-routes:b474eba4ee | server/src/routes/teams-catalog.ts |
| connected_to | api_endpoint:post-companyid-archive:e24dd1b757 | module:src-routes:b474eba4ee | server/src/routes/companies.ts |
| connected_to | api_endpoint:post-companyid-export:b95d732d6a | module:src-routes:b474eba4ee | server/src/routes/companies.ts |
| connected_to | api_endpoint:post-companyid-exports-preview:f5706e9e1e | module:src-routes:b474eba4ee | server/src/routes/companies.ts |
| connected_to | api_endpoint:post-companyid-exports:de19679713 | module:src-routes:b474eba4ee | server/src/routes/companies.ts |
| connected_to | api_endpoint:post-companyid-imports-apply:e32f3b7b86 | module:src-routes:b474eba4ee | server/src/routes/companies.ts |
| connected_to | api_endpoint:post-companyid-imports-preview:bf845be5d5 | module:src-routes:b474eba4ee | server/src/routes/companies.ts |
| connected_to | api_endpoint:post-deliveries-id-dispatch:a25c2fc3a8 | module:src-routes:b474eba4ee | server/src/routes/deliveries.ts |
| connected_to | api_endpoint:post-deliveries-id-outcome:a9e6d8c6e6 | module:src-routes:b474eba4ee | server/src/routes/deliveries.ts |
| connected_to | api_endpoint:post-deliveries-id-transition:d97a50341f | module:src-routes:b474eba4ee | server/src/routes/deliveries.ts |
| connected_to | api_endpoint:post-dev-server-restart:8ce723f667 | module:src-routes:b474eba4ee | server/src/routes/health.ts |
| connected_to | api_endpoint:post-environments-id-probe:a240da1ea8 | module:src-routes:b474eba4ee | server/src/routes/environments.ts |
| connected_to | api_endpoint:post-execution-workspaces-id-runtime-commands-action:29e6f890b7 | module:src-routes:b474eba4ee | server/src/routes/execution-workspaces.ts |
| connected_to | api_endpoint:post-execution-workspaces-id-runtime-services-action:da155089d0 | module:src-routes:b474eba4ee | server/src/routes/execution-workspaces.ts |
| connected_to | api_endpoint:post-heartbeat-runs-runid-cancel:f7e5dea4ec | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:post-heartbeat-runs-runid-watchdog-decisions:21702beb45 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:post-import-preview:48f6c52046 | module:src-routes:b474eba4ee | server/src/routes/companies.ts |
| connected_to | api_endpoint:post-instance-database-backups:e8b3c6e8ff | module:src-routes:b474eba4ee | server/src/routes/instance-database-backups.ts |
| connected_to | api_endpoint:post-instance-settings-experimental-issue-graph-liveness-auto-recovery-preview:da592c7ed6 | module:src-routes:b474eba4ee | server/src/routes/instance-settings.ts |
| connected_to | api_endpoint:post-instance-settings-experimental-issue-graph-liveness-auto-recovery-run:964bdd2094 | module:src-routes:b474eba4ee | server/src/routes/instance-settings.ts |
| connected_to | api_endpoint:post-invites-inviteid-revoke:15c81b70e1 | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:post-invites-token-accept:2ef1438eb8 | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:post-issues-id-accepted-plan-decompositions:91e9e43603 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:post-issues-id-admin-force-release:af6e61c341 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:post-issues-id-approvals:667129c0e0 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:post-issues-id-assignment-proposals:a8bd95bbbc | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:post-issues-id-checkout:cbb5f7ff93 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:post-issues-id-children:df8794e00c | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:post-issues-id-comments:306ccfa063 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:post-issues-id-delegation-reports:cd08700f87 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:post-issues-id-documents-key-annotations-threadid-comments:56749718af | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:post-issues-id-documents-key-annotations:f79c211677 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:post-issues-id-documents-key-lock:f2b6274f8c | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:post-issues-id-documents-key-revisions-revisionid-restore:ecea6866b3 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:post-issues-id-documents-key-unlock:4866279070 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:post-issues-id-feedback-votes:ccc1eae91c | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:post-issues-id-inbox-archive:887937ccfe | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:post-issues-id-interactions-interactionid-accept:c30e4089e3 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:post-issues-id-interactions-interactionid-cancel:2054319696 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:post-issues-id-interactions-interactionid-reject:6ebd1d9a33 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:post-issues-id-interactions-interactionid-respond:a5c557b330 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:post-issues-id-interactions:09ea2803ab | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:post-issues-id-low-trust-promotions:9445fb3235 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:post-issues-id-monitor-check-now:cf19b6e4a2 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:post-issues-id-read:2681fa3978 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:post-issues-id-recovery-actions-resolve:c3c71dc162 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:post-issues-id-release:afaf73a0f4 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:post-issues-id-scheduled-retry-retry-now:3aa51e4d48 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:post-issues-id-tree-control-preview:01977dd182 | module:src-routes:b474eba4ee | server/src/routes/issue-tree-control.ts |
| connected_to | api_endpoint:post-issues-id-tree-holds-holdid-release:d8154836be | module:src-routes:b474eba4ee | server/src/routes/issue-tree-control.ts |
| connected_to | api_endpoint:post-issues-id-tree-holds:3ee6e39036 | module:src-routes:b474eba4ee | server/src/routes/issue-tree-control.ts |
| connected_to | api_endpoint:post-issues-id-work-products:8a20d0f0ac | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:post-issues-id-work-proposals-proposalid-status:24057e0f69 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:post-issues-id-work-proposals:e7f67c2f24 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:post-join-requests-requestid-claim-api-key:fafe951864 | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:post-organizational-observations-id-evaluate-promotion:59c91bd915 | module:src-routes:b474eba4ee | server/src/routes/organizational-observations.ts |
| connected_to | api_endpoint:post-plugins-install:bbf957645b | module:src-routes:b474eba4ee | server/src/routes/plugins.ts |
| connected_to | api_endpoint:post-plugins-pluginid-actions-key:6819263b47 | module:src-routes:b474eba4ee | server/src/routes/plugins.ts |
| connected_to | api_endpoint:post-plugins-pluginid-bridge-action:652bf5a2c1 | module:src-routes:b474eba4ee | server/src/routes/plugins.ts |
| connected_to | api_endpoint:post-plugins-pluginid-bridge-data:b1a26cfb8e | module:src-routes:b474eba4ee | server/src/routes/plugins.ts |
| connected_to | api_endpoint:post-plugins-pluginid-companies-companyid-local-folders-folderkey-validate:dbf2b8243d | module:src-routes:b474eba4ee | server/src/routes/plugins.ts |
| connected_to | api_endpoint:post-plugins-pluginid-config-test:baae3579f7 | module:src-routes:b474eba4ee | server/src/routes/plugins.ts |
| connected_to | api_endpoint:post-plugins-pluginid-config:099c2d7e3c | module:src-routes:b474eba4ee | server/src/routes/plugins.ts |
| connected_to | api_endpoint:post-plugins-pluginid-data-key:ea76c98a4e | module:src-routes:b474eba4ee | server/src/routes/plugins.ts |
| connected_to | api_endpoint:post-plugins-pluginid-disable:9713e38984 | module:src-routes:b474eba4ee | server/src/routes/plugins.ts |
| connected_to | api_endpoint:post-plugins-pluginid-enable:ff322e6aa5 | module:src-routes:b474eba4ee | server/src/routes/plugins.ts |
| connected_to | api_endpoint:post-plugins-pluginid-jobs-jobid-trigger:fe8bb4d4cf | module:src-routes:b474eba4ee | server/src/routes/plugins.ts |
| connected_to | api_endpoint:post-plugins-pluginid-upgrade:4279aad005 | module:src-routes:b474eba4ee | server/src/routes/plugins.ts |
| connected_to | api_endpoint:post-plugins-pluginid-webhooks-endpointkey:2b16da3caf | module:src-routes:b474eba4ee | server/src/routes/plugins.ts |
| connected_to | api_endpoint:post-plugins-tools-execute:7c48faaee4 | module:src-routes:b474eba4ee | server/src/routes/plugins.ts |
| connected_to | api_endpoint:post-projects-id-workspaces-workspaceid-runtime-commands-action:1b74dd11d4 | module:src-routes:b474eba4ee | server/src/routes/projects.ts |
| connected_to | api_endpoint:post-projects-id-workspaces-workspaceid-runtime-services-action:50c0dc3a92 | module:src-routes:b474eba4ee | server/src/routes/projects.ts |
| connected_to | api_endpoint:post-projects-id-workspaces:41b9d8a2b2 | module:src-routes:b474eba4ee | server/src/routes/projects.ts |
| connected_to | api_endpoint:post-routine-triggers-id-rotate-secret:410add5c0a | module:src-routes:b474eba4ee | server/src/routes/routines.ts |
| connected_to | api_endpoint:post-routine-triggers-public-publicid-fire:585f90d9b5 | module:src-routes:b474eba4ee | server/src/routes/routines.ts |
| connected_to | api_endpoint:post-routines-id-revisions-revisionid-restore:7cef8bcfe6 | module:src-routes:b474eba4ee | server/src/routes/routines.ts |
| connected_to | api_endpoint:post-routines-id-run:1debdfbbb0 | module:src-routes:b474eba4ee | server/src/routes/routines.ts |
| connected_to | api_endpoint:post-routines-id-triggers:1b65198269 | module:src-routes:b474eba4ee | server/src/routes/routines.ts |
| connected_to | api_endpoint:post-secret-provider-configs-id-default:ecf96dee3b | module:src-routes:b474eba4ee | server/src/routes/secrets.ts |
| connected_to | api_endpoint:post-secret-provider-configs-id-health:f4767601be | module:src-routes:b474eba4ee | server/src/routes/secrets.ts |
| connected_to | api_endpoint:post-secrets-id-rotate:dc7807332f | module:src-routes:b474eba4ee | server/src/routes/secrets.ts |
| connected_to | api_endpoint:post-supervision-cycles-id-finish:1bf351a1e4 | module:src-routes:b474eba4ee | server/src/routes/supervision.ts |
| connected_to | api_endpoint:post-supervision-findings-id-root-cause:b363953c04 | module:src-routes:b474eba4ee | server/src/routes/supervision.ts |
| connected_to | api_endpoint:post-supervision-observation-windows-id-complete:bd424cc97a | module:src-routes:b474eba4ee | server/src/routes/supervision.ts |
| connected_to | api_endpoint:post-supervision-root-causes-id-close:2129e65342 | module:src-routes:b474eba4ee | server/src/routes/supervision.ts |
| connected_to | api_endpoint:post:2b152fcb8e | module:src-routes:b474eba4ee | server/src/routes/companies.ts |
| connected_to | api_endpoint:put-admin-users-userid-company-access:3bbce7d1a5 | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:put-agents-id-instructions-bundle-file:5c60f0be4d | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:put-companies-companyid-agent-availability:fc66261b70 | module:src-routes:b474eba4ee | server/src/routes/admission-control.ts |
| connected_to | api_endpoint:put-companies-companyid-decisions-sourcetype-sourceid-defer:2c6ea7af8c | module:src-routes:b474eba4ee | server/src/routes/decision-center.ts |
| connected_to | api_endpoint:put-companies-companyid-resource-memberships-me-agents-agentid:8fc99247fb | module:src-routes:b474eba4ee | server/src/routes/resource-memberships.ts |
| connected_to | api_endpoint:put-companies-companyid-resource-memberships-me-projects-projectid:13d2ab6115 | module:src-routes:b474eba4ee | server/src/routes/resource-memberships.ts |
| connected_to | api_endpoint:put-companies-companyid-sidebar-preferences-me:2d830ee2ea | module:src-routes:b474eba4ee | server/src/routes/sidebar-preferences.ts |
| connected_to | api_endpoint:put-issues-id-documents-key:90980b35cb | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:put-plugins-pluginid-companies-companyid-local-folders-folderkey:54790a597a | module:src-routes:b474eba4ee | server/src/routes/plugins.ts |
| connected_to | api_endpoint:put-sidebar-preferences-me:b63245a54a | module:src-routes:b474eba4ee | server/src/routes/sidebar-preferences.ts |
| connected_to | api_endpoint:use-api-auth:5aa7e1cef0 | module:src:38f6004eb2 | server/src/app.ts |
| connected_to | api_endpoint:use-api:b4836ba90f | module:src:38f6004eb2 | server/src/app.ts |
| connected_to | api_endpoint:use-assets:c2ba42d242 | module:src:38f6004eb2 | server/src/app.ts |
| connected_to | api_endpoint:use-plugins-pluginid-api:75182b5a52 | module:src-routes:b474eba4ee | server/src/routes/plugins.ts |
| documents | agent:agents:2a990c2a1b | module:packages-teams-catalog-catalog:c60d3dd99e | packages/teams-catalog/catalog/bundled/software-development/product-engineering/agents/cto/AGENTS.md |
| documents | agent:agents:35daf04255 | module:packages-teams-catalog-catalog:c60d3dd99e | packages/teams-catalog/catalog/bundled/company-defaults/core-exec-team/agents/qa/AGENTS.md |
| documents | agent:agents:4e1e52d165 | module:packages-teams-catalog-catalog:c60d3dd99e | packages/teams-catalog/catalog/bundled/product/product-design/agents/ux-designer/AGENTS.md |
| documents | agent:agents:a407e8f633 | module:packages-teams-catalog-catalog:c60d3dd99e | packages/teams-catalog/catalog/bundled/company-defaults/core-exec-team/agents/cto/AGENTS.md |
| documents | agent:agents:b19d1471f6 | module:packages-teams-catalog-catalog:c60d3dd99e | packages/teams-catalog/catalog/bundled/company-defaults/core-exec-team/agents/ceo/AGENTS.md |
| documents | agent:agents:b2810118d6 | module:packages-teams-catalog-catalog:c60d3dd99e | packages/teams-catalog/catalog/bundled/software-development/product-engineering/agents/qa/AGENTS.md |
| documents | agent:agents:b96874dde7 | module:packages-teams-catalog-catalog:c60d3dd99e | packages/teams-catalog/catalog/bundled/software-development/product-engineering/agents/senior-coder/AGENTS.md |
| documents | agent:agents:e399283d23 | module:packages-teams-catalog-catalog:c60d3dd99e | packages/teams-catalog/catalog/optional/content/content-machine/agents/content-lead/AGENTS.md |
| documents | agent:agents:e3d542a2ff | module:packages-teams-catalog-catalog:c60d3dd99e | packages/teams-catalog/catalog/optional/operations/agent-enablement/agents/ai-agent-development-partner/AGENTS.md |
| documents | agent:coder-agent-template:f64c59489d | module:skills:3e2f7cddae | skills/paperclip-create-agent/references/agents/coder.md |
| documents | agent:llm-wiki-maintainer:a18b9a3e5b | module:packages-plugins-plugin-llm-wiki:e31e3d114a | packages/plugins/plugin-llm-wiki/agents/wiki-maintainer/AGENTS.md |
| documents | agent:qa-agent-template:f91ba6ff0d | module:skills:3e2f7cddae | skills/paperclip-create-agent/references/agents/qa.md |
| documents | agent:securityengineer-agent-template:055079bdf9 | module:skills:3e2f7cddae | skills/paperclip-create-agent/references/agents/securityengineer.md |
| documents | agent:ux-designer-agent-template:a4a9e030dc | module:skills:3e2f7cddae | skills/paperclip-create-agent/references/agents/uxdesigner.md |
| documents | document:00-aia-ai-assistant:b4f2809125 | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/roles/ai-assistant.md |
| documents | document:01-cso-chief-strategy-officer:d0778ca0a9 | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/roles/chief-strategy-officer.md |
| documents | document:02-cpo-chief-product-officer:ad64511c75 | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/roles/chief-product-officer.md |
| documents | document:02-uid-ui-visual-designer:6c5db66ef6 | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/roles/ui-visual-designer.md |
| documents | document:02-uxw-ux-web-designer:1aaace3e44 | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/roles/ux-web-designer.md |
| documents | document:02-wpm-web-product-manager:434b3f828f | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/roles/web-product-manager.md |
| documents | document:03-cro-chief-revenue-officer:8dede3524a | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/roles/chief-revenue-officer.md |
| documents | document:04-coo-chief-operating-officer:5e97807304 | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/roles/chief-operating-officer.md |
| documents | document:04-dpm-delivery-project-manager:cbb8f7ebc6 | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/roles/delivery-project-manager.md |
| documents | document:04-dsm-documentation-steward:8f7a774998 | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/roles/documentation-steward.md |
| documents | document:05-cco-chief-customer-officer:78bc7a1fd2 | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/roles/chief-customer-officer.md |
| documents | document:05-csm-client-success-manager:77da01da5a | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/roles/client-success-manager.md |
| documents | document:06-aid-ai-agent-development-partner:8b4a4aeae7 | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/roles/ai-agent-development-partner.md |
| documents | document:06-aim-ai-agent-manager:13689fdee7 | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/roles/ai-agent-manager.md |
| documents | document:06-chro-chief-human-resources-officer:c33c49af87 | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/roles/chief-human-resources-officer.md |
| documents | document:06-pop-people-operations-partner:d3ff4aa566 | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/roles/people-operations-partner.md |
| documents | document:07-cfo-chief-financial-officer:a5f26a3f36 | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/roles/chief-financial-officer.md |
| documents | document:08-cao-chief-assets-officer:64f67cfba4 | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/roles/chief-assets-officer.md |
| documents | document:09-cbe-core-backend-engineer:d56e01486c | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/roles/core-backend-engineer.md |
| documents | document:09-crs-code-review-specialist:39f2865352 | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/roles/code-review-specialist.md |
| documents | document:09-cto-chief-technology-officer:3cfa43bd68 | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/roles/chief-technology-officer.md |
| documents | document:09-dbe-data-persistence-engineer:ebc6fda417 | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/roles/data-persistence-engineer.md |
| documents | document:09-dre-deployment-reliability-engineer:08f2094a8f | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/roles/deployment-reliability-engineer.md |
| documents | document:09-edl-engineering-delivery-lead:70fae271f3 | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/roles/engineering-delivery-lead.md |
| documents | document:09-few-frontend-web-engineer:a04a570f3a | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/roles/frontend-web-engineer.md |
| documents | document:09-ide-integration-domain-engineer:fcd498df42 | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/roles/integration-domain-engineer.md |
| documents | document:09-qve-qa-verification-engineer:abc2326ac0 | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/roles/qa-verification-engineer.md |
| documents | document:09-rte-runtime-adapter-engineer:fe3cbb8c77 | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/roles/runtime-adapter-engineer.md |
| documents | document:09-tae-test-automation-engineer:de9f632eab | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/roles/test-automation-engineer.md |
| documents | document:09-tsa-technical-solution-architect:03f4ac3bf9 | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/roles/technical-solution-architect.md |
| documents | document:10-clo-chief-legal-officer:10bb8d1090 | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/roles/chief-legal-officer.md |
| documents | document:10-spa-security-privacy-auditor:ae0413821b | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/roles/security-privacy-auditor.md |
| documents | document:11-apm-aviary-product-manager:922fb5b63f | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/roles/aviary-product-manager.md |
| documents | document:11-cino-chief-innovation-officer:2fa45adcf7 | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/roles/chief-innovation-officer.md |
| documents | document:11-fpm-featherly-platform-manager:b610879007 | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/roles/featherly-platform-manager.md |
| documents | document:11-innovations-director:3f7bf3e10d | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/roles-archive/legacy-2026-07-03/innovations-director.md |
| documents | document:11-ipm-innovation-portfolio-manager:09c6622a92 | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/roles/innovation-portfolio-manager.md |
| documents | document:11-npm-nest-product-manager:3afb33a581 | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/roles/nest-product-manager.md |
| documents | document:11-rpm-roost-project-manager:7b751a14e1 | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/roles/roost-product-manager.md |
| documents | document:11-spm-soar-product-manager:28a2e80f81 | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/roles/soar-product-manager.md |
| documents | document:12-ceo-chief-executive-officer:d16284691b | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/roles/chief-executive-officer.md |
| documents | document:2026-03-13-company-import-export-v2-plan:f41d3f9d0c | module:doc:97bf06278b | doc/plans/2026-03-13-company-import-export-v2.md |
| documents | document:2026-03-14-adapter-skill-sync-rollout:c2c9d8d034 | module:doc:97bf06278b | doc/plans/2026-03-14-adapter-skill-sync-rollout.md |
| documents | document:2026-03-14-skills-ui-product-plan:3d2fa899d4 | module:doc:97bf06278b | doc/plans/2026-03-14-skills-ui-product-plan.md |
| documents | document:2026-04-06-smart-model-routing:a93ab0543b | module:doc:97bf06278b | doc/plans/2026-04-06-smart-model-routing.md |
| documents | document:2026-04-06-sub-issue-creation-on-issue-detail-plan:677cd5affd | module:doc:97bf06278b | doc/plans/2026-04-06-subissue-creation-on-issue-detail.md |
| documents | document:2026-04-07-issue-detail-speed-and-optimistic-inventory:9ab40b10dc | module:doc:97bf06278b | doc/plans/2026-04-07-issue-detail-speed-and-optimistic-inventory.md |
| documents | document:2026-05-24-cli-api-parity-e2e-log:edfc381855 | module:doc:97bf06278b | doc/logs/2026-05-24-cli-api-parity-e2e-log.md |
| documents | document:2026-05-27-architecture-graph-and-traceability-audit-luc-265:4cae3cfbe2 | module:docs:fae674dcd3 | docs/status/2026-05-27-architecture-graph-traceability-audit.md |
| documents | document:2026-05-27-full-takeover-audit-and-operating-baseline-luc-259:70eb0af836 | module:docs:fae674dcd3 | docs/planning/2026-05-27-full-takeover-audit-and-operating-baseline.md |
| documents | document:2026-05-27-luc-236-auth-lock-recovery-md:9fc083e240 | module:docs:fae674dcd3 | docs/plans/2026-05-27-luc-236-auth-lock-recovery.md |
| documents | document:2026-05-27-luc-275-priority-test-links-backfill:bcf0388985 | module:docs:fae674dcd3 | docs/status/2026-05-27-luc-275-priority-test-links-backfill.md |
| documents | document:2026-05-27-luc-276-priority-documentation-links-backfill:cd4826c569 | module:docs:fae674dcd3 | docs/status/2026-05-27-luc-276-priority-documentation-links-backfill.md |
| documents | document:2026-05-27-luc-277-owner-attribution-rules:0ec5914b02 | module:docs:fae674dcd3 | docs/status/2026-05-27-luc-277-owner-attribution-rules.md |
| documents | document:2026-05-27-luc-279-windows-test-runner-spawn-fix:65ca809cfe | module:docs:fae674dcd3 | docs/status/2026-05-27-luc-279-windows-test-runner-spawn-fix.md |
| documents | document:2026-05-27-v1-acceptance-test-matrix-md:6e31e1a6b5 | module:docs:fae674dcd3 | docs/planning/2026-05-27-v1-acceptance-test-matrix.md |
| documents | document:2026-05-28-luc-501-docs-and-memory-loop:9f3582ee73 | module:docs:fae674dcd3 | docs/status/2026-05-28-luc-501-docs-memory-loop.md |
| documents | document:2026-05-31-luc-1076-docs-and-memory-loop:abed82e5cd | module:docs:fae674dcd3 | docs/status/2026-05-31-luc-1076-docs-memory-loop.md |
| documents | document:2026-05-31-luc-875-docs-and-memory-loop:b8f0c106c9 | module:docs:fae674dcd3 | docs/status/2026-05-31-luc-875-docs-memory-loop.md |
| documents | document:2026-06-01-luc-1264-gate-freshness-watcher-delivery-plan-md:3e50fed5f8 | module:doc:97bf06278b | doc/plans/2026-06-01-luc-1264-gate-freshness-watcher-delivery-plan.md |
| documents | document:2026-06-01-luc-1283-docs-and-memory-loop:7adcc9ea9f | module:docs:fae674dcd3 | docs/status/2026-06-01-luc-1283-docs-memory-loop.md |
| documents | document:2026-06-01-luc-1315-deterministic-db-route-test-path-md:828389cda0 | module:docs:fae674dcd3 | docs/status/2026-06-01-luc-1315-deterministic-db-route-test-path.md |
| documents | document:2026-06-11-luc-3331-docs-and-memory-loop:ad6c4a74c4 | module:docs:fae674dcd3 | docs/status/2026-06-11-luc-3331-docs-memory-loop.md |
| documents | document:2026-06-11-luc-3464-docs-and-memory-loop:650fd68f57 | module:docs:fae674dcd3 | docs/status/2026-06-11-luc-3464-docs-memory-loop.md |
| documents | document:2026-07-18-luc-1358-gate-freshness-md:59eb0e0287 | module:docs:fae674dcd3 | docs/status/2026-07-18-luc-1358-gate-freshness.md |
| documents | document:activity-log-md:258db19eea | module:docs:fae674dcd3 | docs/guides/board-operator/activity-log.md |
| documents | document:adapter-authoring-notes:1644eaeac6 | module:packages-adapters:6b0246ea92 | packages/adapters/AUTHORING.md |
| documents | document:adapter-plugin-md:ddeffe3e26 | module:item:4a28b5745a | adapter-plugin.md |
| documents | document:additional-capability-utilization-closeout:afd030a03b | module:docs:fae674dcd3 | docs/status/2026-08-10-extension-utilization-closeout.md |
| documents | document:adr-000-decision-title:ccdb363dda | module:docs:fae674dcd3 | docs/decisions/ADR-000-template.md |
| documents | document:adr-0000-title:46c986aa94 | module:docs:fae674dcd3 | docs/softwarehouse/templates/adr-template.md |
| documents | document:adr-0001-map-the-autonomous-softwarehouse-model-to-existing-paperclip-primitives:20441f29f8 | module:docs:fae674dcd3 | docs/decisions/ADR-0001.md |
| documents | document:agent-artifact-upload-workflow:c572271647 | module:doc:97bf06278b | doc/AGENT-ARTIFACTS.md |
| documents | document:agent-authentication-onboarding:4290f811aa | module:doc:97bf06278b | doc/plans/2026-02-18-agent-authentication.md |
| documents | document:agent-authentication-p0-local-adapter-jwt-implementation:fe4f0340a6 | module:doc:97bf06278b | doc/plans/2026-02-18-agent-authentication-implementation.md |
| documents | document:agent-browser:edfc6f9155 | module:packages-skills-catalog-catalog:e86044ba4c | packages/skills-catalog/catalog/optional/browser/agent-browser/SKILL.md |
| documents | document:agent-chat-ui-and-issue-backed-conversations:260af50b8f | module:doc:97bf06278b | doc/plans/2026-03-11-agent-chat-ui-and-issue-backed-conversations.md |
| documents | document:agent-companies-spec-inventory:06cd8a2f4a | module:doc:97bf06278b | doc/AGENTCOMPANIES_SPEC_INVENTORY.md |
| documents | document:agent-companies-specification:99f982f1c9 | module:docs:fae674dcd3 | docs/companies/companies-spec.md |
| documents | document:agent-configuration-activity-ui:477fa2bc04 | module:docs:fae674dcd3 | docs/specs/agent-config-ui.md |
| documents | document:agent-development-review:ec891056d0 | module:packages-skills-catalog-catalog:e86044ba4c | packages/skills-catalog/catalog/bundled/paperclip-operations/agent-development-review/SKILL.md |
| documents | document:agent-enablement:d609bc160a | module:packages-teams-catalog-catalog:c60d3dd99e | packages/teams-catalog/catalog/optional/operations/agent-enablement/TEAM.md |
| documents | document:agent-evals-framework-plan:0664a2d8fe | module:doc:97bf06278b | doc/plans/2026-03-13-agent-evals-framework.md |
| documents | document:agent-evidence:00d1513609 | module:docs:fae674dcd3 | docs/agent-evidence.md |
| documents | document:agent-feedback-loop:ea814c6809 | module:docs:fae674dcd3 | docs/agent-feedback-loop.md |
| documents | document:agent-governance:547b672564 | module:docs:fae674dcd3 | docs/agent-governance.md |
| documents | document:agent-handoff-rules:577be870d6 | module:docs:fae674dcd3 | docs/softwarehouse/11-agent-handoff-rules.md |
| documents | document:agent-improvement-flywheel:f46cd86c38 | module:docs:fae674dcd3 | docs/agent-improvement-flywheel.md |
| documents | document:agent-instruction-templates:af40127d38 | module:skills:3e2f7cddae | skills/paperclip-create-agent/references/agent-instruction-templates.md |
| documents | document:agent-management-follow-up-plan-ceo-patch-config-rollback-issue-approval-linking:ebf28407ed | module:doc:97bf06278b | doc/plans/2026-02-19-agent-mgmt-followup-plan.md |
| documents | document:agent-os-technical-report-for-paperclip:64c9ee34c0 | module:doc:97bf06278b | doc/plans/2026-04-08-agent-os-technical-report.md |
| documents | document:agent-policy-gates:039d303d3d | module:docs:fae674dcd3 | docs/agent-policy-gates.md |
| documents | document:agent-role-template:1167cb62be | module:docs:fae674dcd3 | docs/softwarehouse/templates/agent-role-template.md |
| documents | document:agent-runs-subsystem-spec:110c85e61f | module:doc:97bf06278b | doc/spec/agent-runs.md |
| documents | document:agent-runtime-guide:627daf72f0 | module:docs:fae674dcd3 | docs/agents-runtime.md |
| documents | document:agent-runtime-guide:e1ff44111b | module:doc:97bf06278b | doc/spec/agents-runtime.md |
| documents | document:agent-runtime-layer:aa6ce306be | module:docs:fae674dcd3 | docs/agent-runtime-layer.md |
| documents | document:agent-trajectory-log:d6d14622ad | module:docs:fae674dcd3 | docs/agent-trajectory-log.md |
| documents | document:agents-md-llm-wiki-schema:3f3b08ad45 | module:packages-plugins-plugin-llm-wiki:e31e3d114a | packages/plugins/plugin-llm-wiki/templates/AGENTS.md |
| documents | document:agents-md-llm-wiki-schema:b47d4e5b64 | module:packages-plugins-plugin-llm-wiki:e31e3d114a | packages/plugins/plugin-llm-wiki/fixtures/basic-root/AGENTS.md |
| documents | document:agents-md:7d01870255 | module:src-onboarding-assets-default:ea19d65289 | server/src/onboarding-assets/default/AGENTS.md |
| documents | document:agents-md:aee709b439 | module:item:4a28b5745a | AGENTS.md |
| documents | document:agents-md:d4fdb57ce0 | module:src-onboarding-assets-ceo:8c520eecee | server/src/onboarding-assets/ceo/AGENTS.md |
| documents | document:ai-agent-runtime-engineer:6b2557c210 | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/roles-archive/legacy-2026-07-03/ai-agent-runtime-engineer.md |
| documents | document:app-completion-review:f33aabe178 | module:docs:fae674dcd3 | docs/softwarehouse/12-app-completion-review.md |
| documents | document:app-lifecycle-standard:34e7a021fc | module:docs:fae674dcd3 | docs/softwarehouse/13-app-lifecycle-standard.md |
| documents | document:application-delivery-first-control-boundary:adbc53734c | module:docs:fae674dcd3 | docs/softwarehouse/20-application-delivery-first-control-boundary.md |
| documents | document:applications-index:58fab20fb2 | module:softwarehouse:4e4b6a44d5 | softwarehouse/portfolio/APPLICATIONS_INDEX.md |
| documents | document:approvals-md:6f24734cc1 | module:docs:fae674dcd3 | docs/guides/board-operator/approvals.md |
| documents | document:architectural-awareness-layer:03d0191537 | component:issueproperties-tsx:4c4966e296 | LUC-6627 critical proof backfill |
| documents | document:architectural-awareness-layer:03d0191537 | module:softwarehouse:4e4b6a44d5 | softwarehouse/architectural-awareness-layer.md |
| documents | document:architecture-awareness-gap-register:5de76c7aee | module:docs:fae674dcd3 | docs/status/architecture-awareness-gap-register.md |
| documents | document:architecture-awareness-report:5e470fe816 | module:report:4137e9e012 | report/tmp-luc-2973-architecture-index/status/architecture-awareness-report.md |
| documents | document:architecture-evidence-graph-system:21dd66b42b | feature:audit-extension-utilization-mjs:ca71b933bc | C:\Personal\Projekty\Aplikacje\Paperclip_Softwarehouse\docs\architecture\relations\documentation-links.csv |
| documents | document:architecture-evidence-graph-system:21dd66b42b | module:docs:fae674dcd3 | docs/architecture/architecture-evidence-graph-system.md |
| documents | document:architecture-graph:4fbd2e6490 | module:report:4137e9e012 | report/tmp-luc-2973-architecture-index/graphs/architecture-graph.md |
| documents | document:architecture-md:b2f0444f46 | module:docs:fae674dcd3 | docs/start/architecture.md |
| documents | document:architecture-owner-attribution-rules:f159630e7f | module:docs:fae674dcd3 | docs/architecture/owner-attribution-rules.md |
| documents | document:audit-to-completion-loop:919f777d2a | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/shared/60-audit-to-completion.md |
| documents | document:audit-to-completion-loop:a4f4f30e80 | module:shared:4bb1b95607 | shared/60-audit-to-completion.md |
| documents | document:audyt-dashboardu-deduplikacja-i-styl-paperclip:66b91c6d49 | module:item:4a28b5745a | dashboard-dedup-audit.md |
| documents | document:audyt-paperclip-softwarehouse-raw-vs-instancja-lokalna-aktualizacja-i-repozytoria-produkt-:a836488cc6 | module:docs:fae674dcd3 | docs/status/2026-08-08-paperclip-raw-vs-softwarehouse-upgrade-and-product-audit.md |
| documents | document:authenticate-docker-to-ecr:59b2b70ef0 | module:docs:fae674dcd3 | docs/deploy/aws-ecs.md |
| documents | document:autonomous-application-and-business-lifecycle:1325a47c69 | module:docs:fae674dcd3 | docs/softwarehouse/19-autonomous-application-business-lifecycle.md |
| documents | document:autonomous-application-and-business-lifecycle:ffa3f506ac | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/shared/21-autonomous-application-lifecycle.md |
| documents | document:autonomous-company-target:d28b8855d0 | module:docs:fae674dcd3 | docs/softwarehouse/15-autonomous-company-target.md |
| documents | document:autonomous-development-cycle:06c813ffdd | module:report:4137e9e012 | report/autonomous-cycles/2026-08-04/cycle-2026-08-04T08-02-40-722Z.md |
| documents | document:autonomous-development-cycle:1292cb6bf8 | module:report:4137e9e012 | report/autonomous-cycles/2026-08-04/cycle-2026-08-04T06-25-28-030Z.md |
| documents | document:autonomous-development-cycle:153f818e78 | module:report:4137e9e012 | report/autonomous-cycles/2026-08-04/cycle-2026-08-04T04-25-34-686Z.md |
| documents | document:autonomous-development-cycle:18bd6a2dcd | module:report:4137e9e012 | report/autonomous-cycles/2026-08-04/cycle-2026-08-04T10-01-44-397Z.md |
| documents | document:autonomous-development-cycle:22e065ab22 | module:report:4137e9e012 | report/autonomous-cycles/2026-08-04/cycle-2026-08-04T01-02-56-935Z.md |
| documents | document:autonomous-development-cycle:2550a4905e | module:report:4137e9e012 | report/autonomous-cycles/2026-08-04/cycle-2026-08-04T00-59-22-280Z.md |
| documents | document:autonomous-development-cycle:285f3b874d | module:report:4137e9e012 | report/autonomous-cycles/2026-07-02/cycle-2026-07-02T13-53-28-653Z.md |
| documents | document:autonomous-development-cycle:2a14327209 | module:report:4137e9e012 | report/autonomous-cycles/2026-06-01/cycle-2026-06-01T21-35-19-456Z.md |
| documents | document:autonomous-development-cycle:55d65fc0b8 | module:report:4137e9e012 | report/autonomous-cycles/2026-06-01/cycle-2026-06-01T22-59-39-426Z.md |
| documents | document:autonomous-development-cycle:566d43dde0 | module:report:4137e9e012 | report/autonomous-cycles/2026-06-02/cycle-2026-06-02T01-12-55-703Z.md |
| documents | document:autonomous-development-cycle:60e64bcbe6 | module:report:4137e9e012 | report/autonomous-cycles/2026-06-01/cycle-2026-06-01T21-45-19-079Z.md |
| documents | document:autonomous-development-cycle:63923d1c59 | module:report:4137e9e012 | report/autonomous-cycles/2026-06-02/cycle-2026-06-02T02-02-33-173Z.md |
| documents | document:autonomous-development-cycle:6b02629c9e | module:report:4137e9e012 | report/autonomous-cycles/2026-08-04/cycle-2026-08-04T02-24-49-635Z.md |
| documents | document:autonomous-development-cycle:72399aea75 | module:report:4137e9e012 | report/autonomous-cycles/2026-07-02/cycle-2026-07-02T13-55-10-612Z.md |
| documents | document:autonomous-development-cycle:81bbf89b22 | module:report:4137e9e012 | report/autonomous-cycles/2026-06-02/cycle-2026-06-02T00-42-37-457Z.md |
| documents | document:autonomous-development-cycle:8330932be3 | module:report:4137e9e012 | report/autonomous-cycles/latest.md |
| documents | document:autonomous-development-cycle:89cdcb7dcb | module:report:4137e9e012 | report/autonomous-cycles/2026-08-04/cycle-2026-08-04T12-01-44-087Z.md |
| documents | document:autonomous-development-cycle:9e53362f02 | module:report:4137e9e012 | report/autonomous-cycles/2026-06-01/cycle-2026-06-01T21-33-49-399Z.md |
| documents | document:autonomous-development-cycle:a2a1799835 | module:report:4137e9e012 | report/autonomous-cycles/2026-08-04/cycle-2026-08-04T16-02-37-316Z.md |
| documents | document:autonomous-development-cycle:aaf703092a | module:report:4137e9e012 | report/autonomous-cycles/2026-08-04/cycle-2026-08-04T14-01-50-562Z.md |
| documents | document:autonomous-development-cycle:b33f1fafed | module:report:4137e9e012 | report/autonomous-cycles/2026-06-01/cycle-2026-06-01T21-59-38-504Z.md |
| documents | document:autonomous-development-cycle:bdd4c31c75 | module:report:4137e9e012 | report/autonomous-cycles/2026-06-01/cycle-2026-06-01T21-43-28-042Z.md |
| documents | document:autonomous-development-cycle:d739307229 | module:report:4137e9e012 | report/autonomous-cycles/2026-06-01/cycle-2026-06-01T21-33-13-632Z.md |
| documents | document:autonomous-development-cycle:e0fe38240a | module:report:4137e9e012 | report/autonomous-cycles/2026-06-01/cycle-2026-06-01T21-36-18-845Z.md |
| documents | document:autonomous-development-cycle:e767a2eea4 | module:report:4137e9e012 | report/autonomous-cycles/2026-06-02/cycle-2026-06-02T00-09-02-583Z.md |
| documents | document:autonomous-development-loop:e272920033 | module:softwarehouse:4e4b6a44d5 | softwarehouse/autonomous-development-loop.md |
| documents | document:autonomous-idle-and-monitoring:73310ae2a2 | module:shared:4bb1b95607 | shared/95-autonomous-idle-and-monitoring.md |
| documents | document:autonomous-idle-and-monitoring:7605686159 | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/shared/95-autonomous-idle-and-monitoring.md |
| documents | document:autonomous-operating-model:ae7fc0a310 | module:softwarehouse:4e4b6a44d5 | softwarehouse/autonomous-operating-model.md |
| documents | document:autonomy-evolution-report-iteracja-4:fb08695774 | module:docs:fae674dcd3 | docs/status/2026-08-08-paperclip-autonomy-evolution-iteration-4-report.md |
| documents | document:aviary-project-manager:260ba61a7f | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/roles-archive/legacy-2026-07-03/personality-project-manager.md |
| documents | document:aws-secrets-manager-provider:793255a184 | module:doc:97bf06278b | doc/SECRETS-AWS-PROVIDER.md |
| documents | document:backend-api-engineer:02291f74ec | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/roles-archive/legacy-2026-07-03/backend-api-engineer.md |
| documents | document:baseline-role-guide-no-template-fallback:69b747765f | module:skills:3e2f7cddae | skills/paperclip-create-agent/references/baseline-role-guide.md |
| documents | document:billing-ledger-and-reporting:5e690cee1e | module:doc:97bf06278b | doc/plans/2026-03-14-billing-ledger-and-reporting.md |
| documents | document:budget-policies-and-enforcement:74c83100c5 | module:doc:97bf06278b | doc/plans/2026-03-14-budget-policies-and-enforcement.md |
| documents | document:bug-report-template:c9492660a6 | module:docs:fae674dcd3 | docs/softwarehouse/templates/bug-report-template.md |
| documents | document:business-operating-standard:ff02abc787 | module:docs:fae674dcd3 | docs/softwarehouse/14-business-operating-standard.md |
| documents | document:capability-map:1e5db1d2ae | module:docs:fae674dcd3 | docs/product/capability-map.md |
| documents | document:ceo-agent-creation-and-hiring-governance-plan-v1-1:904bbb9a02 | module:doc:97bf06278b | doc/plans/2026-02-19-ceo-agent-creation-and-hiring.md |
| documents | document:check-spentmonthlycents-vs-budgetmonthlycents:fedb321829 | module:docs:fae674dcd3 | docs/guides/agent-developer/cost-reporting.md |
| documents | document:claude-local-md:9488aeb0f6 | module:docs:fae674dcd3 | docs/adapters/claude-local.md |
| documents | document:cli-api-parity-prd:954f149784 | api_endpoint:get-cli-auth-me:04f4342f2d | LUC-6627 account access proof backfill |
| documents | document:cli-api-parity-prd:954f149784 | api_endpoint:get-get-session:b582887f38 | LUC-6627 account access proof backfill |
| documents | document:cli-api-parity-prd:954f149784 | api_endpoint:patch-profile:b979c11b08 | LUC-6627 account access proof backfill |
| documents | document:cli-api-parity-prd:954f149784 | api_endpoint:post-cli-auth-challenges-id-cancel:f3da6a28a7 | LUC-6627 account access proof backfill |
| documents | document:cli-api-parity-prd:954f149784 | module:doc:97bf06278b | doc/plans/2026-05-23-cli-api-parity.md |
| documents | document:cli-reference:6541739222 | feature:agent-ts:b8c76a35dd | LUC-6627 account access proof backfill |
| documents | document:cli-reference:6541739222 | feature:auth-ts:00013c6fb7 | LUC-6627 account access proof backfill |
| documents | document:cli-reference:6541739222 | module:doc:97bf06278b | doc/CLI.md |
| documents | document:cliphub-marketplace-for-paperclip-team-configurations:de59e76385 | module:docs:fae674dcd3 | docs/specs/cliphub-plan.md |
| documents | document:cliphub-the-company-registry:8fc4fa64a0 | module:doc:97bf06278b | doc/CLIPHUB.md |
| documents | document:cloudflare-sandbox-bridge-template:760d97b9b5 | module:packages-plugins-sandbox-providers:ebc0bd086d | packages/plugins/sandbox-providers/cloudflare/bridge-template/README.md |
| documents | document:codex-bootstrap-supervisor:b04bc6f899 | module:report:4137e9e012 | report/codex-bootstrap-supervisor.latest.md |
| documents | document:codex-bootstrap-supervisor:c8e4c23d79 | module:softwarehouse:4e4b6a44d5 | softwarehouse/codex-bootstrap-supervisor.md |
| documents | document:codex-local-md:ff03b508c1 | module:docs:fae674dcd3 | docs/adapters/codex-local.md |
| documents | document:codex-visible-automation-prompt:2efaa7feac | module:softwarehouse:4e4b6a44d5 | softwarehouse/codex-visible-automation-prompt.md |
| documents | document:comments-and-communication-md:08266e4442 | module:docs:fae674dcd3 | docs/guides/agent-developer/comments-and-communication.md |
| documents | document:company-aware-ui-system:e7bf15b937 | module:doc:97bf06278b | doc/plans/2026-07-20-company-aware-ui-system.md |
| documents | document:company-skills-workflow:8bde6f5223 | module:skills:3e2f7cddae | skills/paperclip/references/company-skills.md |
| documents | document:compile-typescript-to-javascript:d52be39a28 | module:docs:fae674dcd3 | docs/adapters/adapter-ui-parser.md |
| documents | document:component-primitives:d1fe5dbe3e | module:packages-skills-catalog-catalog:e86044ba4c | packages/skills-catalog/catalog/bundled/product/wireframe/references/components.md |
| documents | document:content-calendar:7226a93aa8 | module:packages-teams-catalog-catalog:c60d3dd99e | packages/teams-catalog/catalog/optional/content/content-machine/skills/content-calendar/SKILL.md |
| documents | document:content-machine:8b59cefc3e | module:packages-teams-catalog-catalog:c60d3dd99e | packages/teams-catalog/catalog/optional/content/content-machine/TEAM.md |
| documents | document:continuation-watchdog-closeout-md:b20b55a167 | module:report:4137e9e012 | report/continuation-watchdog-closeout.md |
| documents | document:continuation-watchdog-closeout:a5ca74d410 | module:report:4137e9e012 | report/softwarehouse-continuation-watchdog.closeout.md |
| documents | document:continuous-improvement:418e00fef3 | module:docs:fae674dcd3 | docs/softwarehouse/13-continuous-improvement.md |
| documents | document:contributing-guide:cfedf682ba | module:item:4a28b5745a | CONTRIBUTING.md |
| documents | document:coolify-production-reconciler:da4e2e2629 | module:report:4137e9e012 | report/coolify-production-reconciler.latest.md |
| documents | document:coolify-runtime-access-bindings:a3e438e0a8 | module:docs:fae674dcd3 | docs/operations/coolify-runtime-access.md |
| documents | document:coolify-vps-deployment-contract:e12230337d | module:docs:fae674dcd3 | docs/operations/coolify-vps-deployment-contract.md |
| documents | document:core-concepts-md:8442fc9051 | module:docs:fae674dcd3 | docs/start/core-concepts.md |
| documents | document:core-exec-team:b067b3f0c5 | module:packages-teams-catalog-catalog:c60d3dd99e | packages/teams-catalog/catalog/bundled/company-defaults/core-exec-team/TEAM.md |
| documents | document:costs-and-budgets-md:70075e2a13 | module:docs:fae674dcd3 | docs/guides/board-operator/costs-and-budgets.md |
| documents | document:create-and-develop-a-paperclip-plugin:c6fc28947e | module:skills:3e2f7cddae | skills/paperclip-create-plugin/SKILL.md |
| documents | document:creating-a-company-md:8dd0d7d835 | module:docs:fae674dcd3 | docs/guides/board-operator/creating-a-company.md |
| documents | document:creating-an-adapter-md:2bd86c8364 | module:docs:fae674dcd3 | docs/adapters/creating-an-adapter.md |
| documents | document:credentials-and-test-accounts:1040ca2070 | module:shared:4bb1b95607 | shared/30-credentials-and-accounts.md |
| documents | document:credentials-and-test-accounts:1828aff4a7 | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/shared/30-credentials-and-accounts.md |
| documents | document:cross-project-isolation-audit:021aa7082f | module:report:4137e9e012 | report/softwarehouse-cross-project-isolation.latest.md |
| documents | document:cto-architect:f8777b3647 | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/roles-archive/legacy-2026-07-03/cto.md |
| documents | document:current-pilot-and-intake:2083203c35 | module:shared:4bb1b95607 | shared/00-current-pilot.md |
| documents | document:current-pilot-and-intake:905ef2c9d4 | module:softwarehouse:4e4b6a44d5 | softwarehouse/instructions/shared/00-current-pilot.md |