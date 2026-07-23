# App Completion Index

Generated: 2026-07-23T01:19:08.800Z
Project: Paperclip
Root: C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse
Source graph: docs/graphs/architecture-awareness.json

## Purpose

This index turns architecture-awareness entities into user-facing completion lanes.
Agents use it to decide what to plan next: backend/API proof, frontend/browser proof, auth/subscription/configuration gates, exchange integration proof, or cleanup.
Internal functions and modules are implementation details: they receive proof through their owning product boundary and are not dispatched as one issue per symbol.

## Counts

- Items: 481
- User flows: 7
- Needs browser/screenshot review: 72
- Missing test link: 352
- Missing doc link: 25
- Implemented, needs proof: 1
- Blocked: 0
- Known non-ok risk items: 450
- Priority review items indexed: 200/450
- Priority review truncated: true

## Flow Summary

- Unclassified user workflow: 413 entities; risks {"ok":19,"missing_test_link":314,"missing_doc_link":20,"implemented_needs_proof":1,"needs_browser_review":59}; gates {"auth":1,"configuration":15}
- User configuration: 37 entities; risks {"missing_doc_link":2,"missing_test_link":27,"needs_browser_review":8}; gates {"configuration":33,"auth":2}
- Account access: 15 entities; risks {"ok":9,"missing_doc_link":3,"missing_test_link":1,"needs_browser_review":2}; gates {"auth":15}
- Dashboard overview: 7 entities; risks {"missing_test_link":4,"needs_browser_review":3}; gates {}
- Admin operation: 6 entities; risks {"ok":3,"missing_test_link":3}; gates {"auth":5}
- Trading operation: 2 entities; risks {"missing_test_link":2}; gates {}
- Subscription and entitlement: 1 entities; risks {"missing_test_link":1}; gates {"subscription":1}

## Priority Review Queue

