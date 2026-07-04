# Softwarehouse Standard Stack

Last updated: 2026-07-04

The owner initially named APQC/PCF, MECE, PDCA, and Kanban as required
standards. The complementary Stage 1 stack is broader but lightweight:

- APQC/PCF-style process map for department/process coverage.
- MECE for parent/child decomposition.
- Kanban for Paperclip issue/task board flow and WIP limits.
- PDCA for continuous improvement.
- RACI/DACI-lite for accountability and decision clarity.
- Definition of Ready and Definition of Done for start/finish quality.
- ADR/RFC-lite for durable technical/product decisions.
- C4/traceability-lite for cross-layer app understanding.
- DevOps/DORA/SRE-lite for release, reliability, rollback, and recovery.
- OWASP ASVS/SAMM plus least privilege for security and secrets.
- ITIL-inspired incident/problem/change separation for operational recovery.
- Value-stream/no-waste review for cost, token, cycle-time, and stale-work
  reduction.

Use this stack as a diagnostic map, not bureaucracy. If a standard does not
reduce ambiguity, risk, cost, or delivery friction, do not add ceremony.

Current incident learning from `LUC-61`: Paperclip comments can act as wake
signals. Operator finalization comments on blocked/done work can accidentally
reopen a terminal issue and start a run. The safe pattern is:

1. Prefer status updates, documents, work products, or explicit no-continuation
   paths for finalization.
2. If an accidental wake starts, cancel the unintended run, restore the issue
   state, and resume the agent if it entered error.
3. Record the learning in durable process docs instead of adding repeated
   comments to the same terminal issue.
