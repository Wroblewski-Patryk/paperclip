# Knowledge Governance

Status: active baseline
Date: 2026-07-04
Owner: Docs Memory Lead with 04 DSM, 09 QVE, 09 TSA, and 00 AIA

Paperclip Softwarehouse must learn without drowning agents in old run noise.
History is useful, but old evidence is not automatically current truth.

## Knowledge Layers

Use the narrowest layer that matches the information.

| Layer | Purpose | Default use by agents | Examples |
| --- | --- | --- | --- |
| Current Truth | Small, current, decision-backed operating or product truth. | Read first and treat as binding until superseded. | Active mission, current architecture source of truth, app completion index, current deploy topology, active access policy. |
| Decision Log | Durable decisions with rationale and status. | Use to explain why current truth changed. | ADRs, `.agents/state/decision-register.md`, product tradeoff decisions, board approvals. |
| Evidence | Inspectable proof from a run, test, smoke, review, deploy, or audit. | Use to verify claims; do not treat as future truth unless promoted. | Work products, screenshots, safe trace summaries, test output, deployment evidence, CSV/JSON indexes. |
| Lessons Learned | Reusable prevention rule extracted from repeated or high-impact experience. | Convert into procedure, checklist, eval, or guardrail. | Coolify disk pressure prevention, stale blocker cleanup, workspace boundary rules. |
| Archive | Historical context that may be obsolete. | Search only when investigating history; never override current truth. | Archived issues, old reports, superseded docs, stale assumptions, old failed attempts. |

## Promotion Rule

Evidence does not become current truth automatically.

To promote evidence into a durable operating fact, the responsible owner must:

1. Name the source issue, run, artifact, command, or commit.
2. State whether the fact is current, temporary, superseded, or uncertain.
3. Update the narrowest current-truth file or product source-of-truth document.
4. Link the evidence from that file.
5. If the change affects future agent behavior, update the relevant procedure,
   eval, checklist, routine, skill, or role instruction.

If promotion is not justified, keep the item as evidence or archive only.

## Staleness And Supersession

Every durable knowledge update should answer:

- What does this replace, if anything?
- Which date, issue, run, artifact, or commit proves it?
- Which product, department, agent role, or procedure is affected?
- What is still unknown?
- Who owns the next review when the fact may expire?

Use these statuses in decision and knowledge ledgers:

- `active`: use as current guidance.
- `temporary`: use only until the named review condition.
- `superseded`: preserved for history; do not use for new work.
- `rejected`: considered and intentionally not adopted.
- `obsolete`: old context retained only for investigation.

## Product Source-Of-Truth Split

Soar and Roost product truth belongs in their product repos.

For each active product, agents should keep project-native docs and indexes
current:

- architecture source of truth;
- feature and user-flow index;
- cross-layer trace from UI to API, services, data, jobs, integrations, tests,
  docs, deploy resources, and production smoke;
- known gaps, blockers, and deferred work;
- evidence that proves current behavior.

Paperclip stores company-level operating knowledge:

- how agents should coordinate;
- which departments and roles own the work;
- which gates protect deploy, secrets, production, cost, and owner decisions;
- reusable lessons learned across projects;
- portfolio-level dependency and activation rules.

Do not duplicate large product docs into Paperclip memory. Link to the product
source instead and summarize only the fact needed for company coordination.

## Agent Context Hygiene

Before loading or citing old material, agents must classify it:

1. Is it current truth, a decision, evidence, a lesson, or archive?
2. Does a newer current-truth or decision file supersede it?
3. Is it issue-specific, product-specific, department-specific, or company-wide?
4. Is it needed for the current role and task?

If an old item conflicts with a newer source, agents must prefer the newer
current-truth or decision source and record the conflict only if it affects the
task.

## Archiving Rules

Archived Paperclip issues and historical reports are searchable evidence, not
default context. Archive old or duplicate work when:

- its accepted lesson has been promoted into a current procedure/eval/doc;
- its decision is marked `superseded`, `rejected`, or `obsolete`;
- it is a duplicate routine or issue with no unique evidence;
- it is a completed run artifact that no longer needs board attention.

Do not archive active blockers, owner decisions, production gates, or product
source-of-truth gaps until the current owner and next action are visible.

## Closure Rule

When a task changes knowledge, its handoff must say one of:

- `current truth updated`: file or product source named;
- `decision recorded`: decision id or ADR named;
- `evidence attached only`: not promoted to current truth;
- `lesson promoted`: procedure/eval/checklist/guardrail named;
- `archived as historical`: archive reason and superseding source named;
- `no knowledge change`: reason stated.

This keeps Paperclip learning useful facts instead of feeding every future
agent the full history of every old run.
