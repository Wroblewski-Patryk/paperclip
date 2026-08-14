# Release Checklist

## Target

- Release id / issue:
- Project:
- Environment:
- Resource or resource group:

## Source branch / SHA

- Branch:
- Exact source SHA:
- Push status: not needed / pending / pushed / blocked
- Source ref available to deploy target: yes / no / not applicable
## Execution-ready preflight (fail closed)

Before a release or deploy issue may enter execution-ready status, all four
fields below are mandatory. An empty, abbreviated, stale, or unverifiable value
keeps the issue blocked:

- Exact candidate SHA: full immutable Git SHA (`candidateSha`)
- Packet owner: exactly one accountable deploy/rollback owner (`unblockOwner`)
- Protected-gate authorization: named contract, status, and evidence reference
  (`protectedGateContract`, `protectedGateStatus`, `protectedGateEvidenceRef`)
- Verification/monitoring path: executable fresh verification evidence tied to
  the same candidate (`freshVerificationEvidence`, `verifiedCandidateSha`,
  `verifiedAt`, `verificationMaxAgeHours`)

This guardrail carries forward the closure lesson from LUC-2359. Run the
release-blocker preflight before opening dependent implementation, QA, or deploy
lanes; rejection is the expected result for an incomplete packet.

## Release blocker closure preflight

Contract marker: `release-blocker-closure:v1`.

Complete and run this packet before dependent implementation or QA lanes open.
The command is
`pnpm softwarehouse:release-blocker-preflight -- <closure-packet.json>` and the
gate must fail closed unless it returns `mayOpenDependentLanes: true`.

- `blockerRef`:
- `unblockOwner`: exactly one accountable owner
- `candidateSha`: full exact Git SHA
- `candidateParentSha`: full distinct parent SHA
- `sourceRepository`:
- `sourceBranch`:
- `targetEnvironment`:
- `lineageEvidenceRef`: value-free candidate/parent proof
- `protectedGateContract`:
- `protectedGateStatus`: cleared / blocked
- `protectedGateEvidenceRef`:
- `rollbackPath`:
- `rollbackOwner`:
- `freshVerificationEvidence`:
- `verifiedCandidateSha`: must equal `candidateSha`
- `verifiedAt`:
- `verificationMaxAgeHours`:
- `dependentLaneRefs`: exact implementation/QA issue references held by this gate

## Build result

- Command:
- Result:
- Evidence:

## Test result

- Command:
- Result:
- Evidence:

## Env / secrets check

Contract marker: `protected-credential-proof:v1`.

Do not request or store secret values. For protected release proof, run
`pnpm softwarehouse:credential-proof-preflight -- <proof-record.json>` and
record:

- Required env vars / secret refs checked:
- Secret values exposed: no
- Missing or blocked bindings:
- `taskRef`:
- `protectedAction`: release proof
- `credentialProofOwner`:
- `environment`:
- `credentialOrAccountAlias`: name only
- `accessScope`:
- `proofStatus`: cleared / blocked / not_applicable
- `proofRef`: value-free evidence reference and observation time; required when cleared
- `expiryOrRotationPath`:
- `leastPrivilegeUnblockAction`:
- `missingProof`: required when blocked
- `blockerIssue`: required when blocked
- `blockedTask`: exact dependent task; required when blocked
- `notApplicableReason`: required when not applicable

## Migration impact

- Impact: none / checked / requires migration gate / unknown
- Migration command or review evidence:
- Rollback impact:

## Security review

- Required: yes / no
- Reviewer or gate owner:
- Status: clear / blocked / needs human decision
- Stop conditions from `docs/softwarehouse/07-security-standard.md`:

## Rollback path

- Rollback action:
- Stop condition:
- Recovery owner:
- Expected proof of recovery:

## Deployment action

- Action: none / deploy / restart / rollback / env change / database migration
- Production mutation permit linked: yes / no / not applicable
- Deploy log:

## Smoke test

- Smoke plan:
- Smoke command or manual proof:
- Result:
- Reliability / stability notes:

## DORA snapshot

- Deployment frequency contribution: 0 / 1 / not applicable
- Lead time for changes:
- Change failure status:
- Mean time to recovery:
- Reliability / smoke stability:

## Release decision

GO / NO-GO / NEEDS_HUMAN_DECISION

## Follow-up

- Linked failure / unknown issues:
- Next owner:
