# Organizational Memory And Learning

## Purpose

Paperclip issues remain the execution ledger. Organizational Memory and
Organizational Learning contain only durable, evidence-backed facts that should
change how the company or future agents orient and act.

## Write Boundary

Create an organizational **record** only for:

- a material, testable assumption with confidence and a review or expiry path;
- an explicit commitment with an owner and condition or due date;
- a real decision with the selected option, rationale, consequences, and
  evidence. Agents normally create decisions as `proposed`; do not convert a
  proposal into accepted board authority.

Create an organizational **observation** only for:

- an inspectably verified output, acceptance, outcome, or impact;
- a causal claim supported by evidence, not temporal coincidence;
- a sourced external signal with a validity or freshness boundary;
- a reusable learning candidate supported by a repeated pattern or a named
  issue, test, review, incident, deployment, or retrospective.

Do not copy ordinary task progress, plans, raw transcripts, one-off guesses,
duplicate comments, secret values, credentials, or private payloads into these
stores. Keep those in the issue, protected runtime metadata, or the narrowest
existing evidence artifact.

## Required Provenance And Deduplication

Use the current issue as provenance and choose a stable, non-secret dedupe key.
The helper enriches the payload with issue/project/goal/agent/run context and
returns `existing` instead of creating a duplicate:

```powershell
$memoryHelper = Join-Path $env:LUCKYSPARROW_SOFTWAREHOUSE_ROOT 'skills/paperclip/scripts/paperclip-organizational-memory.mjs'
node $memoryHelper observe --input-file .\learning-observation.json --dedupe-key "issue:$env:PAPERCLIP_TASK_ID:verified-outcome:v1"
```

The JSON file uses the normal Organizational Record or Organizational
Observation API payload. Never execute the `.mjs` path directly on Windows;
invoke it through `node`.

## Lifecycle

- Assumptions must be reviewed, validated, invalidated, superseded, or expired.
- Commitments must be accepted, fulfilled, breached, cancelled, or superseded.
- Decisions must retain rationale and supersession history.
- Learning starts as `proposed`. Validate it against evidence before promotion.
- Promotion requires a durable target such as a skill, procedure, template,
  eval, routine, policy, or issue. Promotion does not bypass security,
  deployment, approval, budget, or owner-authority gates.

Before closing non-trivial work, ask whether the result changes durable company
truth or a reusable operating rule. Write one deduplicated record/observation
when it does; write nothing when it does not. Mention the created or existing
record in the issue closeout so reviewers can inspect the trace.

