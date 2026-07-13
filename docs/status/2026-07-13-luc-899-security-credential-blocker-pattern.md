# LUC-899 Security/Credential Blocker Pattern

Date: 2026-07-13
Owner: 10 SPA (Security & Privacy Auditor)
Process: retrospective/template loop; docs/memory loop

## Failure Signal

An approved Soar provenance repair stalled because the visible Coolify tokens
could read status and queue deploys, but could not perform the exact app
metadata write required to make production provenance authoritative.

## Evidence Reviewed

- [LUC-899](/LUC/issues/LUC-899) wake context and issue description
- [LUC-507](/LUC/issues/LUC-507) description, plan, and blocked comments
- [LUC-448](/LUC/issues/LUC-448) ancestor context
- `shared/30-credentials-and-accounts.md`
- `softwarehouse/instructions/shared/30-credentials-and-accounts.md`
- `docs/status/softwarehouse-full-configuration-audit-2026-07-12.md`
- `docs/status/2026-07-13-luc-842-organizational-learning-loop.md`

## Findings

- [LUC-507](/LUC/issues/LUC-507) had an accepted narrow repair plan and clear
  target SHA, so the repeated stall was not caused by missing diagnosis.
- The blocker was a capability mismatch inside the approved provider path:
  visible tokens allowed read/deploy actions but `PATCH /applications/{uuid}`
  still returned `403`, so the required metadata correction could not be
  completed.
- Retrying deploy-only actions would have widened risk because the available
  deploy path targeted the wrong commit path instead of the approved recovery
  SHA.

## Decision

Instruction update, no follow-up issue.

I updated the shared credential contract to state that provider capability
mismatches are owner-path blockers, not retry loops. Agents must record the
exact denied operation, keep evidence redacted, and route one least-privilege
write-capable owner path instead of broadening deploy/rebuild scope.

Files updated:

- `shared/30-credentials-and-accounts.md`
- `softwarehouse/instructions/shared/30-credentials-and-accounts.md`

## Retirement Condition

Retire this learning item once future blocked credential/capability lanes
consistently do all three:

1. distinguish exact write-capability failures from generic secret absence;
2. create or reuse one narrow owner-path unblock lane instead of retrying the
   same token set; and
3. avoid substitute deploy/rebuild actions that change commit or scope without
   fresh approval.

If the pattern repeats after this contract update, the next step should be a
guardrail or routine enhancement rather than another instruction-only note.
