# Project Truth Index

Generated: 2026-07-02T16:46:27.036Z
Project: Paperclip
Status: gaps_require_routing

This is the routing surface agents should use before guessing whether an app works.

| Metric | Count |
| --- | ---: |
| appCompletionItems | 3597 |
| eventChains | 8 |
| incompleteEventChains | 1 |
| runtimeFindings | 0 |
| criticalRuntimeFindings | 0 |
| appCompletionGaps | 3593 |
| indexedAppCompletionGaps | 200 |
| knownAppCompletionRiskItems | 3593 |
| appCompletionPriorityReviewItems | 200 |
| appCompletionPriorityReviewTruncated | true |
| operationalGateGaps | 2 |
| indexedGaps | 203 |
| totalGaps | 3596 |

## First Gap

- high: Missing frontend layer(s) in event chain.
- Owner: CTO Architect + Engineering Delivery Lead
- Next action: Map frontend entities into this flow before claiming holistic status.

## Gaps

| Severity | Kind | Flow | Summary | Next owner |
| --- | --- | --- | --- | --- |
| high | event_chain_gap | Admin operation | Missing frontend layer(s) in event chain. | CTO Architect + Engineering Delivery Lead |
| medium | app_completion_gap | Account access | Account access: USE /api/auth has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: POST /cli-auth/challenges has app-completion risk implemented_needs_proof. | QA Regression Lead + Project Manager |
| medium | app_completion_gap | Account access | Account access: GET /cli-auth/challenges/:id has app-completion risk implemented_needs_proof. | QA Regression Lead + Project Manager |
| medium | app_completion_gap | Account access | Account access: POST /cli-auth/challenges/:id/approve has app-completion risk implemented_needs_proof. | QA Regression Lead + Project Manager |
| medium | app_completion_gap | Account access | Account access: POST /cli-auth/challenges/:id/cancel has app-completion risk implemented_needs_proof. | QA Regression Lead + Project Manager |
| medium | app_completion_gap | Account access | Account access: GET /cli-auth/me has app-completion risk implemented_needs_proof. | QA Regression Lead + Project Manager |
| medium | app_completion_gap | Account access | Account access: POST /cli-auth/revoke-current has app-completion risk implemented_needs_proof. | QA Regression Lead + Project Manager |
| medium | app_completion_gap | Account access | Account access: POST /agents/:id/claude-login has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: POST /agents/:id/runtime-state/reset-session has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: GET /agents/:id/task-sessions has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: GET /get-session has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: GET /profile has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: PATCH /profile has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: auth-command-registration.test.ts has app-completion risk missing_doc_link. | Docs Memory Lead + Project Manager |
| medium | app_completion_gap | Account access | Account access: jsonResponse has app-completion risk missing_doc_link. | Docs Memory Lead + Project Manager |
| medium | app_completion_gap | Account access | Account access: run has app-completion risk missing_doc_link. | Docs Memory Lead + Project Manager |
| medium | app_completion_gap | Account access | Account access: board-auth.test.ts has app-completion risk missing_doc_link. | Docs Memory Lead + Project Manager |
| medium | app_completion_gap | Account access | Account access: createTempAuthPath has app-completion risk missing_doc_link. | Docs Memory Lead + Project Manager |
| medium | app_completion_gap | Account access | Account access: deployment-auth-check.ts has app-completion risk missing_doc_link. | Docs Memory Lead + Project Manager |
| medium | app_completion_gap | Account access | Account access: deploymentAuthCheck has app-completion risk missing_doc_link. | Docs Memory Lead + Project Manager |
| medium | app_completion_gap | Account access | Account access: board-auth.ts has app-completion risk missing_doc_link. | Docs Memory Lead + Project Manager |
| medium | app_completion_gap | Account access | Account access: defaultBoardAuthStore has app-completion risk missing_doc_link. | Docs Memory Lead + Project Manager |
| medium | app_completion_gap | Account access | Account access: getStoredBoardCredential has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: loginBoardCli has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: normalizeApiBase has app-completion risk missing_doc_link. | Docs Memory Lead + Project Manager |
| medium | app_completion_gap | Account access | Account access: openUrl has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: readBoardAuthStore has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: removeStoredBoardCredential has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: requestJson has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: resolveBoardAuthStorePath has app-completion risk missing_doc_link. | Docs Memory Lead + Project Manager |
| medium | app_completion_gap | Account access | Account access: revokeStoredBoardCredential has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: setStoredBoardCredential has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: sleep has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: toStringOrNull has app-completion risk missing_doc_link. | Docs Memory Lead + Project Manager |
| medium | app_completion_gap | Account access | Account access: writeBoardAuthStore has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: auth-bootstrap-ceo.ts has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: bootstrapCeoInvite has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: createInviteToken has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: hashToken has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: resolveBaseUrl has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: resolveDbUrl has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: registerAccessCommands has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: registerActivityCommands has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: registerAdapterCommands has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: registerAgentCommands has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: registerApprovalCommands has app-completion risk missing_doc_link. | Docs Memory Lead + Project Manager |
| medium | app_completion_gap | Account access | Account access: registerAssetCommands has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: auth.ts has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: parseJson has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: registerClientAuthCommands has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: resolveChallengeToken has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: authorizeConnection has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: authorizeWithBrowser has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: authorizeWithDeviceCode has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: CloudAuthRequestError has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: registerCloudCommands has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: canAttemptInteractiveBoardAuth has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: shouldRecoverBoardAuth has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: registerCompanyCommands has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: registerConnectCommand has app-completion risk missing_doc_link. | Docs Memory Lead + Project Manager |
| medium | app_completion_gap | Account access | Account access: registerContextCommands has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: registerCostCommands has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: registerDashboardCommands has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: registerFeedbackCommands has app-completion risk missing_doc_link. | Docs Memory Lead + Project Manager |
| medium | app_completion_gap | Account access | Account access: registerGoalCommands has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: registerIssueCommands has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: registerPluginCommands has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: registerProjectCommands has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: registerPromptCommands has app-completion risk missing_doc_link. | Docs Memory Lead + Project Manager |
| medium | app_completion_gap | Account access | Account access: registerRoutineApiCommands has app-completion risk missing_doc_link. | Docs Memory Lead + Project Manager |
| medium | app_completion_gap | Account access | Account access: registerRunCommands has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: registerSecretCommands has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: registerSkillCommands has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: printCatalogInstallResult has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: registerAgentSkillCommands has app-completion risk missing_doc_link. | Docs Memory Lead + Project Manager |
| medium | app_completion_gap | Account access | Account access: registerSkillsCommands has app-completion risk missing_doc_link. | Docs Memory Lead + Project Manager |
| medium | app_completion_gap | Account access | Account access: registerTeamCommands has app-completion risk missing_doc_link. | Docs Memory Lead + Project Manager |
| medium | app_completion_gap | Account access | Account access: registerTokenCommands has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Account access | Account access: registerWorkspaceCommands has app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
