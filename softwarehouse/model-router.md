# Softwarehouse Model Router

Paperclip uses a central model router to pick a model profile before an agent run
starts. Agents do not need to know model names directly. Issue overrides and wake
payload overrides still win; the router only fills the default lane when no
explicit profile was requested.

## Profiles

- `cheap`: legacy low-cost/status-only lane. Used for recovery, liveness, and
  small system follow-ups.
- `spark`: tiny coding and documentation lane.
- `light`: coordination, routine analysis, product/design/ops summaries, and
  low-risk planning.
- `standard`: normal implementation, debugging, review, and verification.
- `reasoning`: architecture, security, deployment, schema, production, and
  cross-module work.
- `strategic`: explicit highest-reasoning lane. Keep this manual or rare until
  the local Codex account confirms the Pro model is available.

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

Official OpenAI docs currently recommend GPT-5.5 for complex reasoning/coding
and GPT-5.4 mini/nano where lower latency or cost matters. Codex documentation
also marks `gpt-5.2` and `gpt-5.3-codex` as deprecated for ChatGPT-signed-in
Codex usage. `gpt-5.3-codex-spark` is a Pro research-preview lane with separate
usage limits, so Paperclip treats it as a profile and not as the only default.

Operationally this means:

- Prefer `gpt-5.5` only where quality matters.
- Use `gpt-5.4-mini` and Spark for lightweight work.
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
