# Architecture Graph

Generated: 2026-07-03T01:19:56.784Z

## Canonical Exports

- `architecture-awareness.json`
- `architecture-awareness.csv`
- `architecture-graph.mmd`
- `../status/architecture-awareness-report.md`

## Entity Index

| Type | Status | Name | Path | Owner |
| --- | --- | --- | --- | --- |
| agent | implemented | Agent Companies Specification Reference | .agents/skills/company-creator/references/companies-spec.md | Engineering Delivery Lead |
| agent | implemented | Example Company Package | .agents/skills/company-creator/references/example-company.md | Engineering Delivery Lead |
| agent | implemented | Creating a Company From an Existing Repository | .agents/skills/company-creator/references/from-repo-guide.md | Engineering Delivery Lead |
| agent | implemented | Company Creator | .agents/skills/company-creator/SKILL.md | Engineering Delivery Lead |
| agent | implemented | Creating a Paperclip Agent Adapter | .agents/skills/create-agent-adapter/SKILL.md | Engineering Delivery Lead |
| agent | implemented | Create a new issue-thread interaction UI (developer skill) | .agents/skills/create-issue-interaction-ui/SKILL.md | Engineering Delivery Lead |
| agent | implemented | Security Vulnerability Response Instructions | .agents/skills/deal-with-security-advisory/SKILL.md | Engineering Delivery Lead |
| agent | implemented | Paperclip Component Index | .agents/skills/design-guide/references/component-index.md | Engineering Delivery Lead |
| agent | implemented | Paperclip Design Guide | .agents/skills/design-guide/SKILL.md | Engineering Delivery Lead |
| agent | implemented | Diagnose Why Work Stopped | .agents/skills/diagnose-why-work-stopped/SKILL.md | Engineering Delivery Lead |
| agent | implemented | Doc Maintenance Audit Checklist | .agents/skills/doc-maintenance/references/audit-checklist.md | Engineering Delivery Lead |
| agent | implemented | Section Map | .agents/skills/doc-maintenance/references/section-map.md | Engineering Delivery Lead |
| agent | implemented | Doc Maintenance Skill | .agents/skills/doc-maintenance/SKILL.md | Engineering Delivery Lead |
| agent | implemented | Create and develop a Paperclip plugin | .agents/skills/paperclip-create-plugin/SKILL.md | Engineering Delivery Lead |
| agent | implemented | Paperclip Dev Workspace Run / Verify / Fix | .agents/skills/paperclip-dev-workspace-run-verify-fix/SKILL.md | Engineering Delivery Lead |
| agent | implemented | Paperclip Project Memory Map | .agents/skills/paperclip-project-memory/references/memory-map.md | Engineering Delivery Lead |
| agent | implemented | Paperclip Project Memory | .agents/skills/paperclip-project-memory/SKILL.md | Engineering Delivery Lead |
| agent | implemented | PR Report Style Guide | .agents/skills/pr-report/references/style-guide.md | Engineering Delivery Lead |
| agent | implemented | PR Report Skill | .agents/skills/pr-report/SKILL.md | Engineering Delivery Lead |
| agent | implemented | PRCheckloop | .agents/skills/prcheckloop/SKILL.md | Engineering Delivery Lead |
| agent | implemented | Release Discord Announcement Skill | .agents/skills/release-changelog-discord-message/SKILL.md | Engineering Delivery Lead |
| agent | implemented | Release Changelog Skill | .agents/skills/release-changelog/SKILL.md | Engineering Delivery Lead |
| agent | implemented | Release Coordination Skill | .agents/skills/release/SKILL.md | Engineering Delivery Lead |
| agent | implemented | Terminal-Bench Loop | .agents/skills/terminal-bench-loop/SKILL.md | Engineering Delivery Lead |
| agent | implemented | Active Mission | .agents/state/active-mission.md | Engineering Delivery Lead |
| agent | implemented | Agent Evals | .agents/state/agent-evals.md | Engineering Delivery Lead |
| agent | implemented | Board Context | .agents/state/board-context.md | Engineering Delivery Lead |
| agent | implemented | Paperclip Project Journal | .agents/state/project-journal.md | Engineering Delivery Lead |
| agent | implemented | Responsibility Learning | .agents/state/responsibility-learning.md | Engineering Delivery Lead |
| agent | implemented | Context Capture Workflow | .agents/workflows/context-capture.md | Engineering Delivery Lead |
| agent | implemented | Softwarehouse Coordination Workflow | .agents/workflows/softwarehouse-coordination.md | Engineering Delivery Lead |
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
| api_endpoint | implemented | GET /board-api-keys | server/src/routes/access.ts#/board-api-keys | Backend Platform Lead |
| api_endpoint | implemented | POST /board-api-keys | server/src/routes/access.ts#/board-api-keys | Backend Platform Lead |
| api_endpoint | implemented | DELETE /board-api-keys/:keyId | server/src/routes/access.ts#/board-api-keys/:keyId | Backend Platform Lead |
| api_endpoint | implemented | GET /board-claim/:token | server/src/routes/access.ts#/board-claim/:token | Backend Platform Lead |
| api_endpoint | implemented | POST /board-claim/:token/claim | server/src/routes/access.ts#/board-claim/:token/claim | Backend Platform Lead |
| api_endpoint | implemented | POST /bootstrap/claim | server/src/routes/access.ts#/bootstrap/claim | Backend Platform Lead |
| api_endpoint | implemented | POST /cli-auth/challenges | server/src/routes/access.ts#/cli-auth/challenges | Backend Platform Lead |
| api_endpoint | implemented | GET /cli-auth/challenges/:id | server/src/routes/access.ts#/cli-auth/challenges/:id | Backend Platform Lead |
| api_endpoint | implemented | POST /cli-auth/challenges/:id/approve | server/src/routes/access.ts#/cli-auth/challenges/:id/approve | Backend Platform Lead |
| api_endpoint | implemented | POST /cli-auth/challenges/:id/cancel | server/src/routes/access.ts#/cli-auth/challenges/:id/cancel | Backend Platform Lead |
| api_endpoint | implemented | GET /cli-auth/me | server/src/routes/access.ts#/cli-auth/me | Backend Platform Lead |
| api_endpoint | implemented | POST /cli-auth/revoke-current | server/src/routes/access.ts#/cli-auth/revoke-current | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/invites | server/src/routes/access.ts#/companies/:companyId/invites | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/invites | server/src/routes/access.ts#/companies/:companyId/invites | Backend Platform Lead |
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
| api_endpoint | implemented | GET /issues/:id/runs | server/src/routes/activity.ts#/issues/:id/runs | Backend Platform Lead |
| api_endpoint | implemented | GET /adapters | server/src/routes/adapters.ts#/adapters | Backend Platform Lead |
| api_endpoint | implemented | GET /adapters/:type | server/src/routes/adapters.ts#/adapters/:type | Backend Platform Lead |
| api_endpoint | implemented | PATCH /adapters/:type | server/src/routes/adapters.ts#/adapters/:type | Backend Platform Lead |
| api_endpoint | implemented | DELETE /adapters/:type | server/src/routes/adapters.ts#/adapters/:type | Backend Platform Lead |
| api_endpoint | implemented | GET /adapters/:type/config-schema | server/src/routes/adapters.ts#/adapters/:type/config-schema | Backend Platform Lead |
| api_endpoint | implemented | PATCH /adapters/:type/override | server/src/routes/adapters.ts#/adapters/:type/override | Backend Platform Lead |
| api_endpoint | implemented | POST /adapters/:type/reinstall | server/src/routes/adapters.ts#/adapters/:type/reinstall | Backend Platform Lead |
| api_endpoint | implemented | POST /adapters/:type/reload | server/src/routes/adapters.ts#/adapters/:type/reload | Backend Platform Lead |
| api_endpoint | implemented | GET /adapters/:type/ui-parser.js | server/src/routes/adapters.ts#/adapters/:type/ui-parser.js | Backend Platform Lead |
| api_endpoint | implemented | POST /adapters/install | server/src/routes/adapters.ts#/adapters/install | Backend Platform Lead |
| api_endpoint | implemented | GET /agents/:id | server/src/routes/agents.ts#/agents/:id | Backend Platform Lead |
| api_endpoint | implemented | PATCH /agents/:id | server/src/routes/agents.ts#/agents/:id | Backend Platform Lead |
| api_endpoint | implemented | DELETE /agents/:id | server/src/routes/agents.ts#/agents/:id | Backend Platform Lead |
| api_endpoint | implemented | POST /agents/:id/approve | server/src/routes/agents.ts#/agents/:id/approve | Backend Platform Lead |
| api_endpoint | implemented | POST /agents/:id/claude-login | server/src/routes/agents.ts#/agents/:id/claude-login | Backend Platform Lead |
| api_endpoint | implemented | POST /agents/:id/clear-error | server/src/routes/agents.ts#/agents/:id/clear-error | Backend Platform Lead |
| api_endpoint | implemented | GET /agents/:id/config-revisions | server/src/routes/agents.ts#/agents/:id/config-revisions | Backend Platform Lead |
| api_endpoint | implemented | GET /agents/:id/config-revisions/:revisionId | server/src/routes/agents.ts#/agents/:id/config-revisions/:revisionId | Backend Platform Lead |
| api_endpoint | implemented | POST /agents/:id/config-revisions/:revisionId/rollback | server/src/routes/agents.ts#/agents/:id/config-revisions/:revisionId/rollback | Backend Platform Lead |
| api_endpoint | implemented | GET /agents/:id/configuration | server/src/routes/agents.ts#/agents/:id/configuration | Backend Platform Lead |
| api_endpoint | implemented | POST /agents/:id/heartbeat/invoke | server/src/routes/agents.ts#/agents/:id/heartbeat/invoke | Backend Platform Lead |
| api_endpoint | implemented | GET /agents/:id/instructions-bundle | server/src/routes/agents.ts#/agents/:id/instructions-bundle | Backend Platform Lead |
| api_endpoint | implemented | PATCH /agents/:id/instructions-bundle | server/src/routes/agents.ts#/agents/:id/instructions-bundle | Backend Platform Lead |
| api_endpoint | implemented | GET /agents/:id/instructions-bundle/file | server/src/routes/agents.ts#/agents/:id/instructions-bundle/file | Backend Platform Lead |
| api_endpoint | implemented | PUT /agents/:id/instructions-bundle/file | server/src/routes/agents.ts#/agents/:id/instructions-bundle/file | Backend Platform Lead |
| api_endpoint | implemented | DELETE /agents/:id/instructions-bundle/file | server/src/routes/agents.ts#/agents/:id/instructions-bundle/file | Backend Platform Lead |
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
| api_endpoint | implemented | GET /:companyId | server/src/routes/companies.ts#/:companyId | Backend Platform Lead |
| api_endpoint | implemented | PATCH /:companyId | server/src/routes/companies.ts#/:companyId | Backend Platform Lead |
| api_endpoint | implemented | DELETE /:companyId | server/src/routes/companies.ts#/:companyId | Backend Platform Lead |
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
| api_endpoint | implemented | GET /companies/:companyId/skills/:skillId | server/src/routes/company-skills.ts#/companies/:companyId/skills/:skillId | Backend Platform Lead |
| api_endpoint | implemented | DELETE /companies/:companyId/skills/:skillId | server/src/routes/company-skills.ts#/companies/:companyId/skills/:skillId | Backend Platform Lead |
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
| api_endpoint | implemented | GET /companies/:companyId/costs/quota-windows | server/src/routes/costs.ts#/companies/:companyId/costs/quota-windows | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/costs/summary | server/src/routes/costs.ts#/companies/:companyId/costs/summary | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/costs/window-spend | server/src/routes/costs.ts#/companies/:companyId/costs/window-spend | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/finance-events | server/src/routes/costs.ts#/companies/:companyId/finance-events | Backend Platform Lead |
| api_endpoint | implemented | GET /issues/:id/cost-summary | server/src/routes/costs.ts#/issues/:id/cost-summary | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/dashboard | server/src/routes/dashboard.ts#/companies/:companyId/dashboard | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/environments | server/src/routes/environments.ts#/companies/:companyId/environments | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/environments | server/src/routes/environments.ts#/companies/:companyId/environments | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/environments/capabilities | server/src/routes/environments.ts#/companies/:companyId/environments/capabilities | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/environments/probe-config | server/src/routes/environments.ts#/companies/:companyId/environments/probe-config | Backend Platform Lead |
| api_endpoint | implemented | GET /environment-leases/:leaseId | server/src/routes/environments.ts#/environment-leases/:leaseId | Backend Platform Lead |
| api_endpoint | implemented | GET /environments/:id | server/src/routes/environments.ts#/environments/:id | Backend Platform Lead |
| api_endpoint | implemented | PATCH /environments/:id | server/src/routes/environments.ts#/environments/:id | Backend Platform Lead |
| api_endpoint | implemented | DELETE /environments/:id | server/src/routes/environments.ts#/environments/:id | Backend Platform Lead |
| api_endpoint | implemented | GET /environments/:id/leases | server/src/routes/environments.ts#/environments/:id/leases | Backend Platform Lead |
| api_endpoint | implemented | POST /environments/:id/probe | server/src/routes/environments.ts#/environments/:id/probe | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/execution-workspaces | server/src/routes/execution-workspaces.ts#/companies/:companyId/execution-workspaces | Backend Platform Lead |
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
| api_endpoint | implemented | GET /goals/:id | server/src/routes/goals.ts#/goals/:id | Backend Platform Lead |
| api_endpoint | implemented | PATCH /goals/:id | server/src/routes/goals.ts#/goals/:id | Backend Platform Lead |
| api_endpoint | implemented | DELETE /goals/:id | server/src/routes/goals.ts#/goals/:id | Backend Platform Lead |
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
| api_endpoint | implemented | POST /issues/:id/tree-holds | server/src/routes/issue-tree-control.ts#/issues/:id/tree-holds | Backend Platform Lead |
| api_endpoint | implemented | GET /issues/:id/tree-holds | server/src/routes/issue-tree-control.ts#/issues/:id/tree-holds | Backend Platform Lead |
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
| api_endpoint | implemented | GET /issues/:id | server/src/routes/issues.ts#/issues/:id | Backend Platform Lead |
| api_endpoint | implemented | PATCH /issues/:id | server/src/routes/issues.ts#/issues/:id | Backend Platform Lead |
| api_endpoint | implemented | DELETE /issues/:id | server/src/routes/issues.ts#/issues/:id | Backend Platform Lead |
| api_endpoint | implemented | GET /issues/:id/accepted-plan-decompositions | server/src/routes/issues.ts#/issues/:id/accepted-plan-decompositions | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/accepted-plan-decompositions | server/src/routes/issues.ts#/issues/:id/accepted-plan-decompositions | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/admin/force-release | server/src/routes/issues.ts#/issues/:id/admin/force-release | Backend Platform Lead |
| api_endpoint | implemented | GET /issues/:id/approvals | server/src/routes/issues.ts#/issues/:id/approvals | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/approvals | server/src/routes/issues.ts#/issues/:id/approvals | Backend Platform Lead |
| api_endpoint | implemented | DELETE /issues/:id/approvals/:approvalId | server/src/routes/issues.ts#/issues/:id/approvals/:approvalId | Backend Platform Lead |
| api_endpoint | implemented | GET /issues/:id/attachments | server/src/routes/issues.ts#/issues/:id/attachments | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/checkout | server/src/routes/issues.ts#/issues/:id/checkout | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/children | server/src/routes/issues.ts#/issues/:id/children | Backend Platform Lead |
| api_endpoint | implemented | GET /issues/:id/comments | server/src/routes/issues.ts#/issues/:id/comments | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/comments | server/src/routes/issues.ts#/issues/:id/comments | Backend Platform Lead |
| api_endpoint | implemented | GET /issues/:id/comments/:commentId | server/src/routes/issues.ts#/issues/:id/comments/:commentId | Backend Platform Lead |
| api_endpoint | implemented | DELETE /issues/:id/comments/:commentId | server/src/routes/issues.ts#/issues/:id/comments/:commentId | Backend Platform Lead |
| api_endpoint | implemented | GET /issues/:id/documents | server/src/routes/issues.ts#/issues/:id/documents | Backend Platform Lead |
| api_endpoint | implemented | GET /issues/:id/documents/:key | server/src/routes/issues.ts#/issues/:id/documents/:key | Backend Platform Lead |
| api_endpoint | implemented | PUT /issues/:id/documents/:key | server/src/routes/issues.ts#/issues/:id/documents/:key | Backend Platform Lead |
| api_endpoint | implemented | DELETE /issues/:id/documents/:key | server/src/routes/issues.ts#/issues/:id/documents/:key | Backend Platform Lead |
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
| api_endpoint | implemented | POST /issues/:id/inbox-archive | server/src/routes/issues.ts#/issues/:id/inbox-archive | Backend Platform Lead |
| api_endpoint | implemented | DELETE /issues/:id/inbox-archive | server/src/routes/issues.ts#/issues/:id/inbox-archive | Backend Platform Lead |
| api_endpoint | implemented | GET /issues/:id/interactions | server/src/routes/issues.ts#/issues/:id/interactions | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/interactions | server/src/routes/issues.ts#/issues/:id/interactions | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/interactions/:interactionId/accept | server/src/routes/issues.ts#/issues/:id/interactions/:interactionId/accept | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/interactions/:interactionId/cancel | server/src/routes/issues.ts#/issues/:id/interactions/:interactionId/cancel | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/interactions/:interactionId/reject | server/src/routes/issues.ts#/issues/:id/interactions/:interactionId/reject | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/interactions/:interactionId/respond | server/src/routes/issues.ts#/issues/:id/interactions/:interactionId/respond | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/low-trust/promotions | server/src/routes/issues.ts#/issues/:id/low-trust/promotions | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/monitor/check-now | server/src/routes/issues.ts#/issues/:id/monitor/check-now | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/read | server/src/routes/issues.ts#/issues/:id/read | Backend Platform Lead |
| api_endpoint | implemented | DELETE /issues/:id/read | server/src/routes/issues.ts#/issues/:id/read | Backend Platform Lead |
| api_endpoint | implemented | GET /issues/:id/recovery-actions | server/src/routes/issues.ts#/issues/:id/recovery-actions | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/recovery-actions/resolve | server/src/routes/issues.ts#/issues/:id/recovery-actions/resolve | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/release | server/src/routes/issues.ts#/issues/:id/release | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/scheduled-retry/retry-now | server/src/routes/issues.ts#/issues/:id/scheduled-retry/retry-now | Backend Platform Lead |
| api_endpoint | implemented | GET /issues/:id/work-products | server/src/routes/issues.ts#/issues/:id/work-products | Backend Platform Lead |
| api_endpoint | implemented | POST /issues/:id/work-products | server/src/routes/issues.ts#/issues/:id/work-products | Backend Platform Lead |
| api_endpoint | implemented | DELETE /labels/:labelId | server/src/routes/issues.ts#/labels/:labelId | Backend Platform Lead |
| api_endpoint | implemented | PATCH /work-products/:id | server/src/routes/issues.ts#/work-products/:id | Backend Platform Lead |
| api_endpoint | implemented | DELETE /work-products/:id | server/src/routes/issues.ts#/work-products/:id | Backend Platform Lead |
| api_endpoint | implemented | GET /llms/agent-configuration.txt | server/src/routes/llms.ts#/llms/agent-configuration.txt | Backend Platform Lead |
| api_endpoint | implemented | GET /llms/agent-configuration/:adapterType.txt | server/src/routes/llms.ts#/llms/agent-configuration/:adapterType.txt | Backend Platform Lead |
| api_endpoint | implemented | GET /llms/agent-icons.txt | server/src/routes/llms.ts#/llms/agent-icons.txt | Backend Platform Lead |
| api_endpoint | implemented | GET /openapi.json | server/src/routes/openapi.ts#/openapi.json | Backend Platform Lead |
| api_endpoint | implemented | GET /_plugins/:pluginId/ui/*filePath | server/src/routes/plugin-ui-static.ts#/_plugins/:pluginId/ui/*filePath | Backend Platform Lead |
| api_endpoint | implemented | GET /plugins | server/src/routes/plugins.ts#/plugins | Backend Platform Lead |
| api_endpoint | implemented | GET /plugins/:pluginId | server/src/routes/plugins.ts#/plugins/:pluginId | Backend Platform Lead |
| api_endpoint | implemented | DELETE /plugins/:pluginId | server/src/routes/plugins.ts#/plugins/:pluginId | Backend Platform Lead |
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
| api_endpoint | implemented | GET /projects/:id | server/src/routes/projects.ts#/projects/:id | Backend Platform Lead |
| api_endpoint | implemented | PATCH /projects/:id | server/src/routes/projects.ts#/projects/:id | Backend Platform Lead |
| api_endpoint | implemented | DELETE /projects/:id | server/src/routes/projects.ts#/projects/:id | Backend Platform Lead |
| api_endpoint | implemented | GET /projects/:id/workspaces | server/src/routes/projects.ts#/projects/:id/workspaces | Backend Platform Lead |
| api_endpoint | implemented | POST /projects/:id/workspaces | server/src/routes/projects.ts#/projects/:id/workspaces | Backend Platform Lead |
| api_endpoint | implemented | PATCH /projects/:id/workspaces/:workspaceId | server/src/routes/projects.ts#/projects/:id/workspaces/:workspaceId | Backend Platform Lead |
| api_endpoint | implemented | DELETE /projects/:id/workspaces/:workspaceId | server/src/routes/projects.ts#/projects/:id/workspaces/:workspaceId | Backend Platform Lead |
| api_endpoint | implemented | POST /projects/:id/workspaces/:workspaceId/runtime-commands/:action | server/src/routes/projects.ts#/projects/:id/workspaces/:workspaceId/runtime-commands/:action | Backend Platform Lead |
| api_endpoint | implemented | POST /projects/:id/workspaces/:workspaceId/runtime-services/:action | server/src/routes/projects.ts#/projects/:id/workspaces/:workspaceId/runtime-services/:action | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/resource-memberships/me | server/src/routes/resource-memberships.ts#/companies/:companyId/resource-memberships/me | Backend Platform Lead |
| api_endpoint | implemented | PUT /companies/:companyId/resource-memberships/me/agents/:agentId | server/src/routes/resource-memberships.ts#/companies/:companyId/resource-memberships/me/agents/:agentId | Backend Platform Lead |
| api_endpoint | implemented | PUT /companies/:companyId/resource-memberships/me/projects/:projectId | server/src/routes/resource-memberships.ts#/companies/:companyId/resource-memberships/me/projects/:projectId | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/routines | server/src/routes/routines.ts#/companies/:companyId/routines | Backend Platform Lead |
| api_endpoint | implemented | POST /companies/:companyId/routines | server/src/routes/routines.ts#/companies/:companyId/routines | Backend Platform Lead |
| api_endpoint | implemented | PATCH /routine-triggers/:id | server/src/routes/routines.ts#/routine-triggers/:id | Backend Platform Lead |
| api_endpoint | implemented | DELETE /routine-triggers/:id | server/src/routes/routines.ts#/routine-triggers/:id | Backend Platform Lead |
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
| api_endpoint | implemented | GET /secret-provider-configs/:id | server/src/routes/secrets.ts#/secret-provider-configs/:id | Backend Platform Lead |
| api_endpoint | implemented | PATCH /secret-provider-configs/:id | server/src/routes/secrets.ts#/secret-provider-configs/:id | Backend Platform Lead |
| api_endpoint | implemented | DELETE /secret-provider-configs/:id | server/src/routes/secrets.ts#/secret-provider-configs/:id | Backend Platform Lead |
| api_endpoint | implemented | POST /secret-provider-configs/:id/default | server/src/routes/secrets.ts#/secret-provider-configs/:id/default | Backend Platform Lead |
| api_endpoint | implemented | POST /secret-provider-configs/:id/health | server/src/routes/secrets.ts#/secret-provider-configs/:id/health | Backend Platform Lead |
| api_endpoint | implemented | PATCH /secrets/:id | server/src/routes/secrets.ts#/secrets/:id | Backend Platform Lead |
| api_endpoint | implemented | DELETE /secrets/:id | server/src/routes/secrets.ts#/secrets/:id | Backend Platform Lead |
| api_endpoint | implemented | GET /secrets/:id/access-events | server/src/routes/secrets.ts#/secrets/:id/access-events | Backend Platform Lead |
| api_endpoint | implemented | POST /secrets/:id/rotate | server/src/routes/secrets.ts#/secrets/:id/rotate | Backend Platform Lead |
| api_endpoint | implemented | GET /secrets/:id/usage | server/src/routes/secrets.ts#/secrets/:id/usage | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/sidebar-badges | server/src/routes/sidebar-badges.ts#/companies/:companyId/sidebar-badges | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/sidebar-preferences/me | server/src/routes/sidebar-preferences.ts#/companies/:companyId/sidebar-preferences/me | Backend Platform Lead |
| api_endpoint | implemented | PUT /companies/:companyId/sidebar-preferences/me | server/src/routes/sidebar-preferences.ts#/companies/:companyId/sidebar-preferences/me | Backend Platform Lead |
| api_endpoint | implemented | GET /sidebar-preferences/me | server/src/routes/sidebar-preferences.ts#/sidebar-preferences/me | Backend Platform Lead |
| api_endpoint | implemented | PUT /sidebar-preferences/me | server/src/routes/sidebar-preferences.ts#/sidebar-preferences/me | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/softwarehouse/backlog | server/src/routes/softwarehouse.ts#/companies/:companyId/softwarehouse/backlog | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/softwarehouse/issue-templates | server/src/routes/softwarehouse.ts#/companies/:companyId/softwarehouse/issue-templates | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/softwarehouse/knowledge | server/src/routes/softwarehouse.ts#/companies/:companyId/softwarehouse/knowledge | Backend Platform Lead |
| api_endpoint | implemented | GET /companies/:companyId/softwarehouse/tools | server/src/routes/softwarehouse.ts#/companies/:companyId/softwarehouse/tools | Backend Platform Lead |
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
| component | implemented | config-fields.tsx | ui/src/adapters/claude-local/config-fields.tsx | Frontend Experience Lead |
| component | implemented | config-fields.tsx | ui/src/adapters/codex-local/config-fields.tsx | Frontend Experience Lead |
| component | implemented | config-fields.tsx | ui/src/adapters/cursor/config-fields.tsx | Frontend Experience Lead |
| component | implemented | config-fields.tsx | ui/src/adapters/gemini-local/config-fields.tsx | Frontend Experience Lead |
| component | implemented | config-fields.tsx | ui/src/adapters/grok-local/config-fields.tsx | Frontend Experience Lead |
| component | implemented | config-fields.tsx | ui/src/adapters/http/config-fields.tsx | Frontend Experience Lead |
| component | implemented | local-workspace-runtime-fields.tsx | ui/src/adapters/local-workspace-runtime-fields.tsx | Frontend Experience Lead |
| component | implemented | config-fields.tsx | ui/src/adapters/openclaw-gateway/config-fields.tsx | Frontend Experience Lead |
| component | implemented | config-fields.tsx | ui/src/adapters/opencode-local/config-fields.tsx | Frontend Experience Lead |
| component | implemented | config-fields.tsx | ui/src/adapters/pi-local/config-fields.tsx | Frontend Experience Lead |
| component | implemented | config-fields.tsx | ui/src/adapters/process/config-fields.tsx | Frontend Experience Lead |
| component | implemented | runtime-json-fields.tsx | ui/src/adapters/runtime-json-fields.tsx | Frontend Experience Lead |
| component | implemented | schema-config-fields.tsx | ui/src/adapters/schema-config-fields.tsx | Frontend Experience Lead |
| component | implemented | App.tsx | ui/src/App.tsx | Frontend Experience Lead |
| component | implemented | CompanySettingsNav.tsx | ui/src/components/access/CompanySettingsNav.tsx | Frontend Experience Lead |
| component | implemented | ModeBadge.tsx | ui/src/components/access/ModeBadge.tsx | Frontend Experience Lead |
| component | implemented | AccountingModelCard.tsx | ui/src/components/AccountingModelCard.tsx | Frontend Experience Lead |
| component | implemented | ActiveAgentsPanel.tsx | ui/src/components/ActiveAgentsPanel.tsx | Frontend Experience Lead |
| component | implemented | ActivityCharts.tsx | ui/src/components/ActivityCharts.tsx | Frontend Experience Lead |
| component | implemented | ActivityRow.tsx | ui/src/components/ActivityRow.tsx | Frontend Experience Lead |
| component | implemented | agent-config-primitives.tsx | ui/src/components/agent-config-primitives.tsx | Frontend Experience Lead |
| component | implemented | AgentActionButtons.tsx | ui/src/components/AgentActionButtons.tsx | Frontend Experience Lead |
| component | implemented | AgentConfigForm.tsx | ui/src/components/AgentConfigForm.tsx | Frontend Experience Lead |
| component | implemented | AgentIconPicker.tsx | ui/src/components/AgentIconPicker.tsx | Frontend Experience Lead |
| component | implemented | AgentProperties.tsx | ui/src/components/AgentProperties.tsx | Frontend Experience Lead |
| component | implemented | ApprovalCard.tsx | ui/src/components/ApprovalCard.tsx | Frontend Experience Lead |
| component | implemented | ApprovalPayload.tsx | ui/src/components/ApprovalPayload.tsx | Frontend Experience Lead |
| component | implemented | ArtifactFileChip.tsx | ui/src/components/ArtifactFileChip.tsx | Frontend Experience Lead |
| component | implemented | ArtifactCard.tsx | ui/src/components/artifacts/ArtifactCard.tsx | Frontend Experience Lead |
| component | implemented | ArtifactGroupCard.tsx | ui/src/components/artifacts/ArtifactGroupCard.tsx | Frontend Experience Lead |
| component | implemented | AsciiArtAnimation.tsx | ui/src/components/AsciiArtAnimation.tsx | Frontend Experience Lead |
| component | implemented | BillerSpendCard.tsx | ui/src/components/BillerSpendCard.tsx | Frontend Experience Lead |
| component | implemented | BlockedInboxView.tsx | ui/src/components/BlockedInboxView.tsx | Frontend Experience Lead |
| component | implemented | BlockedReasonChip.tsx | ui/src/components/BlockedReasonChip.tsx | Frontend Experience Lead |
| component | implemented | BootstrapPendingPage.tsx | ui/src/components/BootstrapPendingPage.tsx | Frontend Experience Lead |
| component | implemented | BreadcrumbBar.tsx | ui/src/components/BreadcrumbBar.tsx | Frontend Experience Lead |
| component | implemented | BudgetIncidentCard.tsx | ui/src/components/BudgetIncidentCard.tsx | Frontend Experience Lead |
| component | implemented | BudgetPolicyCard.tsx | ui/src/components/BudgetPolicyCard.tsx | Frontend Experience Lead |
| component | implemented | BudgetSidebarMarker.tsx | ui/src/components/BudgetSidebarMarker.tsx | Frontend Experience Lead |
| component | implemented | ClaudeSubscriptionPanel.tsx | ui/src/components/ClaudeSubscriptionPanel.tsx | Frontend Experience Lead |
| component | implemented | CloudAccessGate.tsx | ui/src/components/CloudAccessGate.tsx | Frontend Experience Lead |
| component | implemented | CodexSubscriptionPanel.tsx | ui/src/components/CodexSubscriptionPanel.tsx | Frontend Experience Lead |
| component | implemented | CommandPalette.tsx | ui/src/components/CommandPalette.tsx | Frontend Experience Lead |
| component | implemented | CommentThread.tsx | ui/src/components/CommentThread.tsx | Frontend Experience Lead |

## Relation Index

| Type | From | To | Evidence |
| --- | --- | --- | --- |
| connected_to | api_endpoint:delete-adapters-type:261ac82c9d | module:src-routes:b474eba4ee | server/src/routes/adapters.ts |
| connected_to | api_endpoint:delete-agents-id-instructions-bundle-file:9723d64054 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:delete-agents-id-keys-keyid:6bf2a864ac | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:delete-agents-id:c6de105f68 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:delete-attachments-attachmentid:cb78eb2436 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:delete-board-api-keys-keyid:42bd7f3077 | module:src-routes:b474eba4ee | server/src/routes/access.ts |
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
| connected_to | api_endpoint:get-adapters-type:120bd15cfd | module:src-routes:b474eba4ee | server/src/routes/adapters.ts |
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
| connected_to | api_endpoint:get-board-api-keys:ccd3c8142a | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:get-board-claim-token:d9c5491ac0 | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:get-cli-auth-challenges-id:c4a6ea60c4 | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:get-cli-auth-me:04f4342f2d | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:get-cloud-upstreams-connectionid-push-runs-runid:d809f897df | module:src-routes:b474eba4ee | server/src/routes/cloud-upstreams.ts |
| connected_to | api_endpoint:get-cloud-upstreams:e681f2d029 | module:src-routes:b474eba4ee | server/src/routes/cloud-upstreams.ts |
| connected_to | api_endpoint:get-companies-companyid-activity:8a8290c529 | module:src-routes:b474eba4ee | server/src/routes/activity.ts |
| connected_to | api_endpoint:get-companies-companyid-adapters-type-detect-model:ce6f62715c | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:get-companies-companyid-adapters-type-model-profiles:ae29579111 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:get-companies-companyid-adapters-type-models:a19b916b35 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:get-companies-companyid-agent-configurations:ed14af9e8e | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:get-companies-companyid-agents:d019714997 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:get-companies-companyid-approvals:c48c0d67dc | module:src-routes:b474eba4ee | server/src/routes/approvals.ts |
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
| connected_to | api_endpoint:get-companies-companyid-costs-quota-windows:4ef8d8f2f9 | module:src-routes:b474eba4ee | server/src/routes/costs.ts |
| connected_to | api_endpoint:get-companies-companyid-costs-summary:86652e5a51 | module:src-routes:b474eba4ee | server/src/routes/costs.ts |
| connected_to | api_endpoint:get-companies-companyid-costs-window-spend:d19c064103 | module:src-routes:b474eba4ee | server/src/routes/costs.ts |
| connected_to | api_endpoint:get-companies-companyid-dashboard:a3b85af771 | module:src-routes:b474eba4ee | server/src/routes/dashboard.ts |
| connected_to | api_endpoint:get-companies-companyid-environments-capabilities:3cf50e822b | module:src-routes:b474eba4ee | server/src/routes/environments.ts |
| connected_to | api_endpoint:get-companies-companyid-environments:ac6e4c8a72 | module:src-routes:b474eba4ee | server/src/routes/environments.ts |
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
| connected_to | api_endpoint:get-companies-companyid-org-png:e2b0a62a36 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:get-companies-companyid-org-svg:757b161560 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:get-companies-companyid-org:1972369169 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
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
| connected_to | api_endpoint:get-companies-companyid-skills-skillid-files:2bb8de60d9 | module:src-routes:b474eba4ee | server/src/routes/company-skills.ts |
| connected_to | api_endpoint:get-companies-companyid-skills-skillid-update-status:ec7b242ca5 | module:src-routes:b474eba4ee | server/src/routes/company-skills.ts |
| connected_to | api_endpoint:get-companies-companyid-skills-skillid:5caa9c49a1 | module:src-routes:b474eba4ee | server/src/routes/company-skills.ts |
| connected_to | api_endpoint:get-companies-companyid-skills:936e7dcc51 | module:src-routes:b474eba4ee | server/src/routes/company-skills.ts |
| connected_to | api_endpoint:get-companies-companyid-softwarehouse-backlog:1f9fdb29d0 | module:src-routes:b474eba4ee | server/src/routes/softwarehouse.ts |
| connected_to | api_endpoint:get-companies-companyid-softwarehouse-issue-templates:c959b5150c | module:src-routes:b474eba4ee | server/src/routes/softwarehouse.ts |
| connected_to | api_endpoint:get-companies-companyid-softwarehouse-knowledge:4e9c016808 | module:src-routes:b474eba4ee | server/src/routes/softwarehouse.ts |
| connected_to | api_endpoint:get-companies-companyid-softwarehouse-tools:f7d8321117 | module:src-routes:b474eba4ee | server/src/routes/softwarehouse.ts |
| connected_to | api_endpoint:get-companies-companyid-teams-catalog-installed:24f6dfb582 | module:src-routes:b474eba4ee | server/src/routes/teams-catalog.ts |
| connected_to | api_endpoint:get-companies-companyid-user-directory:7d2f0cc67b | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:get-companies-companyid-users-userslug-profile:ba4a566949 | module:src-routes:b474eba4ee | server/src/routes/user-profiles.ts |
| connected_to | api_endpoint:get-companyid-artifacts:05894db53f | module:src-routes:b474eba4ee | server/src/routes/companies.ts |
| connected_to | api_endpoint:get-companyid-feedback-traces:022db1d66e | module:src-routes:b474eba4ee | server/src/routes/companies.ts |
| connected_to | api_endpoint:get-companyid:6575a2d654 | module:src-routes:b474eba4ee | server/src/routes/companies.ts |
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
| connected_to | api_endpoint:get-issues-id-attachments:8491afc869 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:get-issues-id-comments-commentid:bcfbaf1adb | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:get-issues-id-comments:fd09b4b3e0 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:get-issues-id-cost-summary:0593bc8a8f | module:src-routes:b474eba4ee | server/src/routes/costs.ts |
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
| connected_to | api_endpoint:get-issues-id-runs:99852dc332 | module:src-routes:b474eba4ee | server/src/routes/activity.ts |
| connected_to | api_endpoint:get-issues-id-tree-control-state:a918474983 | module:src-routes:b474eba4ee | server/src/routes/issue-tree-control.ts |
| connected_to | api_endpoint:get-issues-id-tree-holds-holdid:eb5b8cee5e | module:src-routes:b474eba4ee | server/src/routes/issue-tree-control.ts |
| connected_to | api_endpoint:get-issues-id-tree-holds:029658b474 | module:src-routes:b474eba4ee | server/src/routes/issue-tree-control.ts |
| connected_to | api_endpoint:get-issues-id-work-products:04df07996a | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
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
| connected_to | api_endpoint:patch-companies-companyid-budgets:505a046daf | module:src-routes:b474eba4ee | server/src/routes/costs.ts |
| connected_to | api_endpoint:patch-companies-companyid-members-memberid-permissions:c6f459b1e3 | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:patch-companies-companyid-members-memberid-role-and-grants:c4579dea85 | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:patch-companies-companyid-members-memberid:30da414d0a | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:patch-companies-companyid-skills-skillid-files:58f148d5ff | module:src-routes:b474eba4ee | server/src/routes/company-skills.ts |
| connected_to | api_endpoint:patch-companyid-branding:63e7d834a0 | module:src-routes:b474eba4ee | server/src/routes/companies.ts |
| connected_to | api_endpoint:patch-companyid:4f2eaf7359 | module:src-routes:b474eba4ee | server/src/routes/companies.ts |
| connected_to | api_endpoint:patch-environments-id:7fdc1ee34d | module:src-routes:b474eba4ee | server/src/routes/environments.ts |
| connected_to | api_endpoint:patch-execution-workspaces-id:414e9e82c4 | module:src-routes:b474eba4ee | server/src/routes/execution-workspaces.ts |
| connected_to | api_endpoint:patch-goals-id:326c8d903a | module:src-routes:b474eba4ee | server/src/routes/goals.ts |
| connected_to | api_endpoint:patch-instance-settings-experimental:1f2adfc25e | module:src-routes:b474eba4ee | server/src/routes/instance-settings.ts |
| connected_to | api_endpoint:patch-instance-settings-general:767e968738 | module:src-routes:b474eba4ee | server/src/routes/instance-settings.ts |
| connected_to | api_endpoint:patch-issues-id-documents-key-annotations-threadid:64a0db4924 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:patch-issues-id:f1783bb077 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:patch-profile:b979c11b08 | module:src-routes:b474eba4ee | server/src/routes/auth.ts |
| connected_to | api_endpoint:patch-projects-id-workspaces-workspaceid:d177a71fea | module:src-routes:b474eba4ee | server/src/routes/projects.ts |
| connected_to | api_endpoint:patch-projects-id:4efe287486 | module:src-routes:b474eba4ee | server/src/routes/projects.ts |
| connected_to | api_endpoint:patch-routine-triggers-id:ee6cc7bfb3 | module:src-routes:b474eba4ee | server/src/routes/routines.ts |
| connected_to | api_endpoint:patch-routines-id:be6dea0f77 | module:src-routes:b474eba4ee | server/src/routes/routines.ts |
| connected_to | api_endpoint:patch-secret-provider-configs-id:fa79ea1b34 | module:src-routes:b474eba4ee | server/src/routes/secrets.ts |
| connected_to | api_endpoint:patch-secrets-id:0e6dc8f855 | module:src-routes:b474eba4ee | server/src/routes/secrets.ts |
| connected_to | api_endpoint:patch-work-products-id:2f3dccec71 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:post-adapters-install:950e22d07a | module:src-routes:b474eba4ee | server/src/routes/adapters.ts |
| connected_to | api_endpoint:post-adapters-type-reinstall:8642263b64 | module:src-routes:b474eba4ee | server/src/routes/adapters.ts |
| connected_to | api_endpoint:post-adapters-type-reload:2228ac8fa5 | module:src-routes:b474eba4ee | server/src/routes/adapters.ts |
| connected_to | api_endpoint:post-admin-users-userid-demote-instance-admin:3a7867c655 | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:post-admin-users-userid-promote-instance-admin:9efb5ddd30 | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:post-agents-id-approve:0cd86fce15 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:post-agents-id-claude-login:8b13b9757d | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:post-agents-id-clear-error:f83ad405a6 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
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
| connected_to | api_endpoint:post-board-api-keys:3654899d9a | module:src-routes:b474eba4ee | server/src/routes/access.ts |
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
| connected_to | api_endpoint:post-companies-companyid-agent-hires:cea9f95e37 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:post-companies-companyid-agents:2957bd6d18 | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
| connected_to | api_endpoint:post-companies-companyid-approvals:c2dfa7d6a7 | module:src-routes:b474eba4ee | server/src/routes/approvals.ts |
| connected_to | api_endpoint:post-companies-companyid-assets-images:f2f2e79bf4 | module:src-routes:b474eba4ee | server/src/routes/assets.ts |
| connected_to | api_endpoint:post-companies-companyid-budget-incidents-incidentid-resolve:69ac426dd0 | module:src-routes:b474eba4ee | server/src/routes/costs.ts |
| connected_to | api_endpoint:post-companies-companyid-budgets-policies:1a5497206f | module:src-routes:b474eba4ee | server/src/routes/costs.ts |
| connected_to | api_endpoint:post-companies-companyid-cost-events:0b7985783b | module:src-routes:b474eba4ee | server/src/routes/costs.ts |
| connected_to | api_endpoint:post-companies-companyid-environments-probe-config:79f7ee336e | module:src-routes:b474eba4ee | server/src/routes/environments.ts |
| connected_to | api_endpoint:post-companies-companyid-environments:641573a90a | module:src-routes:b474eba4ee | server/src/routes/environments.ts |
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
| connected_to | api_endpoint:post-companies-companyid-teams-catalog-catalogid-install:370d0ca00c | module:src-routes:b474eba4ee | server/src/routes/teams-catalog.ts |
| connected_to | api_endpoint:post-companies-companyid-teams-catalog-catalogid-preview:6f7efc9cd7 | module:src-routes:b474eba4ee | server/src/routes/teams-catalog.ts |
| connected_to | api_endpoint:post-companyid-archive:e24dd1b757 | module:src-routes:b474eba4ee | server/src/routes/companies.ts |
| connected_to | api_endpoint:post-companyid-export:b95d732d6a | module:src-routes:b474eba4ee | server/src/routes/companies.ts |
| connected_to | api_endpoint:post-companyid-exports-preview:f5706e9e1e | module:src-routes:b474eba4ee | server/src/routes/companies.ts |
| connected_to | api_endpoint:post-companyid-exports:de19679713 | module:src-routes:b474eba4ee | server/src/routes/companies.ts |
| connected_to | api_endpoint:post-companyid-imports-apply:e32f3b7b86 | module:src-routes:b474eba4ee | server/src/routes/companies.ts |
| connected_to | api_endpoint:post-companyid-imports-preview:bf845be5d5 | module:src-routes:b474eba4ee | server/src/routes/companies.ts |
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
| connected_to | api_endpoint:post-issues-id-checkout:cbb5f7ff93 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:post-issues-id-children:df8794e00c | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
| connected_to | api_endpoint:post-issues-id-comments:306ccfa063 | module:src-routes:b474eba4ee | server/src/routes/issues.ts |
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
| connected_to | api_endpoint:post-join-requests-requestid-claim-api-key:fafe951864 | module:src-routes:b474eba4ee | server/src/routes/access.ts |
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
| connected_to | api_endpoint:post:2b152fcb8e | module:src-routes:b474eba4ee | server/src/routes/companies.ts |
| connected_to | api_endpoint:put-admin-users-userid-company-access:3bbce7d1a5 | module:src-routes:b474eba4ee | server/src/routes/access.ts |
| connected_to | api_endpoint:put-agents-id-instructions-bundle-file:5c60f0be4d | module:src-routes:b474eba4ee | server/src/routes/agents.ts |
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
| connected_to | project:paperclip:d381e971ce | task:luc-6627:4ee531ce81 | paperclip/issues/LUC-6627 |
| connected_to | project:paperclip:d381e971ce | task:luc-7181:5a4e608d55 | paperclip/issues/LUC-7181 |
| connected_to | project:paperclip:d381e971ce | task:luc-7180:ce3c93c71c | paperclip/issues/LUC-7180 |
| connected_to | project:paperclip:d381e971ce | task:luc-7163:d80a99c887 | paperclip/issues/LUC-7163 |
| connected_to | project:paperclip:d381e971ce | task:luc-7157:319a27fb44 | paperclip/issues/LUC-7157 |
| connected_to | project:paperclip:d381e971ce | task:luc-7035:5ec23862ba | paperclip/issues/LUC-7035 |
| connected_to | project:paperclip:d381e971ce | task:luc-7152:634a2d2692 | paperclip/issues/LUC-7152 |
| connected_to | project:paperclip:d381e971ce | task:luc-7149:fc6e4f9ba9 | paperclip/issues/LUC-7149 |
| connected_to | project:paperclip:d381e971ce | task:luc-7140:cd8cdbf333 | paperclip/issues/LUC-7140 |
| connected_to | project:paperclip:d381e971ce | task:luc-7137:0400211a10 | paperclip/issues/LUC-7137 |
| connected_to | project:paperclip:d381e971ce | task:luc-7133:78681f552d | paperclip/issues/LUC-7133 |
| connected_to | project:paperclip:d381e971ce | task:luc-7129:743eb9c024 | paperclip/issues/LUC-7129 |
| connected_to | project:paperclip:d381e971ce | task:luc-7130:176bfaa6cb | paperclip/issues/LUC-7130 |
| connected_to | project:paperclip:d381e971ce | task:luc-7123:f676309bc3 | paperclip/issues/LUC-7123 |
| connected_to | project:paperclip:d381e971ce | task:luc-7121:c0fed12c9f | paperclip/issues/LUC-7121 |
| connected_to | project:paperclip:d381e971ce | task:luc-7111:cf8ceb8d50 | paperclip/issues/LUC-7111 |
| connected_to | project:paperclip:d381e971ce | task:luc-7113:e4613469b2 | paperclip/issues/LUC-7113 |
| connected_to | project:paperclip:d381e971ce | task:luc-7118:54bbcab579 | paperclip/issues/LUC-7118 |
| connected_to | project:paperclip:d381e971ce | task:luc-7024:d2da5515fe | paperclip/issues/LUC-7024 |
| connected_to | project:paperclip:d381e971ce | task:luc-7103:9321a19f3f | paperclip/issues/LUC-7103 |
| connected_to | project:paperclip:d381e971ce | task:luc-7023:a5c25a5dc7 | paperclip/issues/LUC-7023 |
| connected_to | project:paperclip:d381e971ce | task:luc-7001:49e2a41b9f | paperclip/issues/LUC-7001 |
| connected_to | project:paperclip:d381e971ce | task:luc-7106:a37e182ae1 | paperclip/issues/LUC-7106 |
| connected_to | project:paperclip:d381e971ce | task:luc-7097:3f3d26fd5f | paperclip/issues/LUC-7097 |
| connected_to | project:paperclip:d381e971ce | task:luc-6247:be7f73124d | paperclip/issues/LUC-6247 |
| connected_to | project:paperclip:d381e971ce | task:luc-4658:8c5a8fa238 | paperclip/issues/LUC-4658 |
| connected_to | project:paperclip:d381e971ce | task:luc-7084:666badd6d6 | paperclip/issues/LUC-7084 |
| connected_to | project:paperclip:d381e971ce | task:luc-7008:858f63dd22 | paperclip/issues/LUC-7008 |
| connected_to | project:paperclip:d381e971ce | task:luc-7081:0508f521e9 | paperclip/issues/LUC-7081 |
| connected_to | project:paperclip:d381e971ce | task:luc-7002:d5802c5c5b | paperclip/issues/LUC-7002 |
| connected_to | project:paperclip:d381e971ce | task:luc-7029:4bfef0be9a | paperclip/issues/LUC-7029 |
| connected_to | project:paperclip:d381e971ce | task:luc-7028:2dc4506890 | paperclip/issues/LUC-7028 |
| connected_to | project:paperclip:d381e971ce | task:luc-7058:0a875daac7 | paperclip/issues/LUC-7058 |
| connected_to | project:paperclip:d381e971ce | task:luc-7003:1389f3c1c6 | paperclip/issues/LUC-7003 |
| connected_to | project:paperclip:d381e971ce | task:luc-7039:0698735a29 | paperclip/issues/LUC-7039 |
| connected_to | project:paperclip:d381e971ce | task:luc-7072:3638dfb984 | paperclip/issues/LUC-7072 |
| connected_to | project:paperclip:d381e971ce | task:luc-6454:3c4ed8dc54 | paperclip/issues/LUC-6454 |
| connected_to | project:paperclip:d381e971ce | task:luc-7068:d82f23a51d | paperclip/issues/LUC-7068 |
| connected_to | project:paperclip:d381e971ce | task:luc-7033:b1bab06764 | paperclip/issues/LUC-7033 |
| connected_to | project:paperclip:d381e971ce | task:luc-7069:2cbdbbb392 | paperclip/issues/LUC-7069 |
| connected_to | project:paperclip:d381e971ce | task:luc-7017:2e1449aea5 | paperclip/issues/LUC-7017 |
| connected_to | project:paperclip:d381e971ce | task:luc-7032:a6cc9f4eac | paperclip/issues/LUC-7032 |
| connected_to | project:paperclip:d381e971ce | task:luc-7052:6f21354b33 | paperclip/issues/LUC-7052 |
| connected_to | project:paperclip:d381e971ce | task:luc-6568:5242d4ee1c | paperclip/issues/LUC-6568 |
| connected_to | project:paperclip:d381e971ce | task:luc-6188:c9181438c9 | paperclip/issues/LUC-6188 |
| connected_to | project:paperclip:d381e971ce | task:luc-7053:0f70584c8f | paperclip/issues/LUC-7053 |
| connected_to | project:paperclip:d381e971ce | task:luc-7063:27ee1c3d83 | paperclip/issues/LUC-7063 |
| connected_to | project:paperclip:d381e971ce | task:luc-6200:ffa9e4f885 | paperclip/issues/LUC-6200 |
| connected_to | project:paperclip:d381e971ce | task:luc-7065:aece6651b8 | paperclip/issues/LUC-7065 |
| connected_to | project:paperclip:d381e971ce | task:luc-7005:2d1f730cc7 | paperclip/issues/LUC-7005 |
| connected_to | project:paperclip:d381e971ce | task:luc-7056:be602bf13c | paperclip/issues/LUC-7056 |
| connected_to | project:paperclip:d381e971ce | task:luc-7045:bb5e5c8799 | paperclip/issues/LUC-7045 |
| connected_to | project:paperclip:d381e971ce | task:luc-7057:862260b21e | paperclip/issues/LUC-7057 |
| connected_to | project:paperclip:d381e971ce | task:luc-7020:52199c3be3 | paperclip/issues/LUC-7020 |
| connected_to | project:paperclip:d381e971ce | task:luc-7034:359d97f04a | paperclip/issues/LUC-7034 |
| connected_to | project:paperclip:d381e971ce | task:luc-6572:266191b742 | paperclip/issues/LUC-6572 |
| connected_to | project:paperclip:d381e971ce | task:luc-7027:ee10afc1ac | paperclip/issues/LUC-7027 |
| connected_to | project:paperclip:d381e971ce | task:luc-7021:4056f12276 | paperclip/issues/LUC-7021 |
| connected_to | project:paperclip:d381e971ce | task:luc-7022:0a49f294c8 | paperclip/issues/LUC-7022 |
| connected_to | project:paperclip:d381e971ce | task:luc-7011:2ea04dcb70 | paperclip/issues/LUC-7011 |
| connected_to | project:paperclip:d381e971ce | task:luc-7007:dc210da3e5 | paperclip/issues/LUC-7007 |
| connected_to | project:paperclip:d381e971ce | task:luc-7026:8252a88e4a | paperclip/issues/LUC-7026 |
| connected_to | project:paperclip:d381e971ce | task:luc-7025:f1dc98dee1 | paperclip/issues/LUC-7025 |
| connected_to | project:paperclip:d381e971ce | task:luc-7012:029a95baf6 | paperclip/issues/LUC-7012 |
| connected_to | project:paperclip:d381e971ce | task:luc-7015:80261f0263 | paperclip/issues/LUC-7015 |
| connected_to | project:paperclip:d381e971ce | task:luc-7000:f812c0d444 | paperclip/issues/LUC-7000 |
| connected_to | project:paperclip:d381e971ce | task:luc-6994:d2dab5ad21 | paperclip/issues/LUC-6994 |
| connected_to | project:paperclip:d381e971ce | task:luc-6988:c7268f89c3 | paperclip/issues/LUC-6988 |
| connected_to | project:paperclip:d381e971ce | task:luc-6989:267a390846 | paperclip/issues/LUC-6989 |
| connected_to | project:paperclip:d381e971ce | task:luc-6978:870fca4782 | paperclip/issues/LUC-6978 |
| connected_to | project:paperclip:d381e971ce | task:luc-6981:546e150c04 | paperclip/issues/LUC-6981 |
| connected_to | project:paperclip:d381e971ce | task:luc-6979:4009a9ef79 | paperclip/issues/LUC-6979 |
| connected_to | project:paperclip:d381e971ce | task:luc-6971:a206026ad9 | paperclip/issues/LUC-6971 |
| connected_to | project:paperclip:d381e971ce | task:luc-6966:3eb361bf24 | paperclip/issues/LUC-6966 |
| connected_to | project:paperclip:d381e971ce | task:luc-6953:d47a3aaa42 | paperclip/issues/LUC-6953 |
| connected_to | project:paperclip:d381e971ce | task:luc-6944:e5b8dccfc9 | paperclip/issues/LUC-6944 |
| connected_to | project:paperclip:d381e971ce | task:luc-6945:72673d36fc | paperclip/issues/LUC-6945 |
| connected_to | project:paperclip:d381e971ce | task:luc-6938:a770b51fa0 | paperclip/issues/LUC-6938 |
| connected_to | project:paperclip:d381e971ce | task:luc-6934:7092eef70d | paperclip/issues/LUC-6934 |
| connected_to | project:paperclip:d381e971ce | task:luc-6927:8462c3a523 | paperclip/issues/LUC-6927 |
| connected_to | project:paperclip:d381e971ce | task:luc-4656:18e69f7c1b | paperclip/issues/LUC-4656 |
| connected_to | project:paperclip:d381e971ce | task:luc-6924:c301c819a8 | paperclip/issues/LUC-6924 |
| connected_to | project:paperclip:d381e971ce | task:luc-6922:c475750052 | paperclip/issues/LUC-6922 |
| connected_to | project:paperclip:d381e971ce | task:luc-6921:0f1155cd59 | paperclip/issues/LUC-6921 |
| connected_to | project:paperclip:d381e971ce | task:luc-6919:df81a98cdc | paperclip/issues/LUC-6919 |
| connected_to | project:paperclip:d381e971ce | task:luc-6915:c862c87641 | paperclip/issues/LUC-6915 |
| connected_to | project:paperclip:d381e971ce | task:luc-6910:1e4305ad7e | paperclip/issues/LUC-6910 |
| connected_to | project:paperclip:d381e971ce | task:luc-6909:fb8319e858 | paperclip/issues/LUC-6909 |
| connected_to | project:paperclip:d381e971ce | task:luc-6907:162351ef9e | paperclip/issues/LUC-6907 |
| connected_to | project:paperclip:d381e971ce | task:luc-6903:f9c796f1da | paperclip/issues/LUC-6903 |
| connected_to | project:paperclip:d381e971ce | task:luc-6899:253c3a21eb | paperclip/issues/LUC-6899 |
| connected_to | project:paperclip:d381e971ce | task:luc-6895:f22db05b63 | paperclip/issues/LUC-6895 |
| connected_to | project:paperclip:d381e971ce | task:luc-6887:5a57e9081e | paperclip/issues/LUC-6887 |
| connected_to | project:paperclip:d381e971ce | task:luc-6882:7f8e0ac843 | paperclip/issues/LUC-6882 |
| connected_to | project:paperclip:d381e971ce | task:luc-6883:35d0816085 | paperclip/issues/LUC-6883 |
| connected_to | project:paperclip:d381e971ce | task:luc-6881:1fe17a2694 | paperclip/issues/LUC-6881 |
| connected_to | project:paperclip:d381e971ce | task:luc-6879:78ed90b947 | paperclip/issues/LUC-6879 |
| connected_to | project:paperclip:d381e971ce | task:luc-6880:22a16cd611 | paperclip/issues/LUC-6880 |
| connected_to | project:paperclip:d381e971ce | task:luc-6877:f30881b257 | paperclip/issues/LUC-6877 |
| connected_to | project:paperclip:d381e971ce | task:luc-6875:23a79fb13a | paperclip/issues/LUC-6875 |
| connected_to | project:paperclip:d381e971ce | task:luc-6874:45c3ec5661 | paperclip/issues/LUC-6874 |
| connected_to | project:paperclip:d381e971ce | task:luc-6872:864c55d3a9 | paperclip/issues/LUC-6872 |
| connected_to | project:paperclip:d381e971ce | task:luc-6871:1b0a31463d | paperclip/issues/LUC-6871 |
| connected_to | project:paperclip:d381e971ce | task:luc-6868:6e5103f848 | paperclip/issues/LUC-6868 |
| connected_to | project:paperclip:d381e971ce | task:luc-6869:dffb0fe44f | paperclip/issues/LUC-6869 |
| connected_to | project:paperclip:d381e971ce | task:luc-6866:132f764b17 | paperclip/issues/LUC-6866 |
| connected_to | project:paperclip:d381e971ce | task:luc-6864:f1175dcbd3 | paperclip/issues/LUC-6864 |
| connected_to | project:paperclip:d381e971ce | task:luc-6862:a2995aa903 | paperclip/issues/LUC-6862 |
| connected_to | project:paperclip:d381e971ce | task:luc-6861:ea06b2648c | paperclip/issues/LUC-6861 |
| connected_to | project:paperclip:d381e971ce | task:luc-6860:99f018f57f | paperclip/issues/LUC-6860 |
| connected_to | project:paperclip:d381e971ce | task:luc-6858:5b8a25f7ca | paperclip/issues/LUC-6858 |
| connected_to | project:paperclip:d381e971ce | task:luc-6856:3e5f2b4533 | paperclip/issues/LUC-6856 |
| connected_to | project:paperclip:d381e971ce | task:luc-6855:ae839f6a62 | paperclip/issues/LUC-6855 |
| connected_to | project:paperclip:d381e971ce | task:luc-6852:4537a773d7 | paperclip/issues/LUC-6852 |
| connected_to | project:paperclip:d381e971ce | task:luc-6851:87b51fd47b | paperclip/issues/LUC-6851 |
| connected_to | project:paperclip:d381e971ce | task:luc-6849:cc6be71abd | paperclip/issues/LUC-6849 |
| connected_to | project:paperclip:d381e971ce | task:luc-6847:b09ec17954 | paperclip/issues/LUC-6847 |
| connected_to | project:paperclip:d381e971ce | task:luc-6844:7616c2e9df | paperclip/issues/LUC-6844 |
| connected_to | project:paperclip:d381e971ce | task:luc-6842:dc97f6089c | paperclip/issues/LUC-6842 |
| connected_to | project:paperclip:d381e971ce | task:luc-6840:9a1a71feb7 | paperclip/issues/LUC-6840 |
| connected_to | project:paperclip:d381e971ce | task:luc-6839:f1ee9f9d8d | paperclip/issues/LUC-6839 |
| connected_to | project:paperclip:d381e971ce | task:luc-6837:b3325b9478 | paperclip/issues/LUC-6837 |
| connected_to | project:paperclip:d381e971ce | task:luc-6835:2360155165 | paperclip/issues/LUC-6835 |
| connected_to | project:paperclip:d381e971ce | task:luc-6833:2437f7e03e | paperclip/issues/LUC-6833 |
| connected_to | project:paperclip:d381e971ce | task:luc-6831:bc2b63068e | paperclip/issues/LUC-6831 |
| connected_to | project:paperclip:d381e971ce | task:luc-6829:a0992e8cc8 | paperclip/issues/LUC-6829 |
| connected_to | project:paperclip:d381e971ce | task:luc-6826:6262f065ce | paperclip/issues/LUC-6826 |
| connected_to | project:paperclip:d381e971ce | task:luc-6825:6e521d1f89 | paperclip/issues/LUC-6825 |
| connected_to | project:paperclip:d381e971ce | task:luc-6823:cd7be36404 | paperclip/issues/LUC-6823 |
| connected_to | project:paperclip:d381e971ce | task:luc-6821:3526f16785 | paperclip/issues/LUC-6821 |
| connected_to | project:paperclip:d381e971ce | task:luc-6818:5e8803f53d | paperclip/issues/LUC-6818 |
| connected_to | project:paperclip:d381e971ce | task:luc-6814:c57edd0896 | paperclip/issues/LUC-6814 |
| connected_to | project:paperclip:d381e971ce | task:luc-6811:b6e0bc2d78 | paperclip/issues/LUC-6811 |
| connected_to | project:paperclip:d381e971ce | task:luc-6812:2be189b5af | paperclip/issues/LUC-6812 |
| connected_to | project:paperclip:d381e971ce | task:luc-6808:af4740065a | paperclip/issues/LUC-6808 |
| connected_to | project:paperclip:d381e971ce | task:luc-6806:9ea07e6e54 | paperclip/issues/LUC-6806 |
| connected_to | project:paperclip:d381e971ce | task:luc-6804:ad4998a1bf | paperclip/issues/LUC-6804 |
| connected_to | project:paperclip:d381e971ce | task:luc-6803:7cb51e11f4 | paperclip/issues/LUC-6803 |
| connected_to | project:paperclip:d381e971ce | task:luc-6801:05ee800068 | paperclip/issues/LUC-6801 |
| connected_to | project:paperclip:d381e971ce | task:luc-6800:feab30d7b5 | paperclip/issues/LUC-6800 |
| connected_to | project:paperclip:d381e971ce | task:luc-6798:d367c630b9 | paperclip/issues/LUC-6798 |
| connected_to | project:paperclip:d381e971ce | task:luc-6795:ff06a51fbf | paperclip/issues/LUC-6795 |
| connected_to | project:paperclip:d381e971ce | task:luc-6796:00d3d54a0f | paperclip/issues/LUC-6796 |
| connected_to | project:paperclip:d381e971ce | task:luc-6792:f7f0acb807 | paperclip/issues/LUC-6792 |
| connected_to | project:paperclip:d381e971ce | task:luc-6793:874bbc1150 | paperclip/issues/LUC-6793 |
| connected_to | project:paperclip:d381e971ce | task:luc-6791:18cb0966f8 | paperclip/issues/LUC-6791 |
| connected_to | project:paperclip:d381e971ce | task:luc-6789:8e9f4f6711 | paperclip/issues/LUC-6789 |
| connected_to | project:paperclip:d381e971ce | task:luc-6788:02a9970049 | paperclip/issues/LUC-6788 |
| connected_to | project:paperclip:d381e971ce | task:luc-6787:66d0e5ba86 | paperclip/issues/LUC-6787 |
| connected_to | project:paperclip:d381e971ce | task:luc-6785:8182abdcae | paperclip/issues/LUC-6785 |
| connected_to | project:paperclip:d381e971ce | task:luc-6783:d74fecd14c | paperclip/issues/LUC-6783 |
| connected_to | project:paperclip:d381e971ce | task:luc-6780:437288a455 | paperclip/issues/LUC-6780 |
| connected_to | project:paperclip:d381e971ce | task:luc-6779:695b401bab | paperclip/issues/LUC-6779 |
| connected_to | project:paperclip:d381e971ce | task:luc-6778:d709134b0a | paperclip/issues/LUC-6778 |
| connected_to | project:paperclip:d381e971ce | task:luc-6777:a937e21286 | paperclip/issues/LUC-6777 |
| connected_to | project:paperclip:d381e971ce | task:luc-6775:8542f24f90 | paperclip/issues/LUC-6775 |
| connected_to | project:paperclip:d381e971ce | task:luc-6773:e6c007b2de | paperclip/issues/LUC-6773 |
| connected_to | project:paperclip:d381e971ce | task:luc-6770:d4aad4b077 | paperclip/issues/LUC-6770 |
| connected_to | project:paperclip:d381e971ce | task:luc-6769:bb4f23a37c | paperclip/issues/LUC-6769 |
| connected_to | project:paperclip:d381e971ce | task:luc-6767:9357fd4708 | paperclip/issues/LUC-6767 |
| connected_to | project:paperclip:d381e971ce | task:luc-6766:2104cc7976 | paperclip/issues/LUC-6766 |
| connected_to | project:paperclip:d381e971ce | task:luc-6765:e416f166e8 | paperclip/issues/LUC-6765 |
| connected_to | project:paperclip:d381e971ce | task:luc-6763:730e0f9652 | paperclip/issues/LUC-6763 |
| connected_to | project:paperclip:d381e971ce | task:luc-6762:727e240f21 | paperclip/issues/LUC-6762 |
| connected_to | project:paperclip:d381e971ce | task:luc-6761:8feff07b45 | paperclip/issues/LUC-6761 |
| connected_to | project:paperclip:d381e971ce | task:luc-6758:90682943d1 | paperclip/issues/LUC-6758 |
| connected_to | project:paperclip:d381e971ce | task:luc-6756:2de7bb7852 | paperclip/issues/LUC-6756 |
| connected_to | project:paperclip:d381e971ce | task:luc-6753:e2c17500cc | paperclip/issues/LUC-6753 |
| connected_to | project:paperclip:d381e971ce | task:luc-6754:f55f6a355a | paperclip/issues/LUC-6754 |
| connected_to | project:paperclip:d381e971ce | task:luc-6751:f9a8ffeb43 | paperclip/issues/LUC-6751 |
| connected_to | project:paperclip:d381e971ce | task:luc-6748:5fab52c18b | paperclip/issues/LUC-6748 |
| connected_to | project:paperclip:d381e971ce | task:luc-6745:72ffb3df19 | paperclip/issues/LUC-6745 |
| connected_to | project:paperclip:d381e971ce | task:luc-6743:d36745f51a | paperclip/issues/LUC-6743 |
| connected_to | project:paperclip:d381e971ce | task:luc-6744:ebc6f7a197 | paperclip/issues/LUC-6744 |
| connected_to | project:paperclip:d381e971ce | task:luc-6740:14bf751a15 | paperclip/issues/LUC-6740 |
| connected_to | project:paperclip:d381e971ce | task:luc-6738:4194966f42 | paperclip/issues/LUC-6738 |
| connected_to | project:paperclip:d381e971ce | task:luc-6737:a0c851fffc | paperclip/issues/LUC-6737 |
| connected_to | project:paperclip:d381e971ce | task:luc-6735:550363c739 | paperclip/issues/LUC-6735 |
| connected_to | project:paperclip:d381e971ce | task:luc-6734:ac31e24b3e | paperclip/issues/LUC-6734 |
| connected_to | project:paperclip:d381e971ce | task:luc-6732:021acaef47 | paperclip/issues/LUC-6732 |
| connected_to | project:paperclip:d381e971ce | task:luc-6729:d8ce35b378 | paperclip/issues/LUC-6729 |
| connected_to | project:paperclip:d381e971ce | task:luc-6728:dae4a1dd68 | paperclip/issues/LUC-6728 |
| connected_to | project:paperclip:d381e971ce | task:luc-6725:3239220958 | paperclip/issues/LUC-6725 |
| connected_to | project:paperclip:d381e971ce | task:luc-6724:aad4689ef1 | paperclip/issues/LUC-6724 |
| connected_to | project:paperclip:d381e971ce | task:luc-6723:208822c420 | paperclip/issues/LUC-6723 |
| connected_to | project:paperclip:d381e971ce | task:luc-6721:a8eccf509d | paperclip/issues/LUC-6721 |
| connected_to | project:paperclip:d381e971ce | task:luc-6718:c3e4436a1c | paperclip/issues/LUC-6718 |
| connected_to | project:paperclip:d381e971ce | task:luc-6708:d59b449c56 | paperclip/issues/LUC-6708 |
| connected_to | project:paperclip:d381e971ce | task:luc-6717:1a0fa0ca83 | paperclip/issues/LUC-6717 |
| connected_to | project:paperclip:d381e971ce | task:luc-6714:fa96d663ea | paperclip/issues/LUC-6714 |
| connected_to | project:paperclip:d381e971ce | task:luc-6713:8e6064d210 | paperclip/issues/LUC-6713 |
| connected_to | project:paperclip:d381e971ce | task:luc-6712:6ee74ae38e | paperclip/issues/LUC-6712 |
| connected_to | project:paperclip:d381e971ce | task:luc-6710:954deee89f | paperclip/issues/LUC-6710 |
| connected_to | project:paperclip:d381e971ce | task:luc-6702:57a32c0b6b | paperclip/issues/LUC-6702 |
| connected_to | project:paperclip:d381e971ce | task:luc-6700:2f05e7897e | paperclip/issues/LUC-6700 |
| connected_to | project:paperclip:d381e971ce | task:luc-6699:3b45fb2ddd | paperclip/issues/LUC-6699 |
| connected_to | project:paperclip:d381e971ce | task:luc-6694:4f6cfc196a | paperclip/issues/LUC-6694 |
| connected_to | project:paperclip:d381e971ce | task:luc-6695:fece3ee520 | paperclip/issues/LUC-6695 |
| connected_to | project:paperclip:d381e971ce | task:luc-6693:6a8c69f02d | paperclip/issues/LUC-6693 |
| connected_to | project:paperclip:d381e971ce | task:luc-6692:cf475017e2 | paperclip/issues/LUC-6692 |
| connected_to | project:paperclip:d381e971ce | task:luc-6691:dc713c06ca | paperclip/issues/LUC-6691 |
| connected_to | project:paperclip:d381e971ce | task:luc-4463:80b35273ca | paperclip/issues/LUC-4463 |
| connected_to | project:paperclip:d381e971ce | task:luc-6690:acbe27dc0e | paperclip/issues/LUC-6690 |
| connected_to | project:paperclip:d381e971ce | task:luc-6689:ebe3c1ed45 | paperclip/issues/LUC-6689 |
| connected_to | project:paperclip:d381e971ce | task:luc-6687:7ac825b7a2 | paperclip/issues/LUC-6687 |
| connected_to | project:paperclip:d381e971ce | task:luc-6685:622e98dd6f | paperclip/issues/LUC-6685 |
| connected_to | project:paperclip:d381e971ce | task:luc-6684:350f23a0b5 | paperclip/issues/LUC-6684 |
| connected_to | project:paperclip:d381e971ce | task:luc-6680:d9a9aa1447 | paperclip/issues/LUC-6680 |
| connected_to | project:paperclip:d381e971ce | task:luc-4172:b4e3dcfef7 | paperclip/issues/LUC-4172 |
| connected_to | project:paperclip:d381e971ce | task:luc-5893:36c8b11b25 | paperclip/issues/LUC-5893 |
| connected_to | project:paperclip:d381e971ce | task:luc-4677:738084f58a | paperclip/issues/LUC-4677 |
| connected_to | project:paperclip:d381e971ce | task:luc-6679:1b7c7fde6e | paperclip/issues/LUC-6679 |
| connected_to | project:paperclip:d381e971ce | task:luc-6194:b297d3844b | paperclip/issues/LUC-6194 |
| connected_to | project:paperclip:d381e971ce | task:luc-6678:aaf24c34fd | paperclip/issues/LUC-6678 |
| connected_to | project:paperclip:d381e971ce | task:luc-6676:0aa2facdd1 | paperclip/issues/LUC-6676 |
| connected_to | project:paperclip:d381e971ce | task:luc-6674:20b966e85e | paperclip/issues/LUC-6674 |
| connected_to | project:paperclip:d381e971ce | task:luc-6672:84f15718c4 | paperclip/issues/LUC-6672 |
| connected_to | project:paperclip:d381e971ce | task:luc-6670:9c204e1f9a | paperclip/issues/LUC-6670 |
| connected_to | project:paperclip:d381e971ce | task:luc-6669:3c4ffa2e47 | paperclip/issues/LUC-6669 |
| connected_to | project:paperclip:d381e971ce | task:luc-6667:f5fff56465 | paperclip/issues/LUC-6667 |
| connected_to | project:paperclip:d381e971ce | task:luc-6199:22067880f3 | paperclip/issues/LUC-6199 |
| connected_to | project:paperclip:d381e971ce | task:luc-6455:c6b662222f | paperclip/issues/LUC-6455 |
| connected_to | project:paperclip:d381e971ce | task:luc-6536:5ed794187e | paperclip/issues/LUC-6536 |
| connected_to | project:paperclip:d381e971ce | task:luc-6666:179187a670 | paperclip/issues/LUC-6666 |
| connected_to | project:paperclip:d381e971ce | task:luc-4469:3cac1cc51e | paperclip/issues/LUC-4469 |
| connected_to | project:paperclip:d381e971ce | task:luc-5361:935dc6db4e | paperclip/issues/LUC-5361 |
| connected_to | project:paperclip:d381e971ce | task:luc-5702:9deb0c14b4 | paperclip/issues/LUC-5702 |
| connected_to | project:paperclip:d381e971ce | task:luc-5917:0e3762432f | paperclip/issues/LUC-5917 |
| connected_to | project:paperclip:d381e971ce | task:luc-5771:fcd5709723 | paperclip/issues/LUC-5771 |
| connected_to | project:paperclip:d381e971ce | task:luc-5920:cb6f724d23 | paperclip/issues/LUC-5920 |
| connected_to | project:paperclip:d381e971ce | task:luc-6527:c15e3cf780 | paperclip/issues/LUC-6527 |
| connected_to | project:paperclip:d381e971ce | task:luc-6645:ddb71d2c22 | paperclip/issues/LUC-6645 |
| connected_to | project:paperclip:d381e971ce | task:luc-6647:3531941391 | paperclip/issues/LUC-6647 |
| connected_to | project:paperclip:d381e971ce | task:luc-6665:89e356167f | paperclip/issues/LUC-6665 |
| connected_to | project:paperclip:d381e971ce | task:luc-6263:a9bdd0f1df | paperclip/issues/LUC-6263 |
| connected_to | project:paperclip:d381e971ce | task:luc-6637:7b2d889bd6 | paperclip/issues/LUC-6637 |
| connected_to | project:paperclip:d381e971ce | task:luc-6641:3418045f26 | paperclip/issues/LUC-6641 |
| connected_to | project:paperclip:d381e971ce | task:luc-4159:b8332d6fd1 | paperclip/issues/LUC-4159 |
| connected_to | project:paperclip:d381e971ce | task:luc-6663:5b8c8bc941 | paperclip/issues/LUC-6663 |
| connected_to | project:paperclip:d381e971ce | task:luc-6661:31e080d93a | paperclip/issues/LUC-6661 |
| connected_to | project:paperclip:d381e971ce | task:luc-6659:ab1baa3d86 | paperclip/issues/LUC-6659 |
| connected_to | project:paperclip:d381e971ce | task:luc-6655:fea9efdf52 | paperclip/issues/LUC-6655 |
| connected_to | project:paperclip:d381e971ce | task:luc-6658:730e77f7c6 | paperclip/issues/LUC-6658 |
| connected_to | project:paperclip:d381e971ce | task:luc-6653:b10b7dc72d | paperclip/issues/LUC-6653 |
| connected_to | project:paperclip:d381e971ce | task:luc-6649:371eb2199d | paperclip/issues/LUC-6649 |
| connected_to | project:paperclip:d381e971ce | task:luc-6650:36aec5bde5 | paperclip/issues/LUC-6650 |
| connected_to | project:paperclip:d381e971ce | task:luc-6648:cc6a75792b | paperclip/issues/LUC-6648 |
| connected_to | project:paperclip:d381e971ce | task:luc-6644:277a239348 | paperclip/issues/LUC-6644 |
| connected_to | project:paperclip:d381e971ce | task:luc-6642:1d5dfadb1d | paperclip/issues/LUC-6642 |
| connected_to | project:paperclip:d381e971ce | task:luc-6639:9111493627 | paperclip/issues/LUC-6639 |
| connected_to | project:paperclip:d381e971ce | task:luc-6635:8e66d7fc54 | paperclip/issues/LUC-6635 |
| connected_to | project:paperclip:d381e971ce | task:luc-6634:b27d6d95d4 | paperclip/issues/LUC-6634 |
| connected_to | project:paperclip:d381e971ce | task:luc-6633:5b74c320b3 | paperclip/issues/LUC-6633 |
| connected_to | project:paperclip:d381e971ce | task:luc-6631:64d447fc76 | paperclip/issues/LUC-6631 |
| connected_to | project:paperclip:d381e971ce | task:luc-6632:83cb32d3a7 | paperclip/issues/LUC-6632 |
| connected_to | project:paperclip:d381e971ce | task:luc-6630:c1da9032e1 | paperclip/issues/LUC-6630 |
| connected_to | project:paperclip:d381e971ce | task:luc-6629:5b07424f11 | paperclip/issues/LUC-6629 |
| connected_to | project:paperclip:d381e971ce | task:luc-6628:1774440564 | paperclip/issues/LUC-6628 |
| connected_to | project:paperclip:d381e971ce | task:luc-6625:64d1fa5c18 | paperclip/issues/LUC-6625 |
| connected_to | project:paperclip:d381e971ce | task:luc-6620:d3cc830c7b | paperclip/issues/LUC-6620 |
| connected_to | project:paperclip:d381e971ce | task:luc-6621:4cc81a1339 | paperclip/issues/LUC-6621 |
| connected_to | project:paperclip:d381e971ce | task:luc-6618:ca0081e007 | paperclip/issues/LUC-6618 |
| connected_to | project:paperclip:d381e971ce | task:luc-6616:a1559d51c3 | paperclip/issues/LUC-6616 |
| connected_to | project:paperclip:d381e971ce | task:luc-6615:3537fbcab7 | paperclip/issues/LUC-6615 |
| connected_to | project:paperclip:d381e971ce | task:luc-6614:c5bb55b5c9 | paperclip/issues/LUC-6614 |
| connected_to | project:paperclip:d381e971ce | task:luc-6613:a3e3ccb2e1 | paperclip/issues/LUC-6613 |
| connected_to | project:paperclip:d381e971ce | task:luc-6591:2a4af657dc | paperclip/issues/LUC-6591 |
| connected_to | project:paperclip:d381e971ce | task:luc-6610:5ce941dbd4 | paperclip/issues/LUC-6610 |
| connected_to | project:paperclip:d381e971ce | task:luc-6611:141e0a74df | paperclip/issues/LUC-6611 |
| connected_to | project:paperclip:d381e971ce | task:luc-6609:213cf6f04a | paperclip/issues/LUC-6609 |
| connected_to | project:paperclip:d381e971ce | task:luc-6607:59d8d879db | paperclip/issues/LUC-6607 |
| connected_to | project:paperclip:d381e971ce | task:luc-6605:89e02473d4 | paperclip/issues/LUC-6605 |
| connected_to | project:paperclip:d381e971ce | task:luc-6603:20219f4252 | paperclip/issues/LUC-6603 |
| connected_to | project:paperclip:d381e971ce | task:luc-6599:6e80b605e5 | paperclip/issues/LUC-6599 |
| connected_to | project:paperclip:d381e971ce | task:luc-6601:87c03e7994 | paperclip/issues/LUC-6601 |
| connected_to | project:paperclip:d381e971ce | task:luc-6597:e28e6b8ed6 | paperclip/issues/LUC-6597 |
| connected_to | project:paperclip:d381e971ce | task:luc-6583:d4a7e75143 | paperclip/issues/LUC-6583 |
| connected_to | project:paperclip:d381e971ce | task:luc-6590:973df19779 | paperclip/issues/LUC-6590 |
| connected_to | project:paperclip:d381e971ce | task:luc-6582:3d5cf43283 | paperclip/issues/LUC-6582 |
| connected_to | project:paperclip:d381e971ce | task:luc-6585:493a2e4eb2 | paperclip/issues/LUC-6585 |
| connected_to | project:paperclip:d381e971ce | task:luc-6577:5faacea8ef | paperclip/issues/LUC-6577 |
| connected_to | project:paperclip:d381e971ce | task:luc-6575:d0406905fd | paperclip/issues/LUC-6575 |
| connected_to | project:paperclip:d381e971ce | task:luc-6578:27547b3853 | paperclip/issues/LUC-6578 |
| connected_to | project:paperclip:d381e971ce | task:luc-6560:95eb6936eb | paperclip/issues/LUC-6560 |
| connected_to | project:paperclip:d381e971ce | task:luc-6574:f14488357b | paperclip/issues/LUC-6574 |
| connected_to | project:paperclip:d381e971ce | task:luc-6567:630f120327 | paperclip/issues/LUC-6567 |
| connected_to | project:paperclip:d381e971ce | task:luc-6570:ac1b3dbfd1 | paperclip/issues/LUC-6570 |
| connected_to | project:paperclip:d381e971ce | task:luc-6566:d9a2cf5181 | paperclip/issues/LUC-6566 |
| connected_to | project:paperclip:d381e971ce | task:luc-6564:e9c62eeb42 | paperclip/issues/LUC-6564 |
| connected_to | project:paperclip:d381e971ce | task:luc-6561:81004af901 | paperclip/issues/LUC-6561 |
| connected_to | project:paperclip:d381e971ce | task:luc-6557:0b81c2eca9 | paperclip/issues/LUC-6557 |
| connected_to | project:paperclip:d381e971ce | task:luc-6558:813f9c427d | paperclip/issues/LUC-6558 |
| connected_to | project:paperclip:d381e971ce | task:luc-6556:44208121af | paperclip/issues/LUC-6556 |
| connected_to | project:paperclip:d381e971ce | task:luc-6555:09a8fc7d0a | paperclip/issues/LUC-6555 |
| connected_to | project:paperclip:d381e971ce | task:luc-6554:ec7d6b7d38 | paperclip/issues/LUC-6554 |
| connected_to | project:paperclip:d381e971ce | task:luc-6550:050344e153 | paperclip/issues/LUC-6550 |
| connected_to | project:paperclip:d381e971ce | task:luc-6549:e2368ac1a2 | paperclip/issues/LUC-6549 |
| connected_to | project:paperclip:d381e971ce | task:luc-6547:25348ae316 | paperclip/issues/LUC-6547 |