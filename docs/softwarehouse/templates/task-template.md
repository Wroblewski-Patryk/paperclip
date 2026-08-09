# Task Template

## Goal

## Expected output

## Project / Context

## Process class

## Related files / docs

## Definition of Ready

- goal:
- context:
- related files / docs:
- expected output:
- owner:
- acceptance criteria:
- constraints:
- risks:
- verification method:
- receiver / reviewer:

## Protected credential/account preflight

Contract marker: `protected-credential-proof:v1`.

Complete this section before protected convergence, recovery, observability, or
release-proof work starts. Do not request or store secret values.

- `taskRef`:
- `protectedAction`:
- `credentialProofOwner`:
- `environment`:
- `credentialOrAccountAlias`: name only
- `accessScope`: exact allowed operations
- `proofStatus`: cleared / blocked / not_applicable
- `proofRef`: value-free evidence reference and observation time; required when cleared
- `expiryOrRotationPath`:
- `leastPrivilegeUnblockAction`:
- `missingProof`: required when blocked
- `blockerIssue`: required when blocked
- `blockedTask`: exact dependent task; required when blocked
- `notApplicableReason`: required when not applicable

Check with
`pnpm softwarehouse:credential-proof-preflight -- <proof-record.json>`. If the
result is blocked, do not start the protected action; link the named blocker and
mark the dependent task blocked.

## Acceptance criteria

## Constraints

## Risks

## PDCA

- PLAN:
- DO:
- CHECK:
- ACT:

## Verification

## Receiver / reviewer

## In-review handoff (required when status is `in_review`)

- reviewer:
- decisionOptions:
- evidence:
- decisionTiming: deadline or next-check/cooldown
- nextOwner:
- typed interaction / execution participant: required when this decision controls follow-up work

## Work report

Use `docs/softwarehouse/templates/work-report-template.md` before closing the
issue.

## Status
