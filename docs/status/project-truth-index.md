# Project Truth Index

Generated: 2026-08-03T14:48:09.744Z
Observed: 2026-08-10T03:29:58.013Z
Project: Paperclip
Status: gaps_require_routing
Source HEAD: 7dead1c7826f7185e199909af9de7df5cd1d6337
Source ahead/behind: unknown/unknown
Deployed SHA: unknown

This is the routing surface agents should use before guessing whether an app works.

| Metric | Count |
| --- | ---: |
| appCompletionItems | 492 |
| eventChains | 7 |
| incompleteEventChains | 2 |
| runtimeFindings | 0 |
| criticalRuntimeFindings | 0 |
| appCompletionGaps | 10 |
| indexedAppCompletionGaps | 10 |
| knownAppCompletionRiskItems | 461 |
| appCompletionPriorityReviewItems | 200 |
| appCompletionPriorityReviewTruncated | true |
| operationalGateGaps | 5 |
| indexedGaps | 17 |
| totalGaps | 17 |

## First Gap

- high: Missing frontend layer(s) in event chain.
- Owner: CTO Architect + Engineering Delivery Lead
- Next action: Map frontend entities into this flow before claiming holistic status.

## Gaps

| Severity | Kind | Flow | Summary | Next owner |
| --- | --- | --- | --- | --- |
| high | event_chain_gap | Admin operation | Missing frontend layer(s) in event chain. | CTO Architect + Engineering Delivery Lead |
| high | event_chain_gap | Trading operation | Missing frontend, backend, worker layer(s) in event chain. | CTO Architect + Engineering Delivery Lead |
| medium | app_completion_gap | Account access | Account access has 3 item(s) with app-completion risk missing_doc_link. | Docs Memory Lead + Project Manager |
| medium | app_completion_gap | Account access | Account access has 1 item(s) with app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| high | app_completion_gap | Account access | Account access has 2 item(s) with app-completion risk needs_browser_review. | QA Regression Lead + Frontend Experience Lead |
| medium | app_completion_gap | Admin operation | Admin operation has 3 item(s) with app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Dashboard overview | Dashboard overview has 4 item(s) with app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| high | app_completion_gap | Dashboard overview | Dashboard overview has 3 item(s) with app-completion risk needs_browser_review. | QA Regression Lead + Frontend Experience Lead |
| medium | app_completion_gap | Subscription and entitlement | Subscription and entitlement has 1 item(s) with app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Trading operation | Trading operation has 2 item(s) with app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow has 167 item(s) with app-completion risk missing_test_link. | Test Automation Engineer + QA Regression Lead |
| medium | app_completion_gap | Unclassified user workflow | Unclassified user workflow has 14 item(s) with app-completion risk missing_doc_link. | Docs Memory Lead + Project Manager |
| high | operational_gate_gap | - | source_freshness: stale | Project Manager |
| high | operational_gate_gap | - | release_branch_alignment: unknown | Project Manager |
| high | operational_gate_gap | - | deployment_identity: unknown | Project Manager |
| high | operational_gate_gap | - | event_chain_index: incomplete | Project Manager |
| high | operational_gate_gap | - | public_runtime_probe: unknown | Deployment Reliability Engineer |
