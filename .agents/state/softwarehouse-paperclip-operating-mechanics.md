# Softwarehouse Paperclip Operating Mechanics

Last updated: 2026-07-04

Purpose: define how LuckySparrow Softwarehouse agents should understand
Paperclip itself before Stage 1 starts. This complements the company operating
model: agents need to know not only what the company is trying to achieve, but
also how Paperclip work objects, pauses, wakeups, routines, goals, issues,
evidence, approvals, and learning fit together.

## Core Rule

Paperclip is the company control plane, not a background chaos engine.

Agents should treat every Paperclip primitive as part of a governed work loop:

```text
owner direction -> AIA packet -> goal -> project -> parent issue
  -> child issue or specialist action -> evidence -> review
  -> closure synthesis -> learning packet -> procedure/routine improvement
```

During Stage 0 this loop is documented only. It must not create Paperclip
issues, resume agents, or enable routine triggers without explicit owner
approval.

## Paperclip Primitives

| Primitive | Meaning in Softwarehouse | Agent behavior |
| --- | --- | --- |
| Company | Boundary for agents, projects, issues, skills, secrets, routines, and goals. | Never act across company boundaries unless a board-approved integration says so. |
| Agent | A role-bound employee with permissions, skills, instructions, and resource access. | Stay inside role, assignment, repo, and resource scope. |
| Agent status | Lifecycle state. `paused` is the Stage 0 quiet guard. | Do not assume a paused agent can or should execute. Ask through AIA/activation governance. |
| Goal | Business intent and success frame. | Connect meaningful work to a goal before creating or accepting execution work. |
| Project | Product, department, or asset lane. | Keep work attached to the correct project, using `NN Department: Element` naming. |
| Issue/task | Executable unit of work. | Use one clear owner, parent/child hierarchy, evidence, and closure comments. |
| Routine | Repeatable operating procedure or review loop. | In Stage 0 routines are paused assets. In Stage 1 they must run only by approved trigger/scope. |
| Trigger | Schedule/event that can start routine work. | Disabled until owner-approved activation; never enable just to see what happens. |
| Skill | Packaged operating ability or workflow. | Use only when role-relevant and useful; report missing/noisy skills through learning packets. |
| Secret ref | Safe reference to sensitive data. | Use refs only; never request, print, or store raw values in issues, docs, or logs. |
| Work product/artifact | Inspectable evidence for decisions and done claims. | Attach or reference proof before status changes to review/done. |
| Approval gate | Board/AIA/high-risk decision point. | Escalate clearly in Polish through AIA when owner action is needed. |

## Wakeup And Activation Model

- Assignment, routine execution, or an approved wakeup can make an invokable
  agent work.
- A paused agent is intentionally quiet. Paused status prevents accidental Stage
  0 execution and should not be bypassed by another agent.
- `00 AIA` owns activation decisions and owner-facing packets, but normal agent
  REST access must not directly resume or pause agents.
- Actual resume/pause is performed by owner/Codex board action or a future
  approved activation bridge.
- AIA should request the smallest useful activation tree for the current scope,
  then pause back or recommend pause-back after the dry run finishes.

## Goal, Routine, And Issue Hygiene

Before creating or accepting issue work in Stage 1, an agent should confirm:

1. The owner has approved the current activation mode.
2. The work connects to an active goal and correct project.
3. The parent/requesting agent is known.
4. The issue has one accountable owner and clear completion evidence.
5. Child issues are only created when they reduce real complexity or split
   specialist responsibility.
6. Duplicate issues/routines/goals were checked first.
7. The expected learning or procedure update path is known.

Agents should not create circular work, speculative backlog noise, or broad
"improve everything" tasks. If the work is unclear, report the ambiguity upward
instead of inventing a task tree.

## V1 Dry Run Meaning

The `00 General: Stage 1 Controlled Activation Dry Run` is a controlled first
activation and monitoring exercise. It is not full autonomous company launch.

The dry run should prove:

- AIA can speak to the owner in clear Polish.
- The owner can approve or reject a scoped packet.
- A minimal agent set can be activated without waking the whole company.
- One parent issue can coordinate one Soar preflight lane.
- Product architecture, secrets, deployment observation, tests, evidence, and
  learning can be connected in one closed loop.
- The company can stop, summarize, learn, and adjust before expanding.

Recommended first dry-run shape:

```text
Owner approval
-> AIA Polish packet
-> minimal agent activation
-> one parent issue under the controlled dry-run goal
-> Soar architecture/readiness preflight
-> local evidence and optional protected production smoke
-> review/evidence gate
-> AIA Polish report
-> learning packet
-> owner decision about expansion
```

## Stop Conditions

Stop and escalate through AIA if:

- a routine trigger or agent activation would broaden work beyond approval;
- agents create duplicate or circular parent/child issues;
- a task lacks goal, project, parent, owner, evidence, or closure path;
- production, deploy, secrets, or destructive actions are needed but not
  approved;
- cost/quota status is unknown and the work could become expensive;
- the owner-facing decision cannot be explained in Polish simply enough for a
  confident approval.

## Current Known Gaps

- Runtime behavior still needs proof from the first dry run.
- The activation bridge is policy-ready but not implemented; board/Codex action
  remains the current lifecycle mechanism.
- Hard budget limits are not configured yet; the dry run should produce cost
  evidence for the owner before broad autonomy.
- Product-specific playbooks should be expanded from real dry-run findings, not
  invented prematurely.
