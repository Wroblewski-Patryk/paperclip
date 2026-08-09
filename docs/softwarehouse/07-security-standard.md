# Security Standard

Status: active baseline
Date: 2026-06-03
Owner: Security Review Lead

This is a lightweight OWASP ASVS/SAMM-inspired standard. It is not a certification process.

## Baseline Rules

- never commit secrets
- never log API keys, tokens, passwords, cookies, session values, or private keys
- validate user and agent input
- enforce authorization on company-scoped and project-scoped data
- protect endpoints that mutate state
- separate environment configuration by target
- document security risks and accepted residual risk
- require extra security review for auth, payments, customer data, secrets, live accounts, and production mutation

## Security Review Checklist

- What data can this change read or mutate?
- Which actor is allowed to perform the action?
- Are company boundaries preserved?
- Are secrets referenced rather than persisted inline?
- Are logs and activity payloads redacted?
- Are dependencies and external calls understood?
- Is the failure mode safe?

## Transcript Secret-Exposure Routine

When a real secret value is suspected or confirmed to have appeared in a
transcript, log, screenshot, or downstream agent output, treat that as a
credential incident, not as an ordinary implementation detail.

Required response:

- open or link one protected credential incident lane immediately;
- keep the incident least-privilege and name-only;
- stop copying the exposed value into comments, docs, logs, screenshots, or
  artifacts;
- block downstream implementation, deploy, provenance, or review issues on that
  incident lane instead of rediscovering the same pattern separately;
- point responders to the provider/security runbook for provider-specific
  rotation, invalidation, audit, and rescope steps.

Minimum incident record:

- affected binding, account, secret, or service names only;
- source of exposure, such as transcript, log, screenshot, or downstream agent
  output;
- owner or operator path for the protected lane;
- required invalidation or rotation expectation;
- proof required before dependent work resumes, using name-only evidence;
- linked downstream blocker issues that must wait on the incident lane.

Least-privilege boundary:

- agents may identify impacted bindings, open the protected lane, and attach
  name-only evidence;
- agents may not paste raw values, request raw values in chat, or claim
  provider rotation/invalidation they did not perform through the authorized
  lane.

### Owner-evidence intake gate

Contract marker: `security-credential-owner-gate:v1`.

At incident creation, the protected credential incident issue is the single
root gate for owner-only evidence. The incident owner must immediately create
one `ask_user_questions` interaction on that issue with
`continuationPolicy: wake_assignee` and a stable idempotency key. The
interaction must contain only required, single-select, categorical questions
that are necessary for the next safe transition; free-text input is forbidden.

Permitted question categories are credential-control state, provider activity
review outcome, authenticated external-alert state, and the disposition of an
approval-gated destructive change. Include only applicable categories and omit
facts already established by authoritative evidence. Every question must say
not to enter credential values, tokens, alert payloads, message contents,
addresses, personal data, or broader account access.

The incident record must include a value-free typed gate:

- `contract`: `security-credential-owner-gate:v1`;
- `rootGateIssue` and `interactionId`;
- `state`: `pending_owner_response`, `blocked_owner_action`, `escalated`, or
  `cleared`;
- `proofCategories`: category, categorical status, named owner, and exact
  action if unavailable;
- `downstreamBlockerContract`: the root incident UUID in
  `blockedByIssueIds`, resolving only when the root incident reaches `done`.

Keep the root incident `in_review` while its interaction is pending. An
unavailable, unresolved, unknown, or unauthenticated answer fails closed: move
the gate to `blocked_owner_action` and record the named owner and exact next
action. Suspected misuse routes protected incident-response work and keeps the
gate open. Close the root incident only after every required category has an
authoritative acceptable outcome. Downstream work blocks on the root incident,
never on duplicated credential questionnaires or proof-category issues; normal
blocker resolution then wakes the downstream assignees automatically.

The full interaction catalog, typed record example, and response rules live in
`softwarehouse/instructions/shared/30-credentials-and-accounts.md`.

Baseline runbook reference:

- `doc/SECRETS-AWS-PROVIDER.md` -> `Incident Response Runbook`

Retirement condition:

- the temporary learning from `LUC-1786` can retire after one later
  transcript/log secret-exposure incident, or a tabletop simulation of that
  incident, follows this shared routine without creating a fresh ad hoc blocker
  chain across security, CTO, and DRE lanes.

### Browser run-code transcript prevention

Treat arbitrary browser run-code payloads as secret-bearing even when an agent
believes the source is safe. Codex emits MCP arguments in both start and
completion events, and browser results or error diagnostics may repeat source,
headers, environment values, cookies, or page-derived credentials.

- Paperclip must withhold the arguments, result, and error fields for Codex
  `browser_run_code` and `browser_run_code_unsafe` events before run-log or
  result persistence. Keep only the tool/server identity, item id, event type,
  and coarse status needed for audit.
- Malformed events that name either run-code tool fail closed: persist a
  redaction marker rather than the unclassified line.
- Regression tests use synthetic markers and must cover start/completion,
  chunk-split input, result/error diagnostics, and an unaffected safe browser
  tool.
- This control does not authorize placing secrets in browser source. Use
  protected bindings, managed authentication state, or provider APIs that keep
  values outside transcript-visible tool inputs.

Residual boundary: the Paperclip adapter controls Paperclip run logs and stored
run results. It cannot retroactively sanitize external provider/session files,
third-party browser logs, screenshots, arbitrary page content, or adapter types
that do not pass through this Codex JSONL transformer. A suspected exposure on
those surfaces still follows the incident routine above.

## Stop Conditions

Security must block when:

- secret values may leak
- authorization is unclear
- live or paid accounts may be mutated without approval
- customer or private data handling is unclear
- rollback or audit trail is missing for risky production work
