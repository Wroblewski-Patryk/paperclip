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

Baseline runbook reference:

- `doc/SECRETS-AWS-PROVIDER.md` -> `Incident Response Runbook`

Retirement condition:

- the temporary learning from `LUC-1786` can retire after one later
  transcript/log secret-exposure incident, or a tabletop simulation of that
  incident, follows this shared routine without creating a fresh ad hoc blocker
  chain across security, CTO, and DRE lanes.

## Stop Conditions

Security must block when:

- secret values may leak
- authorization is unclear
- live or paid accounts may be mutated without approval
- customer or private data handling is unclear
- rollback or audit trail is missing for risky production work
