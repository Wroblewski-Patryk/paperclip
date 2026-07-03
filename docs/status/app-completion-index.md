# App Completion Index

Generated: 2026-07-03T01:26:03.470Z
Project: Paperclip
Root: C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse
Source graph: docs/graphs/architecture-awareness.json

## Purpose

This index turns architecture-awareness entities into user-facing completion lanes.
Agents use it to decide what to plan next: backend/API proof, frontend/browser proof, auth/subscription/configuration gates, exchange integration proof, or cleanup.

## Counts

- Items: 14205
- User flows: 8
- Needs browser/screenshot review: 425
- Missing test link: 10858
- Missing doc link: 2870
- Implemented, needs proof: 21
- Blocked: 0
- Known non-ok risk items: 14174
- Priority review items indexed: 200/14174
- Priority review truncated: true

## Flow Summary

- Unclassified user workflow: 12426 entities; risks {"ok":19,"missing_test_link":9517,"missing_doc_link":2497,"implemented_needs_proof":19,"needs_browser_review":374}; gates {"auth":87,"configuration":311}
- User configuration: 877 entities; risks {"missing_doc_link":147,"missing_test_link":701,"implemented_needs_proof":1,"needs_browser_review":28}; gates {"configuration":807,"auth":31}
- Account access: 561 entities; risks {"ok":9,"missing_test_link":370,"missing_doc_link":172,"implemented_needs_proof":1,"needs_browser_review":9}; gates {"auth":561,"configuration":37,"subscription":1}
- Trading operation: 143 entities; risks {"missing_test_link":126,"missing_doc_link":13,"needs_browser_review":4}; gates {"auth":2}
- Dashboard overview: 123 entities; risks {"missing_test_link":93,"missing_doc_link":23,"needs_browser_review":7}; gates {"configuration":21,"auth":3}
- Subscription and entitlement: 49 entities; risks {"missing_test_link":37,"missing_doc_link":9,"needs_browser_review":3}; gates {"subscription":49,"configuration":1}
- Admin operation: 17 entities; risks {"ok":3,"missing_test_link":9,"missing_doc_link":5}; gates {"auth":6}
- Exchange connection and configuration: 9 entities; risks {"missing_test_link":5,"missing_doc_link":4}; gates {"configuration":9}

## Priority Review Queue

