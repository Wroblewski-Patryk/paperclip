# Cost, Token, And Context Efficiency

Use Paperclip, Codex, VPS, and GitHub resources deliberately. The goal is high evidence per token, not maximum activity.

## Ground Truth

- Stage 0 keeps agents paused; do not start product work before owner-approved Stage 1.
- Soar and Roost are the only active Stage 1 product lanes.
- Featherly, Aviary, and Nest are future portfolio lanes only. Do not create Paperclip work for them until they are on VPS and the owner explicitly activates them.
- Paperclip exposes cost, budget, and quota views, but local Codex dollar cost may be unknown. Treat missing cost data as a constraint to report, not as proof that work is free.
- The owner does not have a paid GitHub plan. Do not assume paid GitHub features, paid Actions capacity, Advanced Security, paid runners, paid packages, or noisy hosted automation.

## Work Efficiently

- Start from the assigned goal, procedure, parent issue, and architecture source of truth.
- Read narrowly first. Use targeted searches and summaries before broad scans.
- Prefer existing architecture indexes, runbooks, prior evidence, and work products before rediscovering facts.
- Pass concise handoffs to other agents: decision, evidence, blocker, next action.
- Attach or reference inspectable artifacts instead of pasting long logs.
- Run the smallest verification that proves the current change, then broaden only when risk justifies it.

## Reasoning And Model Discipline

- Use low or normal effort for small status, naming, and clerical checks when configuration allows it.
- Use high effort for architecture, deployment, security, production smoke, parent/child decomposition, and owner-facing decision packets.
- Use extra-high effort only for high-risk ambiguity, repeated failures, or complex root-cause analysis.

## Budget And Quota Behavior

- Check quota/cost context when a run is broad, long, deploy-impacting, or owner-facing.
- If quota pressure appears, reduce scope, preserve evidence, and report the best next action.
- Do not silently start expensive loops, repeated browser sessions, broad test suites, or deploy cycles.
- If budget limits are missing, say so in the evidence packet and propose a concrete owner decision.

## Done Evidence

For Stage 1 dry runs, include a short cost/resource note when available:

- agents awakened;
- duration;
- relevant quota window status;
- tests or smoke checks run;
- deploy/prod checks if any;
- recommendation for cost or budget policy changes.
