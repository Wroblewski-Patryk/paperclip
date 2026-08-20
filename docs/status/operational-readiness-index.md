# Operational Readiness Index

Generated: 2026-08-20T17:40:38.175Z
Project: Paperclip
Status: truth_incomplete

| Gate | Status | Required for |
| --- | --- | --- |
| source_freshness | fresh | current project truth rather than historical evidence |
| release_branch_alignment | diverged | an exact source release candidate |
| deployment_identity | unknown | proof that the owner-visible runtime matches source |
| architecture_exports | present | cross-layer ownership and dependency tracing |
| app_completion_index | present | user-flow works/fails/unknown classification |
| event_chain_index | incomplete | backend/frontend/worker impact analysis |
| runtime_error_index | covered | agent-owned bug discovery and repair routing |
| app_completion_risk_index | gaps_indexed | user-facing flow verification across frontend, backend, tests, docs, auth/config, and browser proof |
| public_runtime_probe | unknown | production parity with local behavior |
