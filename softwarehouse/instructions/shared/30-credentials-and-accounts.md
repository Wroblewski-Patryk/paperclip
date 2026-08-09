# Credentials And Test Accounts

Secrets, Coolify tokens, production credentials, user accounts, exchange keys,
subscription/payment data, cookies, and session values must never be written to
repo files, issue comments, screenshots, generated artifacts, or logs.

- Store agent-accessible secrets only in Paperclip's configured secret storage
  or another explicit local encrypted secret manager.
- Prefer least-privilege service accounts and short-lived tokens.
- Coolify access should be scoped to deploy/status/log operations for the
  relevant project whenever possible.
- Production test accounts should be separate from the user's real account by
  default.
- The user's real account may be used only for explicit, narrow validation that
  requires real connected integrations. Do not mutate settings, subscriptions,
  API keys, trading settings, or live execution state without explicit user
  approval for that exact action.
- AI-created test accounts may be used for subscription/permission boundary
  tests, but paid state, trials, and entitlements must be reset or documented
  after testing.
- Screenshots and logs from authenticated production checks must be redacted or
  described without exposing private data.
- If a real secret value is exposed in a transcript, log, screenshot, or
  downstream agent output, immediately open or link one protected credential
  incident lane instead of continuing ad hoc investigation in the affected
  implementation issue.
- The incident record must stay name-only: capture the affected
  binding/account/service names, the owner or operator path, the required
  invalidation or rotation expectation, the proof expected before resume, and
  the downstream issues that must block on the incident lane. Never paste the
  raw value or claim provider rotation that the current lane cannot perform.
- Downstream provenance, deploy, implementation, or review issues must link to
  the protected credential incident lane as their blocker instead of
  rediscovering the same secret-exposure pattern independently.
- Use the shared incident routine and then follow the provider/security runbook
  for provider-specific rotation or audit steps. In this repo the existing
  baseline reference is `doc/SECRETS-AWS-PROVIDER.md` under `Incident Response
  Runbook`.
- When a blocker is classified as security/credential-related because it names
  auth boundaries, paused owners, or `403` authorization failures, first
  classify whether the real unblock is an authorized owner path. The permitted
  action is to route or request one least-privilege owner-path restoration with
  redacted evidence; do not request, print, rotate, or handle secrets unless a
  separately approved security/ops credential lane explicitly owns that action.
- Treat provider capability mismatches as owner-path blockers, not retry loops.
  If a token can read status or queue deploys but cannot perform the exact
  required write (for example `PATCH /applications/{uuid}` app-metadata
  updates), do not keep retrying with the same token set and do not substitute a
  broader deploy/rebuild path that changes the target commit or scope. Record
  the exact denied operation, preserve redacted evidence, and route one narrow
  unblock issue for the least-privilege write-capable owner path.

## Protected Delivery Credential-Proof Preflight

Contract marker: `protected-credential-proof:v1`.

Before protected convergence, recovery, observability, or release-proof work
starts, create one task-scoped, value-free proof record. Do not request or store
secret values. Record:

- `taskRef` and `protectedAction`;
- `credentialProofOwner` and `environment`;
- `credentialOrAccountAlias` by name only and the exact `accessScope`;
- `proofStatus` (`cleared`, `blocked`, or justified `not_applicable`) and a
  value-free `proofRef` when cleared;
- `expiryOrRotationPath`; and
- `leastPrivilegeUnblockAction`.

If proof is unavailable, record `missingProof`, create or link exactly one
owner-scoped `blockerIssue`, name the exact dependent `blockedTask`, and mark
that task blocked. Do not retry the protected action or request a broader
credential. Validate a JSON record with
`pnpm softwarehouse:credential-proof-preflight -- <proof-record.json>`.

Blocked example:

```json
{
  "taskRef": "LUC-2228",
  "protectedAction": "observability proof",
  "credentialProofOwner": "Featherly operations owner",
  "environment": "Featherly production",
  "credentialOrAccountAlias": "FEATHERLY_OBSERVABILITY_READ_ACCOUNT",
  "accessScope": "read health, readiness, and alert status only",
  "proofStatus": "blocked",
  "expiryOrRotationPath": "owner confirms expiry and rotates through the provider runbook",
  "leastPrivilegeUnblockAction": "grant a short-lived read-only alert-status session",
  "missingProof": "value-free account authorization confirmation",
  "blockerIssue": "LUC-1900",
  "blockedTask": "LUC-2228"
}
```

Cleared example:

```json
{
  "taskRef": "LUC-2219",
  "protectedAction": "release proof",
  "credentialProofOwner": "Featherly release owner",
  "environment": "Featherly production",
  "credentialOrAccountAlias": "FEATHERLY_RELEASE_STATUS_READER",
  "accessScope": "read deployment SHA and status; no deploy or restart",
  "proofStatus": "cleared",
  "proofRef": "value-free owner confirmation recorded on the task with an observation time",
  "expiryOrRotationPath": "session expires after the proof window; owner rotates through provider controls",
  "leastPrivilegeUnblockAction": "reconfirm the same read-only scope if the proof expires"
}
```

This prevention merges the learning from [LUC-2530](/LUC/issues/LUC-2530)
back into the canonical instruction and addresses the blocker pattern exposed by
[LUC-1900](/LUC/issues/LUC-1900). Retire active monitoring only after two
consecutive protected delivery cycles use this preflight without an unowned
credential blocker.
