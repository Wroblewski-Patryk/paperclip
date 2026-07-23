# Architecture Awareness Report

Generated: 2026-07-23T01:19:08.800Z
Project: Paperclip
Root: C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse

## Counts By Type

| Type | Count |
| --- | ---: |
| agent | 74 |
| api_endpoint | 408 |
| component | 271 |
| document | 672 |
| feature | 1110 |
| function | 12498 |
| migration | 183 |
| model | 113 |
| module | 111 |
| project | 1 |
| route | 168 |
| test | 749 |

## Counts By Status

| Status | Count |
| --- | ---: |
| blocked | 3 |
| deprecated | 7 |
| implemented | 14313 |
| in_progress | 1 |
| tested | 2034 |

## Health Signals

- Raw implementation entities without inferred tests: 12007
- Actionable implementation entities without inferred tests: 11262
- Raw implementation entities without inferred docs: 1806
- Actionable implementation entities without inferred docs: 1674
- Classified inferred-link noise: 748
- Raw tasks without architecture links: 0
- Actionable tasks without architecture links: 0
- Raw implementation entities without task links: 2070
- Actionable implementation entities without task links: 1938
- Classified task-linkage noise: 132
- Entities without owner attribution: 0
- Disconnected entities: 0

## Top Actionable Missing Test Links

