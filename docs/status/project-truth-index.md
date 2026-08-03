# Project Truth Index

Generated: 2026-07-23T01:19:08.800Z
Project: Paperclip
Status: gaps_require_routing
Source HEAD: ed17f188629add20288e283a129b0b8f6f26f6de
Source ahead/behind: unknown/unknown
Deployed SHA: unknown

This is the routing surface agents should use before guessing whether an app works.

| Metric | Count |
| --- | ---: |
| appCompletionItems | 481 |
| eventChains | 8 |
| incompleteEventChains | 1 |
| runtimeFindings | 0 |
| criticalRuntimeFindings | 0 |
| appCompletionGaps | 450 |
| indexedAppCompletionGaps | 200 |
| knownAppCompletionRiskItems | 450 |
| appCompletionPriorityReviewItems | 200 |
| appCompletionPriorityReviewTruncated | true |
| operationalGateGaps | 5 |
| indexedGaps | 206 |
| totalGaps | 456 |

## First Gap

- high: Missing frontend layer(s) in event chain.
- Owner: CTO Architect + Engineering Delivery Lead
- Next action: Map frontend entities into this flow before claiming holistic status.

## Gaps

| Severity | Kind | Flow | Summary | Next owner |
| --- | --- | --- | --- | --- |
| high | event_chain_gap | Admin operation | Missing frontend layer(s) in event chain. | CTO Architect + Engineering Delivery Lead |
| medium | app_completion_gap | Account access | Account access: POST /agents/:id/claude-login has app-completion risk missing_doc_link. | Docs Memory Lead + Project Manager |
| medium | app_completion_gap | Account access | Account access: POST /agents/:id/runtime-state/reset-session has app-completion risk missing_doc_link. | Docs Memory Lead + Project Manager |
| medium | app_completion_gap | Account access | Account access: GET /agents/:id/task-sessions has app-completion risk missing_doc_link. | Docs Memory Lead + Project Manager |
| medium | app_completion_gap | Account access | Account access: GET /profile has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| high | app_completion_gap | Account access | Account access: Auth.tsx has app-completion risk needs_browser_review. | QA Regression Lead + Frontend Experience Lead |
| high | app_completion_gap | Account access | Account access: CliAuth.tsx has app-completion risk needs_browser_review. | QA Regression Lead + Frontend Experience Lead |
| medium | app_completion_gap | Admin operation | Admin operation: POST /admin/users/:userId/demote-instance-admin has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Admin operation | Admin operation: POST /admin/users/:userId/promote-instance-admin has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Admin operation | Admin operation: POST /issues/:id/admin/force-release has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Dashboard overview | Dashboard overview: GET /companies/:companyId/budgets/overview has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Dashboard overview | Dashboard overview: GET /companies/:companyId/dashboard has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Dashboard overview | Dashboard overview: GET /companies/:companyId/situation has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Dashboard overview | Dashboard overview: GET /plugins/:pluginId/dashboard has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| high | app_completion_gap | Dashboard overview | Dashboard overview: ProjectDeliveryOverview.tsx has app-completion risk needs_browser_review. | QA Regression Lead + Frontend Experience Lead |
| high | app_completion_gap | Dashboard overview | Dashboard overview: Dashboard.tsx has app-completion risk needs_browser_review. | QA Regression Lead + Frontend Experience Lead |
| high | app_completion_gap | Dashboard overview | Dashboard overview: DashboardLive.tsx has app-completion risk needs_browser_review. | QA Regression Lead + Frontend Experience Lead |
| medium | app_completion_gap | Subscription and entitlement | Subscription and entitlement: POST /issues/:id/checkout has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Trading operation | Trading operation: GET /issues/:id/accepted-plan-decompositions has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Trading operation | Trading operation: POST /issues/:id/accepted-plan-decompositions has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: USE /assets has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: POST /bootstrap/claim has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: POST /companies/:companyId/join-requests/:requestId/approve has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: POST /companies/:companyId/join-requests/:requestId/reject has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: POST /companies/:companyId/members/:memberId/archive has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: PATCH /companies/:companyId/members/:memberId/permissions has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: PATCH /companies/:companyId/members/:memberId/role-and-grants has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: POST /invites/:inviteId/revoke has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: GET /invites/:token/skills/:skillName has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: GET /invites/:token/skills/index has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: GET /skills/available has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: GET /companies/:companyId/activity has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: POST /companies/:companyId/activity has app-completion risk missing_doc_link. | Docs Memory Lead + Project Manager |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: GET /heartbeat-runs/:runId/issues has app-completion risk missing_doc_link. | Docs Memory Lead + Project Manager |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: GET /issues/:id/activity has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: GET /issues/:id/runs has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: GET /adapters has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: DELETE /adapters/:type has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: PATCH /adapters/:type has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: PATCH /adapters/:type/override has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: POST /adapters/:type/reinstall has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: POST /adapters/:type/reload has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: GET /adapters/:type/ui-parser.js has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: POST /adapters/install has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: DELETE /agents/:id has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: GET /agents/:id has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: PATCH /agents/:id has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: POST /agents/:id/approve has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: POST /agents/:id/heartbeat/invoke has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: GET /agents/:id/instructions-bundle has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: PATCH /agents/:id/instructions-bundle has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: DELETE /agents/:id/instructions-bundle/file has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: GET /agents/:id/instructions-bundle/file has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: PUT /agents/:id/instructions-bundle/file has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: PATCH /agents/:id/instructions-path has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: GET /agents/:id/keys has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: POST /agents/:id/keys has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: DELETE /agents/:id/keys/:keyId has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: POST /agents/:id/pause has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: PATCH /agents/:id/permissions has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: POST /agents/:id/resume has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: GET /agents/:id/runtime-state has app-completion risk missing_doc_link. | Docs Memory Lead + Project Manager |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: GET /agents/:id/skills has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: POST /agents/:id/skills/sync has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: POST /agents/:id/terminate has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: POST /agents/:id/wakeup has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: GET /agents/me has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: GET /agents/me/inbox-lite has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: GET /agents/me/inbox/mine has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: GET /companies/:companyId/adapters/:type/detect-model has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: GET /companies/:companyId/adapters/:type/models has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: POST /companies/:companyId/adapters/:type/test-environment has app-completion risk missing_doc_link. | Docs Memory Lead + Project Manager |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: POST /companies/:companyId/agent-hires has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: GET /companies/:companyId/agents has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: POST /companies/:companyId/agents has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: GET /companies/:companyId/heartbeat-runs has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: GET /companies/:companyId/live-runs has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: GET /companies/:companyId/org has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: GET /companies/:companyId/org.png has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow: GET /companies/:companyId/org.svg has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
