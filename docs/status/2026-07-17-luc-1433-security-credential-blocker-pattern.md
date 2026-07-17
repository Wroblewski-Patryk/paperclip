# LUC-1433 Security/Credential Blocker Pattern

Date: 2026-07-17
Owner: 10 SPA (Security & Privacy Auditor)
Process: organizational learning loop; security/privacy review

## Failure Signal

Soar production runtime recovery reached a protected Coolify Redis mutation step, but the available access proved read-only or session-incomplete, so agents could diagnose the exact failure and resource state without being able to perform the single least-privilege recovery action.

## Evidence Reviewed

- [LUC-1433](/LUC/issues/LUC-1433) issue description and related-work graph
- [LUC-1368](/LUC/issues/LUC-1368) description and blocked closeout comment dated 2026-07-17
- [LUC-1359](/LUC/issues/LUC-1359) description and blocker-routing comments dated 2026-07-17
- [LUC-1137](/LUC/issues/LUC-1137) blocked closeout comment dated 2026-07-14
- [LUC-972](/LUC/issues/LUC-972) protected credential-rotation gate comment dated 2026-07-15
- [docs/status/2026-07-13-luc-899-security-credential-blocker-pattern.md](/abs/path/C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/docs/status/2026-07-13-luc-899-security-credential-blocker-pattern.md)
- [shared/30-credentials-and-accounts.md](/abs/path/C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/.paperclip/runtime/home/instances/default/companies/ae26bb8b-8f5f-4a85-b341-78d4e1985975/agents/f31f69b9-5ff1-4041-a35c-356cae76031a/instructions/shared/30-credentials-and-accounts.md)

## Findings

- `LUC-1368` is not the same shape as the older `LUC-972` cluster. `LUC-972` is a board-owned credential-rotation gate with no legal agent-executable sub-lane left, while `LUC-1368` is a live runtime recovery gate with exact provider evidence for the denied mutation.
- The July 17 handling of `LUC-1368` already followed the July 13 credential contract correctly:
  - it recorded the exact denied operation (`POST /api/v1/databases/{redis}/restart -> 403 Missing required permissions: deploy`);
  - it kept evidence redacted and value-free;
  - it routed one narrow owner path instead of widening to broader deploy/rebuild actions.
- Because the issue was already handled correctly, a second instruction-only learning note would not close a new operating gap. The remaining gap is process noise: the learning loop still escalated a covered protected-gate pattern into another security learning issue instead of recognizing that the contract had already been satisfied.

## Decision

Routine update, with one follow-up issue.

No role-instruction update is needed in this heartbeat. The shared credential contract already says that provider capability mismatches are owner-path blockers, not retry loops.

The needed improvement is in the organizational learning loop: when a repeated protected-gate cluster already shows all of the following in the source blocker lane, the loop should treat it as covered and avoid opening another learning issue:

1. the exact denied provider mutation is named;
2. the evidence is redacted/value-free; and
3. the unblock path is a single least-privilege owner action, not a broader substitute deploy/rebuild path.

## Retirement Condition

Retire this learning item after the follow-up routine change is in place and a later learning-loop pass no longer opens a fresh security/credential learning issue for a blocker cluster that is already contract-compliant in the source protected-gate issue.

If a future cluster still repeats after that suppression logic exists, the next escalation should be a stronger guardrail or issue-template rule, not another duplicate learning note.
