# App Completion Review

This standard defines how LuckySparrow agents decide whether an app version is
actually usable by a human, not only present in code.

## Completion Contract

A user-facing capability is complete only when all relevant layers have a known
state:

- user action and expected result;
- login/session requirement;
- subscription or entitlement requirement;
- configuration requirement such as API keys or exchange selection;
- backend/API behavior;
- frontend route/component display and interaction;
- automated proof;
- browser clickthrough or screenshot proof when UI matters;
- docs/index update;
- review handoff and final owner decision.

Use these state labels:

- `verified`: works in automated proof and browser/user-flow proof.
- `implemented but not verified`: code exists, but proof or browser review is
  missing.
- `present in code, behavior unknown`: scanner found code, but no linked proof.
- `missing`: expected user capability has no implementation.
- `blocked by error`: exact command, browser path, API call, or config gate is
  known and has an owner/action.

## Required Index

For active sellable apps, generate the completion index after architecture
exports are fresh:

```bash
node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-app-completion-index.mjs --project Soar --root C:/Personal/Projekty/Aplikacje/Soar
```

Primary outputs:

- `docs/status/app-completion-index.md`
- `docs/status/app-completion-index.json`

The index is the PM/QA queue for "what can a user actually do?" It must be used
before broad planning, version completion claims, and user-facing review.

## Review Handoff

When an agent changes user-visible behavior, the closing comment must include:

- what user action was changed;
- changed files and affected architecture entities;
- API/backend proof or why it was not relevant;
- browser screenshot/clickthrough proof or the blocker preventing it;
- login/subscription/configuration/integration impact;
- commit status, push status, and deploy impact;
- named reviewer or next owner.

A simple "done" comment is not enough for user-facing app work.

## Routing Rules

- Backend works, frontend wrong: create Frontend/UX repair.
- Frontend exists, backend/API missing: create Backend/API repair.
- Frontend and backend exist, but user cannot access it: create Auth,
  Subscription, or Configuration repair.
- Binance/Gate.io connection exists but no names-only proof: create Integration
  proof.
- Browser proof is missing: create QA/browser clickthrough proof.
- User flow is not in the index: create PM/Docs/CTO mapping before coding.