| User flow | Risk | Kind | Entity | Owner | Path | Gates |
| --- | --- | --- | --- | --- | --- | --- |
| Account access | missing_doc_link | api_endpoint | POST /agents/:id/claude-login | Backend Platform Lead | server/src/routes/agents.ts#/agents/:id/claude-login | auth |
| Account access | missing_doc_link | api_endpoint | POST /agents/:id/runtime-state/reset-session | Backend Platform Lead | server/src/routes/agents.ts#/agents/:id/runtime-state/reset-session | auth |
| Account access | missing_doc_link | api_endpoint | GET /agents/:id/task-sessions | Backend Platform Lead | server/src/routes/agents.ts#/agents/:id/task-sessions | auth |
| Account access | missing_test_link | api_endpoint | GET /profile | Backend Platform Lead | server/src/routes/auth.ts#/profile | auth |
| Account access | needs_browser_review | screen_or_route | Auth.tsx | Frontend Experience Lead | ui/src/pages/Auth.tsx | auth |
| Account access | needs_browser_review | screen_or_route | CliAuth.tsx | Frontend Experience Lead | ui/src/pages/CliAuth.tsx | auth |
| Admin operation | missing_test_link | api_endpoint | POST /admin/users/:userId/demote-instance-admin | Backend Platform Lead | server/src/routes/access.ts#/admin/users/:userId/demote-instance-admin | auth |
| Admin operation | missing_test_link | api_endpoint | POST /admin/users/:userId/promote-instance-admin | Backend Platform Lead | server/src/routes/access.ts#/admin/users/:userId/promote-instance-admin | auth |
| Admin operation | missing_test_link | api_endpoint | POST /issues/:id/admin/force-release | Backend Platform Lead | server/src/routes/issues.ts#/issues/:id/admin/force-release | - |
| Dashboard overview | missing_test_link | api_endpoint | GET /companies/:companyId/budgets/overview | Backend Platform Lead | server/src/routes/costs.ts#/companies/:companyId/budgets/overview | - |
| Dashboard overview | missing_test_link | api_endpoint | GET /companies/:companyId/dashboard | Backend Platform Lead | server/src/routes/dashboard.ts#/companies/:companyId/dashboard | - |
| Dashboard overview | missing_test_link | api_endpoint | GET /companies/:companyId/situation | Backend Platform Lead | server/src/routes/dashboard.ts#/companies/:companyId/situation | - |
| Dashboard overview | missing_test_link | api_endpoint | GET /plugins/:pluginId/dashboard | Backend Platform Lead | server/src/routes/plugins.ts#/plugins/:pluginId/dashboard | - |
| Dashboard overview | needs_browser_review | screen_or_route | ProjectDeliveryOverview.tsx | Frontend Experience Lead | ui/src/components/ProjectDeliveryOverview.tsx | - |
| Dashboard overview | needs_browser_review | screen_or_route | Dashboard.tsx | Frontend Experience Lead | ui/src/pages/Dashboard.tsx | - |
| Dashboard overview | needs_browser_review | screen_or_route | DashboardLive.tsx | Frontend Experience Lead | ui/src/pages/DashboardLive.tsx | - |
| Subscription and entitlement | missing_test_link | api_endpoint | POST /issues/:id/checkout | Backend Platform Lead | server/src/routes/issues.ts#/issues/:id/checkout | subscription |
| Trading operation | missing_test_link | api_endpoint | GET /issues/:id/accepted-plan-decompositions | Backend Platform Lead | server/src/routes/issues.ts#/issues/:id/accepted-plan-decompositions | - |
| Trading operation | missing_test_link | api_endpoint | POST /issues/:id/accepted-plan-decompositions | Backend Platform Lead | server/src/routes/issues.ts#/issues/:id/accepted-plan-decompositions | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /assets | Backend Platform Lead | server/src/app.ts#/assets | - |
| Unclassified user workflow | missing_test_link | api_endpoint | POST /bootstrap/claim | Backend Platform Lead | server/src/routes/access.ts#/bootstrap/claim | - |
| Unclassified user workflow | missing_test_link | api_endpoint | POST /companies/:companyId/join-requests/:requestId/approve | Backend Platform Lead | server/src/routes/access.ts#/companies/:companyId/join-requests/:requestId/approve | - |
| Unclassified user workflow | missing_test_link | api_endpoint | POST /companies/:companyId/join-requests/:requestId/reject | Backend Platform Lead | server/src/routes/access.ts#/companies/:companyId/join-requests/:requestId/reject | - |
| Unclassified user workflow | missing_test_link | api_endpoint | POST /companies/:companyId/members/:memberId/archive | Backend Platform Lead | server/src/routes/access.ts#/companies/:companyId/members/:memberId/archive | - |
| Unclassified user workflow | missing_test_link | api_endpoint | PATCH /companies/:companyId/members/:memberId/permissions | Backend Platform Lead | server/src/routes/access.ts#/companies/:companyId/members/:memberId/permissions | - |
| Unclassified user workflow | missing_test_link | api_endpoint | PATCH /companies/:companyId/members/:memberId/role-and-grants | Backend Platform Lead | server/src/routes/access.ts#/companies/:companyId/members/:memberId/role-and-grants | - |
| Unclassified user workflow | missing_test_link | api_endpoint | POST /invites/:inviteId/revoke | Backend Platform Lead | server/src/routes/access.ts#/invites/:inviteId/revoke | - |
| Unclassified user workflow | missing_test_link | api_endpoint | GET /invites/:token/skills/:skillName | Backend Platform Lead | server/src/routes/access.ts#/invites/:token/skills/:skillName | - |
| Unclassified user workflow | missing_test_link | api_endpoint | GET /invites/:token/skills/index | Backend Platform Lead | server/src/routes/access.ts#/invites/:token/skills/index | - |
| Unclassified user workflow | missing_test_link | api_endpoint | GET /skills/available | Backend Platform Lead | server/src/routes/access.ts#/skills/available | - |
| Unclassified user workflow | missing_test_link | api_endpoint | GET /companies/:companyId/activity | Backend Platform Lead | server/src/routes/activity.ts#/companies/:companyId/activity | - |
| Unclassified user workflow | missing_doc_link | api_endpoint | POST /companies/:companyId/activity | Backend Platform Lead | server/src/routes/activity.ts#/companies/:companyId/activity | - |
| Unclassified user workflow | missing_doc_link | api_endpoint | GET /heartbeat-runs/:runId/issues | Backend Platform Lead | server/src/routes/activity.ts#/heartbeat-runs/:runId/issues | - |
| Unclassified user workflow | missing_test_link | api_endpoint | GET /issues/:id/activity | Backend Platform Lead | server/src/routes/activity.ts#/issues/:id/activity | - |
| Unclassified user workflow | missing_test_link | api_endpoint | GET /issues/:id/runs | Backend Platform Lead | server/src/routes/activity.ts#/issues/:id/runs | - |
| Unclassified user workflow | missing_test_link | api_endpoint | GET /adapters | Backend Platform Lead | server/src/routes/adapters.ts#/adapters | - |
| Unclassified user workflow | missing_test_link | api_endpoint | DELETE /adapters/:type | Backend Platform Lead | server/src/routes/adapters.ts#/adapters/:type | - |
| Unclassified user workflow | missing_test_link | api_endpoint | PATCH /adapters/:type | Backend Platform Lead | server/src/routes/adapters.ts#/adapters/:type | - |
| Unclassified user workflow | missing_test_link | api_endpoint | PATCH /adapters/:type/override | Backend Platform Lead | server/src/routes/adapters.ts#/adapters/:type/override | - |
| Unclassified user workflow | missing_test_link | api_endpoint | POST /adapters/:type/reinstall | Backend Platform Lead | server/src/routes/adapters.ts#/adapters/:type/reinstall | - |
| Unclassified user workflow | missing_test_link | api_endpoint | POST /adapters/:type/reload | Backend Platform Lead | server/src/routes/adapters.ts#/adapters/:type/reload | - |
| Unclassified user workflow | missing_test_link | api_endpoint | GET /adapters/:type/ui-parser.js | Backend Platform Lead | server/src/routes/adapters.ts#/adapters/:type/ui-parser.js | - |
| Unclassified user workflow | missing_test_link | api_endpoint | POST /adapters/install | Backend Platform Lead | server/src/routes/adapters.ts#/adapters/install | - |
| Unclassified user workflow | missing_test_link | api_endpoint | DELETE /agents/:id | Backend Platform Lead | server/src/routes/agents.ts#/agents/:id | - |
| Unclassified user workflow | missing_test_link | api_endpoint | GET /agents/:id | Backend Platform Lead | server/src/routes/agents.ts#/agents/:id | - |
| Unclassified user workflow | missing_test_link | api_endpoint | PATCH /agents/:id | Backend Platform Lead | server/src/routes/agents.ts#/agents/:id | - |
| Unclassified user workflow | missing_test_link | api_endpoint | POST /agents/:id/approve | Backend Platform Lead | server/src/routes/agents.ts#/agents/:id/approve | - |
| Unclassified user workflow | missing_test_link | api_endpoint | POST /agents/:id/heartbeat/invoke | Backend Platform Lead | server/src/routes/agents.ts#/agents/:id/heartbeat/invoke | - |
| Unclassified user workflow | missing_test_link | api_endpoint | GET /agents/:id/instructions-bundle | Backend Platform Lead | server/src/routes/agents.ts#/agents/:id/instructions-bundle | - |
| Unclassified user workflow | missing_test_link | api_endpoint | PATCH /agents/:id/instructions-bundle | Backend Platform Lead | server/src/routes/agents.ts#/agents/:id/instructions-bundle | - |
| Unclassified user workflow | missing_test_link | api_endpoint | DELETE /agents/:id/instructions-bundle/file | Backend Platform Lead | server/src/routes/agents.ts#/agents/:id/instructions-bundle/file | - |
| Unclassified user workflow | missing_test_link | api_endpoint | GET /agents/:id/instructions-bundle/file | Backend Platform Lead | server/src/routes/agents.ts#/agents/:id/instructions-bundle/file | - |
| Unclassified user workflow | missing_test_link | api_endpoint | PUT /agents/:id/instructions-bundle/file | Backend Platform Lead | server/src/routes/agents.ts#/agents/:id/instructions-bundle/file | - |
| Unclassified user workflow | missing_test_link | api_endpoint | PATCH /agents/:id/instructions-path | Backend Platform Lead | server/src/routes/agents.ts#/agents/:id/instructions-path | - |
| Unclassified user workflow | missing_test_link | api_endpoint | GET /agents/:id/keys | Backend Platform Lead | server/src/routes/agents.ts#/agents/:id/keys | - |
| Unclassified user workflow | missing_test_link | api_endpoint | POST /agents/:id/keys | Backend Platform Lead | server/src/routes/agents.ts#/agents/:id/keys | - |
| Unclassified user workflow | missing_test_link | api_endpoint | DELETE /agents/:id/keys/:keyId | Backend Platform Lead | server/src/routes/agents.ts#/agents/:id/keys/:keyId | - |
| Unclassified user workflow | missing_test_link | api_endpoint | POST /agents/:id/pause | Backend Platform Lead | server/src/routes/agents.ts#/agents/:id/pause | - |
| Unclassified user workflow | missing_test_link | api_endpoint | PATCH /agents/:id/permissions | Backend Platform Lead | server/src/routes/agents.ts#/agents/:id/permissions | - |
| Unclassified user workflow | missing_test_link | api_endpoint | POST /agents/:id/resume | Backend Platform Lead | server/src/routes/agents.ts#/agents/:id/resume | - |
| Unclassified user workflow | missing_doc_link | api_endpoint | GET /agents/:id/runtime-state | Backend Platform Lead | server/src/routes/agents.ts#/agents/:id/runtime-state | - |
| Unclassified user workflow | missing_test_link | api_endpoint | GET /agents/:id/skills | Backend Platform Lead | server/src/routes/agents.ts#/agents/:id/skills | - |
| Unclassified user workflow | missing_test_link | api_endpoint | POST /agents/:id/skills/sync | Backend Platform Lead | server/src/routes/agents.ts#/agents/:id/skills/sync | - |
| Unclassified user workflow | missing_test_link | api_endpoint | POST /agents/:id/terminate | Backend Platform Lead | server/src/routes/agents.ts#/agents/:id/terminate | - |
| Unclassified user workflow | missing_test_link | api_endpoint | POST /agents/:id/wakeup | Backend Platform Lead | server/src/routes/agents.ts#/agents/:id/wakeup | - |
| Unclassified user workflow | missing_test_link | api_endpoint | GET /agents/me | Backend Platform Lead | server/src/routes/agents.ts#/agents/me | - |
| Unclassified user workflow | missing_test_link | api_endpoint | GET /agents/me/inbox-lite | Backend Platform Lead | server/src/routes/agents.ts#/agents/me/inbox-lite | - |
| Unclassified user workflow | missing_test_link | api_endpoint | GET /agents/me/inbox/mine | Backend Platform Lead | server/src/routes/agents.ts#/agents/me/inbox/mine | - |
| Unclassified user workflow | missing_test_link | api_endpoint | GET /companies/:companyId/adapters/:type/detect-model | Backend Platform Lead | server/src/routes/agents.ts#/companies/:companyId/adapters/:type/detect-model | - |
| Unclassified user workflow | missing_test_link | api_endpoint | GET /companies/:companyId/adapters/:type/models | Backend Platform Lead | server/src/routes/agents.ts#/companies/:companyId/adapters/:type/models | - |
| Unclassified user workflow | missing_doc_link | api_endpoint | POST /companies/:companyId/adapters/:type/test-environment | Backend Platform Lead | server/src/routes/agents.ts#/companies/:companyId/adapters/:type/test-environment | - |
| Unclassified user workflow | missing_test_link | api_endpoint | POST /companies/:companyId/agent-hires | Backend Platform Lead | server/src/routes/agents.ts#/companies/:companyId/agent-hires | - |
| Unclassified user workflow | missing_test_link | api_endpoint | GET /companies/:companyId/agents | Backend Platform Lead | server/src/routes/agents.ts#/companies/:companyId/agents | - |
| Unclassified user workflow | missing_test_link | api_endpoint | POST /companies/:companyId/agents | Backend Platform Lead | server/src/routes/agents.ts#/companies/:companyId/agents | - |
| Unclassified user workflow | missing_test_link | api_endpoint | GET /companies/:companyId/heartbeat-runs | Backend Platform Lead | server/src/routes/agents.ts#/companies/:companyId/heartbeat-runs | - |
| Unclassified user workflow | missing_test_link | api_endpoint | GET /companies/:companyId/live-runs | Backend Platform Lead | server/src/routes/agents.ts#/companies/:companyId/live-runs | - |
| Unclassified user workflow | missing_test_link | api_endpoint | GET /companies/:companyId/org | Backend Platform Lead | server/src/routes/agents.ts#/companies/:companyId/org | - |
| Unclassified user workflow | missing_test_link | api_endpoint | GET /companies/:companyId/org.png | Backend Platform Lead | server/src/routes/agents.ts#/companies/:companyId/org.png | - |
| Unclassified user workflow | missing_test_link | api_endpoint | GET /companies/:companyId/org.svg | Backend Platform Lead | server/src/routes/agents.ts#/companies/:companyId/org.svg | - |
| Unclassified user workflow | missing_test_link | api_endpoint | GET /heartbeat-runs/:runId | Backend Platform Lead | server/src/routes/agents.ts#/heartbeat-runs/:runId | - |

## Agent Rule

A user-facing feature is not complete until the backend/API state, frontend route/component state, configuration/auth/subscription gates, tests, docs, and browser screenshot/clickthrough evidence are either verified or explicitly blocked with an owner/action.
