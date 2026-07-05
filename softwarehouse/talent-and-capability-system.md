# Talent And Capability System

LuckySparrow Software House can improve its own operating model, but it must do
so through explicit evidence and small responsibility boundaries. Agents may
detect gaps, propose new roles, split responsibilities, and update reusable
knowledge. They may not silently create broad autonomous authority.

## Learning Loop

Use this loop after repeated blockers, repeated fixes for the same issue, vague
handoffs, missing evidence, or work that does not fit an existing role:

`failure signal -> capability gap -> role/process proposal -> approval gate -> onboarding -> measured trial -> memory update`

The local automation entrypoint is
`node scripts/run-softwarehouse-learning-loop.mjs --apply`. It may create
Paperclip capability-gap issues, but it may not modify application code, create
new active roles, push, deploy, restart production, or access secrets. A learning
issue is successful when it narrows a repeated failure into one process,
instruction, guardrail, template, or role-boundary change with a retirement
condition.

The purpose is organizational capability, not model tuning. Treat the LLM model
as replaceable; preserve value in roles, memory, procedures, governance,
workflow, skills, observability, and evidence.

`06 AIM (AI Agent Manager)` owns the current Stage 1 AI-agent creation and
hiring authority. `06 AID (AI Agent Development Partner)` supports the
AI-agent side of the loop: daily or evidence-triggered reviews of recent agent
work, small low-risk instruction/skill/routine improvements, and governed
capability-gap proposals. AID designs or reviews role changes but does not
create agents directly. `06 CHRO (Chief Human Resources Officer)` remains
paused for broad human-capital policy unless the board explicitly reopens that
scope. `06 POP (People Operations Partner)` is reserved for future
human/operator people-ops work.

## Capability Gap Signals

Create a capability gap note when any of these appear:

- the same bug class is reopened or repaired more than once;
- a lead repeatedly performs specialist work;
- a specialist needs cross-layer decisions to continue;
- evidence is missing because no role owns the proof;
- a deployment, security, data, UX, AI-runtime, or integration concern has no
  clear owner;
- a routine produces comments but no durable issue disposition;
- an agent repeatedly stalls because its instructions are too broad.

## Proposal Contract

Every proposal for a new agent, role split, routine, or instruction update must
include:

- observed failure or missing responsibility;
- current owner and why that owner is insufficient;
- smallest new responsibility boundary;
- parent in the hierarchy;
- input sources the role must read;
- output artifact or issue disposition;
- verification proof for the first trial;
- model lane and expected cost tier;
- retirement or merge-back condition.

For skill or capability proposals, also include owner role, department/process
class, required permissions, input/output shape, test case, compatibility note,
quality risk, and related procedure.

## Hiring Gate

Only `06 AIM` may create or activate a new AI agent in current Stage 1. AIM
must consult the appropriate domain owner before activation: `00 AIA` for
company-wide operating authority, `11 IPM` or the relevant application PM for
project-management coverage, and `09 CTO` for engineering, QA, security, ops,
or runtime specialists. AID should prepare or review the role design and
first-trial packet for AI-agent changes. CHRO remains paused for broad
human-capital work unless explicitly reopened by the board. Project Managers
and leads may propose roles, but proposals remain `todo` or `in_review` until
AIM and the domain owner accept them.

Do not add an active agent just to make a stalled issue look busy. First try to
split the work into a smaller existing lane. Add a new agent only when the
responsibility will recur and the expected output is distinct.

## Staffing Levels

Human software houses use junior, mid, senior, lead, and specialist levels. In
this AI company, those levels are operating modes first and separate agents only
when evidence proves a recurring need.

- A "junior" agent is justified only for repeatable, low-risk execution work
  with narrow inputs, clear tests, and a senior/reviewer owner.
- A "mid" agent is justified only when an existing specialist repeatedly has
  enough bounded implementation work to keep a lane busy without constant lead
  intervention.
- A "senior" or "lead" agent is justified only when architecture, review,
  decomposition, or unblock decisions are recurring and cannot be absorbed by
  CTO/TSA/DPM without starving implementation.
- A temporary trial agent should have a retirement or merge-back condition from
  day one.

Default answer: do not hire. Hire only after the board shows repeated queue
pressure, missing ownership, or review bottlenecks that cannot be fixed with a
smaller issue, clearer role instruction, or better routine.

## Onboarding Checklist

A new agent is not production-ready until all items are true:

- one role instruction file exists under `softwarehouse/instructions/roles/`;
- shared instruction modules are attached through `AGENTS.md`;
- the role has a parent, owned boundary, and explicit "does not own" section;
- the role has a model lane in `softwarehouse/agent-roster.json`;
- the role has `defaultWorkspace` in `softwarehouse/agent-roster.json`, using
  the narrowest useful cwd for the standing role;
- the role can name its first proof command, evidence artifact, or status
  ledger update;
- the role has a first measured trial issue;
- the trial issue ends as `done`, `blocked`, `delegated`, `in_review`, or
  `todo` with honest proof.

## Performance Review

The AI Agent Development Partner should run a lightweight daily review of recent
completed, blocked, reopened, and productivity-review issues. Each review may
apply at most one low-risk durable update, propose up to three governed
follow-ups, or record that no durable change is justified. Broad role changes,
new active agents, schedule changes, adapter config, and authority changes still
go through the hiring gate.

After every three completed issues per role, Docs Memory Lead should record
whether the role:

- reduced repeated work;
- produced evidence at the right layer;
- escalated only when necessary;
- left issue state consistent with reality;
- created reusable knowledge for future projects.

If the answer is mostly no, the role should be narrowed, merged into another
role, paused, or given sharper instructions before more work is assigned.

## Memory Targets

Learning updates should land in the narrowest durable place:

- role behavior: `softwarehouse/instructions/roles/<role>.md`;
- shared rule: `softwarehouse/instructions/shared/*.md`;
- company process: `softwarehouse/operating-processes.md`;
- project takeover pattern: project `docs/` and root application index;
- reusable template lesson: `!template` feedback during the docs/memory loop.

## Improvement Questions

Every AIM/AID/DSM improvement review should answer only the questions that are
material to the evidence. CHRO participates only when broad human-capital scope
has been explicitly reopened:

- what can be simplified;
- what can be automated;
- what can be generalized or reused;
- what reduces human intervention;
- what improves cross-agent knowledge flow;
- what improves decision quality;
- what makes the system more resilient.

If none of these improve, the correct result is `no durable change`.

The goal is not endless meta-work. The goal is fewer repeated mistakes, clearer
ownership, and a softwarehouse that becomes calmer as project truth improves.
