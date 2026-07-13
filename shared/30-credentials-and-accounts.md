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
