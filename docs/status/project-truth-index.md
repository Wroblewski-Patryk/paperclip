# Project Truth Index

Generated: 2026-08-23T00:03:39.837Z
Observed: 2026-08-23T00:03:48.955Z
Project: Paperclip
Status: gaps_require_routing
Source HEAD: 278a91d57ca1deb4480e7e5a6404e70c15b898a7
Source ahead/behind: 0/0
Deployed SHA: unknown

This is the routing surface agents should use before guessing whether an app works.

| Metric | Count |
| --- | ---: |
| appCompletionItems | 552 |
| eventChains | 6 |
| incompleteEventChains | 1 |
| runtimeFindings | 0 |
| criticalRuntimeFindings | 0 |
| appCompletionGaps | 8 |
| indexedAppCompletionGaps | 8 |
| knownAppCompletionRiskItems | 521 |
| appCompletionPriorityReviewItems | 200 |
| appCompletionPriorityReviewTruncated | true |
| operationalGateGaps | 3 |
| indexedGaps | 12 |
| totalGaps | 12 |

## First Gap

- high: Missing frontend layer(s) in event chain.
- Owner: CTO Architect + Engineering Delivery Lead
- Next action: Map frontend entities into this flow before claiming holistic status.

## Gaps

| Severity | Kind | Flow | Summary | Next owner |
| --- | --- | --- | --- | --- |
| high | event_chain_gap | Admin operation | Missing frontend layer(s) in event chain. | CTO Architect + Engineering Delivery Lead |
| medium | app_completion_gap | Account access | Account access has 3 item(s) with app-completion risk missing_doc_link. | Docs Memory Lead + Project Manager |
| medium | app_completion_gap | Account access | Account access has 5 item(s) with app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Admin operation | Admin operation has 3 item(s) with app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Dashboard overview | Dashboard overview has 5 item(s) with app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| high | app_completion_gap | Dashboard overview | Dashboard overview has 1 item(s) with app-completion risk needs_browser_review. | QA Regression Lead + Frontend Experience Lead |
| medium | app_completion_gap | Subscription and entitlement | Subscription and entitlement has 1 item(s) with app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow has 169 item(s) with app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow has 13 item(s) with app-completion risk missing_doc_link. | Docs Memory Lead + Project Manager |
| high | operational_gate_gap | - | deployment_identity: unknown | Project Manager |
| high | operational_gate_gap | - | event_chain_index: incomplete | Project Manager |
| high | operational_gate_gap | - | public_runtime_probe: unknown | Deployment Reliability Engineer |
