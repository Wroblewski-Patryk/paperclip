# Softwarehouse Model Router

Paperclip uses a central model router to pick a model profile before an agent run
starts. Agents do not need to know model names directly. Issue overrides and wake
payload overrides still win; the router only fills the default lane when no
explicit profile was requested.

## Profiles

- `cheap`: GPT-5.6 Luna low-effort/status-only lane. Used for recovery, liveness, and
  small system follow-ups.
- `spark`: supported by Paperclip generally, but disabled by the local
  Softwarehouse router config because Spark runs have been unreliable here.
- `light`: GPT-5.6 Terra lane for coordination, routine summaries, and low-risk
  planning.
- `standard`: GPT-5.6 Terra lane for normal implementation, debugging, review, and verification.
- `reasoning`: GPT-5.6 Sol high-effort lane for architecture, deployment, schema, and
  cross-module work.
- `strategic`: GPT-5.6 Sol xhigh lane for security, cross-system architecture, difficult
  recovery, and final high-risk review.

## Configuration

The active Softwarehouse policy lives in:

```text
softwarehouse/model-router.config.json
```

Set `PAPERCLIP_MODEL_ROUTER_CONFIG` to point at another JSON file when running a
different company or deployment. The committed config contains role defaults,
Softwarehouse name-prefix defaults, and keyword rules. This keeps the policy
versioned without hardcoding it into agent instructions.

## Current OpenAI/Codex Notes

Official OpenAI docs position GPT-5.6 Sol for complex professional work, Terra
for balancing intelligence and cost, and Luna for cost-sensitive high-volume
workloads. The unsuffixed `gpt-5.6` alias routes to Sol, so Paperclip uses
explicit model IDs and defaults normal work to Terra.

The repository pins Codex CLI 0.145.0, and Luna, Terra, and Sol passed live
read-only probes on 2026-07-28. Operationally this means:

- Use only models that pass a live `codex exec` probe with the pinned CLI.
- Use Luna for high-volume status/recovery work, Terra for normal work, and Sol
  for high-reasoning or strategic work.
- Keep GPT-5.4, GPT-5.4 mini, GPT-5.5, and Spark selectable only for explicit
  legacy/manual configurations.
- Keep deprecated model IDs in the adapter list only for legacy/manual configs.
- Reduce prompt and AGENTS.md bloat before buying more capacity; smaller context
  is a real quota lever.

## Fallbacks

If the selected adapter does not support a requested profile, heartbeat metadata
records the fallback reason and the run continues with the primary adapter
config. This prevents a missing profile from blocking urgent execution while
still making the routing miss inspectable in run metadata.

Quota pressure is a separate soft fallback before the hard provider-quota hold:

- `high`: lowers expensive profile choices by one lane.
- `critical`: lowers profile choices more aggressively.
- hard hold: still delays queued Codex runs once the configured quota threshold
  is reached.

The active thresholds come from the Codex quota-window guard in heartbeat. By
default, short windows hold at 75% and long windows hold at 90%; the router
starts lowering profiles 15 percentage points before those holds and lowers more
aggressively 5 percentage points before them.