| User flow | Risk | Kind | Entity | Owner | Path | Gates |
| --- | --- | --- | --- | --- | --- | --- |
| Account access | missing_test_link | api_endpoint | POST /agents/:id/claude-login | Backend Platform Lead | server/src/routes/agents.ts#/agents/:id/claude-login | auth |
| Account access | missing_test_link | api_endpoint | POST /agents/:id/runtime-state/reset-session | Backend Platform Lead | server/src/routes/agents.ts#/agents/:id/runtime-state/reset-session | auth |
| Account access | missing_test_link | api_endpoint | GET /agents/:id/task-sessions | Backend Platform Lead | server/src/routes/agents.ts#/agents/:id/task-sessions | auth |
| Account access | missing_test_link | api_endpoint | PATCH /profile | Backend Platform Lead | server/src/routes/auth.ts#/profile | auth |
| Account access | missing_doc_link | feature_or_capability | jsonResponse | Developer Experience Lead | cli/src/__tests__/auth-command-registration.test.ts#jsonResponse | auth |
| Account access | missing_doc_link | feature_or_capability | run | Developer Experience Lead | cli/src/__tests__/auth-command-registration.test.ts#run | auth |
| Account access | missing_doc_link | feature_or_capability | createTempAuthPath | Developer Experience Lead | cli/src/__tests__/board-auth.test.ts#createTempAuthPath | auth |
| Account access | missing_doc_link | feature_or_capability | deployment-auth-check.ts | Developer Experience Lead | cli/src/checks/deployment-auth-check.ts | auth |
| Account access | missing_doc_link | feature_or_capability | deploymentAuthCheck | Developer Experience Lead | cli/src/checks/deployment-auth-check.ts#deploymentAuthCheck | auth |
| Account access | missing_doc_link | feature_or_capability | board-auth.ts | Developer Experience Lead | cli/src/client/board-auth.ts | auth |
| Account access | missing_doc_link | feature_or_capability | defaultBoardAuthStore | Developer Experience Lead | cli/src/client/board-auth.ts#defaultBoardAuthStore | auth |
| Account access | missing_test_link | feature_or_capability | getStoredBoardCredential | Developer Experience Lead | cli/src/client/board-auth.ts#getStoredBoardCredential | auth, configuration |
| Account access | missing_test_link | feature_or_capability | loginBoardCli | Developer Experience Lead | cli/src/client/board-auth.ts#loginBoardCli | auth |
| Account access | missing_doc_link | feature_or_capability | normalizeApiBase | Developer Experience Lead | cli/src/client/board-auth.ts#normalizeApiBase | auth |
| Account access | missing_test_link | feature_or_capability | openUrl | Developer Experience Lead | cli/src/client/board-auth.ts#openUrl | auth |
| Account access | missing_test_link | feature_or_capability | readBoardAuthStore | Developer Experience Lead | cli/src/client/board-auth.ts#readBoardAuthStore | auth |
| Account access | missing_test_link | feature_or_capability | removeStoredBoardCredential | Developer Experience Lead | cli/src/client/board-auth.ts#removeStoredBoardCredential | auth, configuration |
| Account access | missing_test_link | feature_or_capability | requestJson | Developer Experience Lead | cli/src/client/board-auth.ts#requestJson | auth |
| Account access | missing_doc_link | feature_or_capability | resolveBoardAuthStorePath | Developer Experience Lead | cli/src/client/board-auth.ts#resolveBoardAuthStorePath | auth |
| Account access | missing_test_link | feature_or_capability | revokeStoredBoardCredential | Developer Experience Lead | cli/src/client/board-auth.ts#revokeStoredBoardCredential | auth, configuration |
| Account access | missing_test_link | feature_or_capability | setStoredBoardCredential | Developer Experience Lead | cli/src/client/board-auth.ts#setStoredBoardCredential | auth, configuration |
| Account access | missing_test_link | feature_or_capability | sleep | Developer Experience Lead | cli/src/client/board-auth.ts#sleep | auth |
| Account access | missing_doc_link | feature_or_capability | toStringOrNull | Developer Experience Lead | cli/src/client/board-auth.ts#toStringOrNull | auth |
| Account access | missing_test_link | feature_or_capability | writeBoardAuthStore | Developer Experience Lead | cli/src/client/board-auth.ts#writeBoardAuthStore | auth |
| Account access | missing_test_link | feature_or_capability | auth-bootstrap-ceo.ts | Developer Experience Lead | cli/src/commands/auth-bootstrap-ceo.ts | auth |
| Account access | missing_test_link | feature_or_capability | bootstrapCeoInvite | Developer Experience Lead | cli/src/commands/auth-bootstrap-ceo.ts#bootstrapCeoInvite | auth |
| Account access | missing_test_link | feature_or_capability | createInviteToken | Developer Experience Lead | cli/src/commands/auth-bootstrap-ceo.ts#createInviteToken | auth |
| Account access | missing_test_link | feature_or_capability | hashToken | Developer Experience Lead | cli/src/commands/auth-bootstrap-ceo.ts#hashToken | auth |
| Account access | missing_test_link | feature_or_capability | resolveBaseUrl | Developer Experience Lead | cli/src/commands/auth-bootstrap-ceo.ts#resolveBaseUrl | auth |
| Account access | missing_test_link | feature_or_capability | resolveDbUrl | Developer Experience Lead | cli/src/commands/auth-bootstrap-ceo.ts#resolveDbUrl | auth |
| Account access | missing_test_link | feature_or_capability | registerAccessCommands | Developer Experience Lead | cli/src/commands/client/access.ts#registerAccessCommands | auth |
| Account access | missing_test_link | feature_or_capability | registerActivityCommands | Developer Experience Lead | cli/src/commands/client/activity.ts#registerActivityCommands | auth |
| Account access | missing_test_link | feature_or_capability | registerAdapterCommands | Developer Experience Lead | cli/src/commands/client/adapter.ts#registerAdapterCommands | auth |
| Account access | missing_test_link | feature_or_capability | registerAgentCommands | Developer Experience Lead | cli/src/commands/client/agent.ts#registerAgentCommands | auth |
| Account access | missing_doc_link | feature_or_capability | registerApprovalCommands | Developer Experience Lead | cli/src/commands/client/approval.ts#registerApprovalCommands | auth |
| Account access | missing_test_link | feature_or_capability | registerAssetCommands | Developer Experience Lead | cli/src/commands/client/asset.ts#registerAssetCommands | auth |
| Account access | implemented_needs_proof | feature_or_capability | auth.ts | Developer Experience Lead | cli/src/commands/client/auth.ts | auth |
| Account access | missing_test_link | feature_or_capability | parseJson | Developer Experience Lead | cli/src/commands/client/auth.ts#parseJson | auth |
| Account access | missing_test_link | feature_or_capability | registerClientAuthCommands | Developer Experience Lead | cli/src/commands/client/auth.ts#registerClientAuthCommands | auth |
| Account access | missing_test_link | feature_or_capability | resolveChallengeToken | Developer Experience Lead | cli/src/commands/client/auth.ts#resolveChallengeToken | auth |
| Account access | missing_test_link | feature_or_capability | authorizeConnection | Developer Experience Lead | cli/src/commands/client/cloud.ts#authorizeConnection | auth |
| Account access | missing_test_link | feature_or_capability | authorizeWithBrowser | Developer Experience Lead | cli/src/commands/client/cloud.ts#authorizeWithBrowser | auth |
| Account access | missing_test_link | feature_or_capability | authorizeWithDeviceCode | Developer Experience Lead | cli/src/commands/client/cloud.ts#authorizeWithDeviceCode | auth |
| Account access | missing_test_link | feature_or_capability | registerCloudCommands | Developer Experience Lead | cli/src/commands/client/cloud.ts#registerCloudCommands | auth |
| Account access | missing_test_link | feature_or_capability | canAttemptInteractiveBoardAuth | Developer Experience Lead | cli/src/commands/client/common.ts#canAttemptInteractiveBoardAuth | auth |
| Account access | missing_test_link | feature_or_capability | shouldRecoverBoardAuth | Developer Experience Lead | cli/src/commands/client/common.ts#shouldRecoverBoardAuth | auth |
| Account access | missing_test_link | feature_or_capability | registerCompanyCommands | Developer Experience Lead | cli/src/commands/client/company.ts#registerCompanyCommands | auth |
| Account access | missing_doc_link | feature_or_capability | registerConnectCommand | Developer Experience Lead | cli/src/commands/client/connect.ts#registerConnectCommand | auth |
| Account access | missing_test_link | feature_or_capability | registerContextCommands | Developer Experience Lead | cli/src/commands/client/context.ts#registerContextCommands | auth |
| Account access | missing_test_link | feature_or_capability | registerCostCommands | Developer Experience Lead | cli/src/commands/client/cost.ts#registerCostCommands | auth |
| Account access | missing_test_link | feature_or_capability | registerDashboardCommands | Developer Experience Lead | cli/src/commands/client/dashboard.ts#registerDashboardCommands | auth |
| Account access | missing_doc_link | feature_or_capability | registerFeedbackCommands | Developer Experience Lead | cli/src/commands/client/feedback.ts#registerFeedbackCommands | auth |
| Account access | missing_test_link | feature_or_capability | registerGoalCommands | Developer Experience Lead | cli/src/commands/client/goal.ts#registerGoalCommands | auth |
| Account access | missing_test_link | feature_or_capability | registerIssueCommands | Developer Experience Lead | cli/src/commands/client/issue.ts#registerIssueCommands | auth |
| Account access | missing_test_link | feature_or_capability | registerPluginCommands | Developer Experience Lead | cli/src/commands/client/plugin.ts#registerPluginCommands | auth |
| Account access | missing_test_link | feature_or_capability | registerProjectCommands | Developer Experience Lead | cli/src/commands/client/project.ts#registerProjectCommands | auth |
| Account access | missing_doc_link | feature_or_capability | registerPromptCommands | Developer Experience Lead | cli/src/commands/client/prompt.ts#registerPromptCommands | auth |
| Account access | missing_doc_link | feature_or_capability | registerRoutineApiCommands | Developer Experience Lead | cli/src/commands/client/routine-api.ts#registerRoutineApiCommands | auth |
| Account access | missing_test_link | feature_or_capability | registerRunCommands | Developer Experience Lead | cli/src/commands/client/run.ts#registerRunCommands | auth |
| Account access | missing_test_link | feature_or_capability | registerSecretCommands | Developer Experience Lead | cli/src/commands/client/secrets.ts#registerSecretCommands | auth, configuration |
| Account access | missing_test_link | feature_or_capability | registerSkillCommands | Developer Experience Lead | cli/src/commands/client/skill.ts#registerSkillCommands | auth |
| Account access | missing_test_link | feature_or_capability | printCatalogInstallResult | Developer Experience Lead | cli/src/commands/client/skills.ts#printCatalogInstallResult | auth |
| Account access | missing_doc_link | feature_or_capability | registerAgentSkillCommands | Developer Experience Lead | cli/src/commands/client/skills.ts#registerAgentSkillCommands | auth |
| Account access | missing_doc_link | feature_or_capability | registerSkillsCommands | Developer Experience Lead | cli/src/commands/client/skills.ts#registerSkillsCommands | auth |
| Account access | missing_doc_link | feature_or_capability | registerTeamCommands | Developer Experience Lead | cli/src/commands/client/teams.ts#registerTeamCommands | auth |
| Account access | missing_test_link | feature_or_capability | registerTokenCommands | Developer Experience Lead | cli/src/commands/client/token.ts#registerTokenCommands | auth |
| Account access | missing_test_link | feature_or_capability | registerWorkspaceCommands | Developer Experience Lead | cli/src/commands/client/workspace.ts#registerWorkspaceCommands | auth |
| Account access | missing_test_link | feature_or_capability | registerEnvLabCommands | Developer Experience Lead | cli/src/commands/env-lab.ts#registerEnvLabCommands | auth |
| Account access | missing_test_link | feature_or_capability | registerRoutineCommands | Developer Experience Lead | cli/src/commands/routines.ts#registerRoutineCommands | auth |
| Account access | missing_test_link | feature_or_capability | registerWorktreeCommands | Developer Experience Lead | cli/src/commands/worktree.ts#registerWorktreeCommands | auth |
| Account access | missing_test_link | feature_or_capability | resolveDefaultCliAuthPath | Developer Experience Lead | cli/src/config/home.ts#resolveDefaultCliAuthPath | auth, configuration |
| Account access | missing_test_link | feature_or_capability | resolveOperationAuthLevel | Docs Memory Lead | doc/plans/2026-05-23-cli-api-parity-openapi-reference.ts#resolveOperationAuthLevel | auth |
| Account access | missing_test_link | feature_or_capability | adapterExecutionTargetSessionIdentity | Adapters Runtime Lead | packages/adapter-utils/src/execution-target.ts#adapterExecutionTargetSessionIdentity | auth |
| Account access | missing_test_link | feature_or_capability | adapterExecutionTargetSessionMatches | Adapters Runtime Lead | packages/adapter-utils/src/execution-target.ts#adapterExecutionTargetSessionMatches | auth |
| Account access | missing_test_link | feature_or_capability | buildRemoteExecutionSessionIdentity | Adapters Runtime Lead | packages/adapter-utils/src/remote-managed-runtime.ts#buildRemoteExecutionSessionIdentity | auth |
| Account access | missing_test_link | feature_or_capability | remoteExecutionSessionMatches | Adapters Runtime Lead | packages/adapter-utils/src/remote-managed-runtime.ts#remoteExecutionSessionMatches | auth |
| Account access | missing_test_link | feature_or_capability | authorizeSandboxCallbackBridgeRequestWithRoutes | Adapters Runtime Lead | packages/adapter-utils/src/sandbox-callback-bridge.ts#authorizeSandboxCallbackBridgeRequestWithRoutes | auth |
| Account access | missing_test_link | feature_or_capability | buildSandboxExecutionSessionIdentity | Adapters Runtime Lead | packages/adapter-utils/src/sandbox-managed-runtime.ts#buildSandboxExecutionSessionIdentity | auth |
| Account access | missing_test_link | feature_or_capability | sandboxExecutionSessionMatches | Adapters Runtime Lead | packages/adapter-utils/src/sandbox-managed-runtime.ts#sandboxExecutionSessionMatches | auth |
| Account access | missing_doc_link | feature_or_capability | session-compaction.ts | Adapters Runtime Lead | packages/adapter-utils/src/session-compaction.ts | auth |

## Agent Rule

A user-facing feature is not complete until the backend/API state, frontend route/component state, configuration/auth/subscription gates, tests, docs, and browser screenshot/clickthrough evidence are either verified or explicitly blocked with an owner/action.
