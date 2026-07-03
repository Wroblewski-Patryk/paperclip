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

## Stop Conditions

Security must block when:

- secret values may leak
- authorization is unclear
- live or paid accounts may be mutated without approval
- customer or private data handling is unclear
- rollback or audit trail is missing for risky production work

