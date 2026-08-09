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

## Security-Credential Owner-Evidence Intake

Contract marker: `security-credential-owner-gate:v1`.

At creation of a security-credential incident, create or reuse exactly one root
incident issue. The incident issue is the owner-evidence gate; do not create a
separate gate for each proof category. Before opening downstream remediation,
release, recovery, provenance, or documentation work:

1. Identify only the categorical evidence that an authorized owner must supply
   for the next safe transition. For every category, record the named owner and
   the exact action required if that evidence is unavailable.
2. On the root incident, immediately open one `ask_user_questions` interaction
   with `continuationPolicy: wake_assignee` and a stable idempotency key such as
   `security-credential-owner-gate:<incident-issue-id>:v1`.
3. Use required, single-select questions and categorical options only. Do not
   offer free-text inputs. State in the title, summary, and each help text that
   credential values, tokens, alert payloads, message contents, addresses,
   personal data, and broader account access must not be entered.
4. Keep the root incident `in_review` while the interaction is pending. Every
   dependent issue must be `blocked` with `blockedByIssueIds` containing the
   root incident id. A dependent issue must not duplicate the questionnaire,
   credential handling, or a proof-category blocker.

Create the interaction with this API shape, replacing the sample question with
only the applicable catalog entries:

```json
{
  "kind": "ask_user_questions",
  "continuationPolicy": "wake_assignee",
  "idempotencyKey": "security-credential-owner-gate:<incident-issue-id>:v1",
  "title": "Value-free credential incident intake",
  "summary": "Select outcome categories only. Do not enter credentials, tokens, alert payloads, message contents, addresses, personal data, or secret values.",
  "payload": {
    "version": 1,
    "submitLabel": "Record safe outcomes",
    "questions": [
      {
        "id": "provider_activity_review",
        "prompt": "What is the provider activity-review outcome?",
        "helpText": "Select an outcome only; do not paste logs, addresses, message contents, credentials, or tokens.",
        "selectionMode": "single",
        "required": true,
        "options": [
          { "id": "completed_benign", "label": "Completed - no suspected misuse" },
          { "id": "completed_suspected", "label": "Completed - suspected misuse" },
          { "id": "unavailable", "label": "Not completed or unavailable" }
        ]
      }
    ]
  }
}
```

Select only applicable questions from this value-free catalog and remove any
category already established by authoritative evidence:

- `credential_control_state`: invalidated or rotated / already invalid / not
  completed or unavailable;
- `provider_activity_review`: completed with no suspected misuse / completed
  with suspected misuse / not completed or unavailable;
- `external_alert_state`: resolved with no reachable exposure / unresolved /
  not authenticated or unavailable;
- `destructive_change_disposition`: no protected mutation occurred / an exact
  separately approved mutation occurred / unknown or unavailable.

Store the gate record on the incident using this value-free shape:

```json
{
  "contract": "security-credential-owner-gate:v1",
  "rootGateIssue": "LUC-1900",
  "interactionId": "<ask_user_questions interaction id>",
  "state": "pending_owner_response",
  "proofCategories": [
    {
      "category": "provider_activity_review",
      "owner": "Featherly mail-provider owner",
      "status": "pending",
      "unavailableAction": "review the bounded provider activity window and select benign or suspected misuse"
    }
  ],
  "downstreamBlockerContract": {
    "blockedByIssueIds": ["<root incident issue UUID>"],
    "resolveOn": "root incident reaches done"
  }
}
```

Response handling is fail-closed:

- an unavailable, unresolved, unknown, or unauthenticated answer changes the
  root gate to `blocked_owner_action`; record the category's named owner and
  exact next action, without opening duplicate downstream questionnaires;
- a suspected-misuse or unsafe outcome keeps the root gate open and routes the
  bounded incident-response work through the protected security lane;
- only authoritative categorical outcomes that satisfy every required category
  change the gate to `cleared`; then close the root incident with evidence so
  Paperclip can auto-resume issues that block on it;
- absence of an alert, an unauthenticated `404`, a failed connector, or silence
  is `unavailable`, never cleared evidence.

Retire the interaction when the root incident reaches a terminal state. Do not
copy incident-specific learning or questionnaires into downstream issues after
this canonical gate exists.

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
