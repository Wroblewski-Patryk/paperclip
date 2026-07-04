# Safe Trace Logging

Status: active softwarehouse operating contract
Date: 2026-07-04
Owner: 10 SPA with 09 DRE, 09 QVE, and 00 AIA

Safe trace logging gives Paperclip enough evidence to learn from agent work without storing secrets,
private data, full prompts, tokens, API keys, or sensitive raw payloads in normal logs.

## SafeTraceLog Rule

Normal trace records must contain summaries, references, and redacted metadata only. They may include:

- run id, task id, agent id, event type, and timestamp
- tool name without raw payload
- redacted summary of the action
- workspace-relative files touched
- commands run with secrets, tokens, paths outside scope, and private values redacted
- tests/checks run and summarized results
- warnings, errors, risk flags, and evidence refs

They must not include:

- raw secrets, tokens, passwords, API keys, cookies, session ids, or private keys
- owner credentials or owner-linked provider payloads
- full prompts that contain sensitive project, user, account, or provider data
- raw external-provider responses when they may contain private account or trading data
- full browser storage, environment dumps, or unfiltered logs

## Redaction Rules

- Replace secrets with stable references such as `secret_ref:<name>`.
- Replace private account values with role labels such as `owner_prod_account` or `ai_smoke_account`.
- Summarize commands rather than copying full env-expanded commands.
- Summarize external-provider data at the behavior level: status, endpoint class, error class, and
  safe identifiers only.
- Store evidence as work product refs, issue refs, commit ids, screenshots with sensitive data hidden,
  or redacted log excerpts.

## Risk Flags

Use these flags when applicable:

- `secret_touch`
- `owner_linked_credential`
- `production_touch`
- `deploy_mutation`
- `destructive_command`
- `paid_resource`
- `external_provider`
- `live_trading`
- `workspace_escape`
- `raw_log_needed`
- `missing_evidence`
- `repeated_failure`
- `blocked_stale`
- `parentless_work`
- `duplicate_or_circular_task`
- `policy_gate_change`
- `agent_behavior_change`

## RawTraceVault

Raw logs may exist only as encrypted RawTraceVault material when a safe trace cannot explain a
serious failure. RawTraceVault access is exceptional, not routine.

Minimum RawTraceVault policy:

- encrypted at rest
- short retention, default 7 days unless the owner approves longer
- restricted to SPA and the smallest required engineering owner set
- access logged
- no use in normal agent context
- raw content must be distilled into SafeTraceLog, AgentFeedback, AgentEval, and evidence refs
- raw content must be deleted or rotated at retention expiry

## Production and External Provider Traces

When testing Soar, Roost, or future apps with owner-linked integrations:

- record the account class, not raw credentials
- state whether the flow used AI smoke credentials or owner-linked credentials
- do not capture provider secrets, tokens, trading payloads, or private documents
- live trading/order proof remains gated separately from app functionality proof
- if a provider dependency fails, classify whether the failure belongs to the app, upstream provider,
  owner-linked configuration, or a downstream product dependency

## Failure Handling

If a trace shows a repeated problem, unsafe action, recovery-needed run, stale blocker, or
done-without-proof closure:

1. Create AgentFeedback.
2. Create or update an AgentEval.
3. Create or update an AgentImprovementTask when the eval fails or feedback severity requires it.
4. Do not hide the failure by clearing status alone.