- api_endpoint: USE /assets (server/src/app.ts#/assets)
- api_endpoint: POST /admin/users/:userId/demote-instance-admin (server/src/routes/access.ts#/admin/users/:userId/demote-instance-admin)
- api_endpoint: POST /admin/users/:userId/promote-instance-admin (server/src/routes/access.ts#/admin/users/:userId/promote-instance-admin)
- api_endpoint: POST /bootstrap/claim (server/src/routes/access.ts#/bootstrap/claim)
- api_endpoint: POST /companies/:companyId/join-requests/:requestId/approve (server/src/routes/access.ts#/companies/:companyId/join-requests/:requestId/approve)
- api_endpoint: POST /companies/:companyId/join-requests/:requestId/reject (server/src/routes/access.ts#/companies/:companyId/join-requests/:requestId/reject)
- api_endpoint: POST /companies/:companyId/members/:memberId/archive (server/src/routes/access.ts#/companies/:companyId/members/:memberId/archive)
- api_endpoint: PATCH /companies/:companyId/members/:memberId/permissions (server/src/routes/access.ts#/companies/:companyId/members/:memberId/permissions)
- api_endpoint: PATCH /companies/:companyId/members/:memberId/role-and-grants (server/src/routes/access.ts#/companies/:companyId/members/:memberId/role-and-grants)
- api_endpoint: POST /invites/:inviteId/revoke (server/src/routes/access.ts#/invites/:inviteId/revoke)
- api_endpoint: GET /invites/:token/skills/:skillName (server/src/routes/access.ts#/invites/:token/skills/:skillName)
- api_endpoint: GET /invites/:token/skills/index (server/src/routes/access.ts#/invites/:token/skills/index)
- api_endpoint: GET /skills/available (server/src/routes/access.ts#/skills/available)
- api_endpoint: GET /companies/:companyId/activity (server/src/routes/activity.ts#/companies/:companyId/activity)
- api_endpoint: GET /issues/:id/activity (server/src/routes/activity.ts#/issues/:id/activity)
- api_endpoint: GET /issues/:id/runs (server/src/routes/activity.ts#/issues/:id/runs)
- api_endpoint: GET /adapters (server/src/routes/adapters.ts#/adapters)
- api_endpoint: DELETE /adapters/:type (server/src/routes/adapters.ts#/adapters/:type)
- api_endpoint: PATCH /adapters/:type (server/src/routes/adapters.ts#/adapters/:type)
- api_endpoint: PATCH /adapters/:type/override (server/src/routes/adapters.ts#/adapters/:type/override)
- api_endpoint: POST /adapters/:type/reinstall (server/src/routes/adapters.ts#/adapters/:type/reinstall)
- api_endpoint: POST /adapters/:type/reload (server/src/routes/adapters.ts#/adapters/:type/reload)
- api_endpoint: GET /adapters/:type/ui-parser.js (server/src/routes/adapters.ts#/adapters/:type/ui-parser.js)
- api_endpoint: POST /adapters/install (server/src/routes/adapters.ts#/adapters/install)
- api_endpoint: DELETE /agents/:id (server/src/routes/agents.ts#/agents/:id)
- api_endpoint: GET /agents/:id (server/src/routes/agents.ts#/agents/:id)
- api_endpoint: PATCH /agents/:id (server/src/routes/agents.ts#/agents/:id)
- api_endpoint: POST /agents/:id/approve (server/src/routes/agents.ts#/agents/:id/approve)
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

## Top Actionable Missing Doc Links

- api_endpoint: POST /bootstrap/claim (server/src/routes/access.ts#/bootstrap/claim)
- api_endpoint: GET /adapters (server/src/routes/adapters.ts#/adapters)
- api_endpoint: DELETE /adapters/:type (server/src/routes/adapters.ts#/adapters/:type)
- api_endpoint: PATCH /adapters/:type (server/src/routes/adapters.ts#/adapters/:type)
- api_endpoint: GET /adapters/:type/config-schema (server/src/routes/adapters.ts#/adapters/:type/config-schema)
- api_endpoint: PATCH /adapters/:type/override (server/src/routes/adapters.ts#/adapters/:type/override)
- api_endpoint: POST /adapters/:type/reinstall (server/src/routes/adapters.ts#/adapters/:type/reinstall)
- api_endpoint: POST /adapters/:type/reload (server/src/routes/adapters.ts#/adapters/:type/reload)
- api_endpoint: GET /adapters/:type/ui-parser.js (server/src/routes/adapters.ts#/adapters/:type/ui-parser.js)
- api_endpoint: POST /adapters/install (server/src/routes/adapters.ts#/adapters/install)
- api_endpoint: GET /assets/:assetId/content (server/src/routes/assets.ts#/assets/:assetId/content)
- api_endpoint: POST /companies/:companyId/assets/images (server/src/routes/assets.ts#/companies/:companyId/assets/images)
- api_endpoint: POST /companies/:companyId/logo (server/src/routes/assets.ts#/companies/:companyId/logo)
- api_endpoint: GET /cloud-upstreams (server/src/routes/cloud-upstreams.ts#/cloud-upstreams)
- api_endpoint: POST /cloud-upstreams/:connectionId/push-runs (server/src/routes/cloud-upstreams.ts#/cloud-upstreams/:connectionId/push-runs)
- api_endpoint: GET /cloud-upstreams/:connectionId/push-runs/:runId (server/src/routes/cloud-upstreams.ts#/cloud-upstreams/:connectionId/push-runs/:runId)
- api_endpoint: POST /cloud-upstreams/:connectionId/push-runs/:runId/activation (server/src/routes/cloud-upstreams.ts#/cloud-upstreams/:connectionId/push-runs/:runId/activation)
- api_endpoint: POST /cloud-upstreams/:connectionId/push-runs/:runId/cancel (server/src/routes/cloud-upstreams.ts#/cloud-upstreams/:connectionId/push-runs/:runId/cancel)
- api_endpoint: POST /cloud-upstreams/:connectionId/push-runs/preview (server/src/routes/cloud-upstreams.ts#/cloud-upstreams/:connectionId/push-runs/preview)
- api_endpoint: POST /cloud-upstreams/connect/finish (server/src/routes/cloud-upstreams.ts#/cloud-upstreams/connect/finish)
- api_endpoint: POST /cloud-upstreams/connect/start (server/src/routes/cloud-upstreams.ts#/cloud-upstreams/connect/start)
- api_endpoint: GET /:companyId/artifacts (server/src/routes/companies.ts#/:companyId/artifacts)
- api_endpoint: GET /companies/:companyId/skills (server/src/routes/company-skills.ts#/companies/:companyId/skills)
- api_endpoint: POST /companies/:companyId/skills (server/src/routes/company-skills.ts#/companies/:companyId/skills)
- api_endpoint: DELETE /companies/:companyId/skills/:skillId (server/src/routes/company-skills.ts#/companies/:companyId/skills/:skillId)
- api_endpoint: GET /companies/:companyId/skills/:skillId (server/src/routes/company-skills.ts#/companies/:companyId/skills/:skillId)
- api_endpoint: POST /companies/:companyId/skills/:skillId/audit (server/src/routes/company-skills.ts#/companies/:companyId/skills/:skillId/audit)
- api_endpoint: GET /companies/:companyId/skills/:skillId/files (server/src/routes/company-skills.ts#/companies/:companyId/skills/:skillId/files)
- api_endpoint: PATCH /companies/:companyId/skills/:skillId/files (server/src/routes/company-skills.ts#/companies/:companyId/skills/:skillId/files)
- api_endpoint: POST /companies/:companyId/skills/:skillId/install-update (server/src/routes/company-skills.ts#/companies/:companyId/skills/:skillId/install-update)
- api_endpoint: POST /companies/:companyId/skills/:skillId/reset (server/src/routes/company-skills.ts#/companies/:companyId/skills/:skillId/reset)
- api_endpoint: GET /companies/:companyId/skills/:skillId/update-status (server/src/routes/company-skills.ts#/companies/:companyId/skills/:skillId/update-status)
- api_endpoint: POST /companies/:companyId/skills/import (server/src/routes/company-skills.ts#/companies/:companyId/skills/import)
- api_endpoint: POST /companies/:companyId/skills/install-catalog (server/src/routes/company-skills.ts#/companies/:companyId/skills/install-catalog)
- api_endpoint: POST /companies/:companyId/skills/scan-projects (server/src/routes/company-skills.ts#/companies/:companyId/skills/scan-projects)
- api_endpoint: GET /skills/catalog (server/src/routes/company-skills.ts#/skills/catalog)
- api_endpoint: GET /skills/catalog/:catalogId (server/src/routes/company-skills.ts#/skills/catalog/:catalogId)
- api_endpoint: GET /skills/catalog/:catalogId/files (server/src/routes/company-skills.ts#/skills/catalog/:catalogId/files)
- api_endpoint: GET /companies/:companyId/costs/model-profiles (server/src/routes/costs.ts#/companies/:companyId/costs/model-profiles)
- api_endpoint: GET /companies/:companyId/situation (server/src/routes/dashboard.ts#/companies/:companyId/situation)

## Classified Inferred-Link Noise

- config_only_file: 294
- test_fixture_function: 454

## Top Classified Noise Samples

- config_only_file: component: index.tsx (packages/plugins/examples/plugin-authoring-smoke-example/src/ui/index.tsx)
- config_only_file: component: index.tsx (packages/plugins/examples/plugin-file-browser-example/src/ui/index.tsx)
- config_only_file: component: index.tsx (packages/plugins/examples/plugin-hello-world-example/src/ui/index.tsx)
- config_only_file: component: index.tsx (packages/plugins/examples/plugin-kitchen-sink-example/src/ui/index.tsx)
- config_only_file: component: index.tsx (packages/plugins/examples/plugin-orchestration-smoke-example/src/ui/index.tsx)
- config_only_file: component: index.tsx (packages/plugins/plugin-llm-wiki/src/ui/index.tsx)
- config_only_file: component: index.tsx (packages/plugins/plugin-workspace-diff/src/ui/index.tsx)
- config_only_file: feature: index.ts (cli/src/adapters/http/index.ts)
- config_only_file: feature: index.ts (cli/src/adapters/index.ts)
- config_only_file: feature: index.ts (cli/src/adapters/process/index.ts)
- config_only_file: feature: index.ts (cli/src/checks/index.ts)
- config_only_file: feature: index.ts (cli/src/index.ts)
- config_only_file: feature: vitest.config.ts (cli/vitest.config.ts)
- config_only_file: feature: index.ts (packages/adapter-utils/src/index.ts)
- config_only_file: feature: index.ts (packages/adapters/acpx-local/src/cli/index.ts)
- config_only_file: feature: index.ts (packages/adapters/acpx-local/src/index.ts)
- config_only_file: feature: index.ts (packages/adapters/acpx-local/src/server/index.ts)
- config_only_file: feature: index.ts (packages/adapters/acpx-local/src/ui/index.ts)
- config_only_file: feature: vitest.config.ts (packages/adapters/acpx-local/vitest.config.ts)
- config_only_file: feature: index.ts (packages/adapters/claude-local/src/cli/index.ts)
- config_only_file: feature: index.ts (packages/adapters/claude-local/src/index.ts)
- config_only_file: feature: index.ts (packages/adapters/claude-local/src/server/index.ts)
- config_only_file: feature: index.ts (packages/adapters/claude-local/src/ui/index.ts)
- config_only_file: feature: vitest.config.ts (packages/adapters/claude-local/vitest.config.ts)
- config_only_file: feature: index.ts (packages/adapters/codex-local/src/cli/index.ts)
- config_only_file: feature: index.ts (packages/adapters/codex-local/src/index.ts)
- config_only_file: feature: index.ts (packages/adapters/codex-local/src/server/index.ts)
- config_only_file: feature: index.ts (packages/adapters/codex-local/src/ui/index.ts)
- config_only_file: feature: vitest.config.ts (packages/adapters/codex-local/vitest.config.ts)
- config_only_file: feature: index.ts (packages/adapters/cursor-cloud/src/cli/index.ts)
- config_only_file: feature: index.ts (packages/adapters/cursor-cloud/src/index.ts)
- config_only_file: feature: index.ts (packages/adapters/cursor-cloud/src/server/index.ts)
- config_only_file: feature: index.ts (packages/adapters/cursor-cloud/src/ui/index.ts)
- config_only_file: feature: index.ts (packages/adapters/cursor-local/src/cli/index.ts)
- config_only_file: feature: index.ts (packages/adapters/cursor-local/src/index.ts)
- config_only_file: feature: index.ts (packages/adapters/cursor-local/src/server/index.ts)
- config_only_file: feature: index.ts (packages/adapters/cursor-local/src/ui/index.ts)
- config_only_file: feature: index.ts (packages/adapters/gemini-local/src/cli/index.ts)
- config_only_file: feature: index.ts (packages/adapters/gemini-local/src/index.ts)
- config_only_file: feature: index.ts (packages/adapters/gemini-local/src/server/index.ts)

## Classified Task-Linkage Noise

- config_only_file: 132

## Top Classified Task-Linkage Noise Samples

- config_only_file: component: index.tsx (packages/plugins/examples/plugin-authoring-smoke-example/src/ui/index.tsx)
- config_only_file: component: index.tsx (packages/plugins/examples/plugin-file-browser-example/src/ui/index.tsx)
- config_only_file: component: index.tsx (packages/plugins/examples/plugin-hello-world-example/src/ui/index.tsx)
- config_only_file: component: index.tsx (packages/plugins/examples/plugin-kitchen-sink-example/src/ui/index.tsx)
- config_only_file: component: index.tsx (packages/plugins/examples/plugin-orchestration-smoke-example/src/ui/index.tsx)
- config_only_file: component: index.tsx (packages/plugins/plugin-llm-wiki/src/ui/index.tsx)
- config_only_file: component: index.tsx (packages/plugins/plugin-workspace-diff/src/ui/index.tsx)
- config_only_file: feature: index.ts (cli/src/adapters/http/index.ts)
- config_only_file: feature: index.ts (cli/src/adapters/index.ts)
- config_only_file: feature: index.ts (cli/src/adapters/process/index.ts)
- config_only_file: feature: index.ts (cli/src/checks/index.ts)
- config_only_file: feature: index.ts (cli/src/index.ts)
- config_only_file: feature: vitest.config.ts (cli/vitest.config.ts)
- config_only_file: feature: index.ts (packages/adapter-utils/src/index.ts)
- config_only_file: feature: index.ts (packages/adapters/acpx-local/src/cli/index.ts)
- config_only_file: feature: index.ts (packages/adapters/acpx-local/src/index.ts)
- config_only_file: feature: index.ts (packages/adapters/acpx-local/src/server/index.ts)
- config_only_file: feature: index.ts (packages/adapters/acpx-local/src/ui/index.ts)
- config_only_file: feature: vitest.config.ts (packages/adapters/acpx-local/vitest.config.ts)
- config_only_file: feature: index.ts (packages/adapters/claude-local/src/cli/index.ts)
- config_only_file: feature: index.ts (packages/adapters/claude-local/src/index.ts)
- config_only_file: feature: index.ts (packages/adapters/claude-local/src/server/index.ts)
- config_only_file: feature: index.ts (packages/adapters/claude-local/src/ui/index.ts)
- config_only_file: feature: vitest.config.ts (packages/adapters/claude-local/vitest.config.ts)
- config_only_file: feature: index.ts (packages/adapters/codex-local/src/cli/index.ts)
- config_only_file: feature: index.ts (packages/adapters/codex-local/src/index.ts)
- config_only_file: feature: index.ts (packages/adapters/codex-local/src/server/index.ts)
- config_only_file: feature: index.ts (packages/adapters/codex-local/src/ui/index.ts)
- config_only_file: feature: vitest.config.ts (packages/adapters/codex-local/vitest.config.ts)
- config_only_file: feature: index.ts (packages/adapters/cursor-cloud/src/cli/index.ts)
- config_only_file: feature: index.ts (packages/adapters/cursor-cloud/src/index.ts)
- config_only_file: feature: index.ts (packages/adapters/cursor-cloud/src/server/index.ts)
- config_only_file: feature: index.ts (packages/adapters/cursor-cloud/src/ui/index.ts)
- config_only_file: feature: index.ts (packages/adapters/cursor-local/src/cli/index.ts)
- config_only_file: feature: index.ts (packages/adapters/cursor-local/src/index.ts)
- config_only_file: feature: index.ts (packages/adapters/cursor-local/src/server/index.ts)
- config_only_file: feature: index.ts (packages/adapters/cursor-local/src/ui/index.ts)
- config_only_file: feature: index.ts (packages/adapters/gemini-local/src/cli/index.ts)
- config_only_file: feature: index.ts (packages/adapters/gemini-local/src/index.ts)
- config_only_file: feature: index.ts (packages/adapters/gemini-local/src/server/index.ts)

## Notes

- This is an inferred baseline. CTO/Docs Memory must promote or correct important relations.
- Curated graph coverage input: `C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/docs/graphs/architecture-graph.json` (covered paths: 0).
- Override input: `C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/docs/architecture/scanner-overrides.json` (entity entries: 5, relation entries: 52).
- Override summary: excluded files 0, entity overrides 5, relation overrides 52, critical entities tagged 5.
- `verified` still requires fresh command/browser/deploy evidence, not only file presence.