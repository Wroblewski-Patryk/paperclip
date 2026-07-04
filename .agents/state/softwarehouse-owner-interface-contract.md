# Softwarehouse Owner Interface Contract

Last updated: 2026-07-04

Purpose: define how Paperclip agents communicate with the owner and with Codex
when Stage 1 starts.

## Core Rule

Internal company work should stay English-first for durable operating assets,
procedures, architecture, project names, task titles where practical, code,
commits, and cross-agent context.

Owner-facing direct communication through AIA must be Polish-first, clear,
concise, and decision-oriented.

Reports, work products, evidence artifacts, internal issue notes, technical
handoffs, architecture notes, and cross-agent summaries may stay English-first
unless they are written specifically as a direct message to the owner. When an
internal English report needs owner attention, AIA should provide a short Polish
decision packet or summary and link/reference the English artifact instead of
translating everything.

## Communication Path

Current Stage 0 path:

```text
Owner <-> Codex in this chat -> Paperclip configuration
```

Stage 1 target path:

```text
Owner <-> AIA -> company hierarchy -> project/department agents
```

Codex may still help when the owner explicitly asks. When Codex is asked to
interact with Paperclip after Stage 1 begins, Codex should coordinate through
`00 AIA` rather than bypassing the company hierarchy, unless the owner asks for
direct emergency inspection.

The owner-direction/proposal loop lives in
`.agents/state/softwarehouse-owner-direction-proposal-loop.md`. Use it when the
owner gives notes, direction, corrections, approvals, or asks for a proposal.

## AIA External Interface

`00 AIA` is the default external interface to the owner.

AIA should:

- translate internal English operating context into clear Polish;
- explain what decision is needed and why;
- separate facts, assumptions, risks, options, and recommendation;
- ask follow-up questions when direction is ambiguous;
- avoid dumping raw agent logs unless the owner asks;
- preserve enough detail that the owner can make a correct decision;
- route approved work back into the company hierarchy;
- record owner decisions in the relevant issue, procedure, memory, or approval
  path.
- watch for pending approval tasks and, when useful, help the owner decide by
  presenting the decision basis in Polish without hiding underlying English
  evidence.

## Owner Decision Packet

When agents need an owner decision, AIA should present a short Polish packet:

```text
Decyzja do podjęcia:
<one sentence>

Kontekst:
<2-5 bullets with facts only>

Opcje:
1. <option> - benefit / cost / risk
2. <option> - benefit / cost / risk
3. <optional option> - benefit / cost / risk

Rekomendacja AIA:
<one clear recommendation with why>

Co się stanie po akceptacji:
<next actions and involved agents>

Ryzyko / cofnięcie:
<risk and rollback or recovery path>
```

Use Polish for the packet because it is direct owner communication. Keep
internal identifiers, project names, issue ids, file paths, procedure ids, and
environment names in their original form.

## Owner Direction And Notes

When the owner gives direction or notes rather than a direct approval, AIA
should classify the input as direction, note, approval, rejection/correction,
question, or high-risk decision. Low-risk context should be saved and routed;
high-risk or ambiguous work should return as a Polish proposal packet before
execution.

## When To Ask The Owner

Ask the owner before:

- Stage 1 activation or resuming agents/routines;
- broad product direction changes;
- architecture changes that contradict source-of-truth docs;
- production-impacting deploy actions;
- push/release actions when policy requires it;
- secret changes or raw credential handling;
- paid resources, paid GitHub features, or notification-heavy automation;
- legal/finance/customer commitments;
- creating new permanent agents or changing hiring authority;
- deleting, force-pushing, or destructive changes;
- any ambiguous instruction where a wrong interpretation could waste serious
  time or create risk.

Do not ask the owner for routine low-risk implementation details that a
responsible role can decide inside approved policy. Record those in normal
English-first evidence and closure notes unless AIA needs to surface a direct
owner decision.

## When AIA Should Ask Clarifying Questions

AIA should ask before task creation if the request lacks:

- target product or project;
- desired user/business outcome;
- acceptable risk level;
- approval boundary;
- priority between Soar and Roost;
- whether the work should create Paperclip issues now or stay as Stage 0
  planning;
- whether Codex should act directly or route through AIA.

Questions should be few, concrete, and in Polish.

## Cross-Agent Communication

Agents may use English internally, but they must write task descriptions,
handoffs, and closure notes so other agents can act without guessing.

Good internal context is:

- short enough to fit the next agent's working context;
- explicit about source-of-truth docs and procedure id;
- clear about parent/child relationship;
- clear about evidence expected;
- clear about what not to do;
- free of raw secrets and unnecessary transcript noise.

## Safety Valve For Codex And Owner

The system needs a safety valve for both Codex and the owner:

- If Codex is not sure what the owner means for Stage 1, Codex should ask until
  the direction and path are clear.
- If AIA is not sure what the owner means, AIA should ask a Polish decision
  question instead of letting agents infer a risky plan.
- If the owner asks Codex to approve or inspect something on the owner's behalf,
  Codex should make the decision basis explicit and record what was approved.

## Do Not

- Do not send the owner long raw internal logs as the default answer.
- Do not hide important uncertainty behind confident wording.
- Do not let non-AIA agents repeatedly ask the owner separate questions when
  AIA can consolidate.
- Do not translate code identifiers, secret ref names, URLs, issue ids, commit
  hashes, or procedure ids into Polish.
- Do not require every report to be Polish. Only direct owner-facing AIA
  communication needs Polish.
- Do not create work from owner intent until AIA/Codex understands the desired
  direction well enough to route it safely.
