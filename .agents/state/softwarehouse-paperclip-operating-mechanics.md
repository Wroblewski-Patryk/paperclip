# Softwarehouse Paperclip Operating Mechanics

Last updated: 2026-07-04

Purpose: define how LuckySparrow Softwarehouse agents should understand
Paperclip itself during active Stage 1. This complements the company operating
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

Stage 1 is active under `LUC-25`: `00 General: Deliver Soar and Roost to
Usable VPS Production`. Agents may use Paperclip work objects inside that
approved parent mission when doing so reduces ambiguity, preserves
traceability, and moves Soar/Roost toward owner-usable VPS production.

## Paperclip Primitives

| Primitive | Meaning in Softwarehouse | Agent behavior |
| --- | --- | --- |
| Company | Boundary for agents, projects, issues, skills, secrets, routines, and goals. | Never act across company boundaries unless a board-approved integration says so. |
| Agent | A role-bound employee with permissions, skills, instructions, and resource access. | Stay inside role, assignment, repo, and resource scope. |
| Agent status | Lifecycle state. `paused` prevents accidental work. | Do not assume a paused agent can or should execute. Ask through AIA/activation governance. |
| Goal | Business intent and success frame. | Connect meaningful work to a goal before creating or accepting execution work. |
| Project | Product, department, or asset lane. | Keep work attached to the correct project, using `NN Department: Element` naming. |
| Issue/task | Executable unit of work. | Use one clear owner, parent/child hierarchy, evidence, and closure comments. |
| Routine | Repeatable operating procedure or review loop. | In Stage 1, app-factory routines may run only within the active Soar/Roost delivery scope and must not create broad/noisy backlog. |
| Trigger | Schedule/event that can start routine work. | Use only approved triggers. Never enable unrelated or speculative triggers just to see what happens. |
| Skill | Packaged operating ability or workflow. | Use only when role-relevant and useful; report missing/noisy skills through learning packets. |
| Secret ref | Safe reference to sensitive data. | Use refs only; never request, print, or store raw values in issues, docs, or logs. |
| Work product/artifact | Inspectable evidence for decisions and done claims. | Attach or reference proof before status changes to review/done. |
| Approval gate | Board/AIA/high-risk decision point. | Escalate clearly in Polish through AIA when owner action is needed. |

## Wakeup And Activation Model

- Assignment, routine execution, or an approved wakeup can make an invokable
  agent work.
- A paused agent is intentionally quiet and should not be bypassed by another
  agent.
- `00 AIA` owns activation decisions and owner-facing packets, but normal agent
  REST access must not directly resume or pause agents.
- Actual resume/pause is performed by owner/Codex board action or a future
  approved activation bridge.
- AIA should request the smallest useful activation tree for the current scope,
  then pause back or recommend pause-back when the role is no longer needed.

## Goal, Routine, And Issue Hygiene

Before creating or accepting issue work in Stage 1, an agent must confirm:

1. The work is inside the active `LUC-25` Soar/Roost delivery mission or an
   explicitly approved successor.
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

## Paperclip Work Object Playbook

Agents are expected to use the Paperclip primitives available through the
Paperclip skill/MCP/API. Not using those primitives is a workflow defect when
work stalls, becomes unassigned, or loses traceability.

Use these operations intentionally:

- `paperclipListIssues` / issue search: check for existing active lanes before
  creating a task.
- `paperclipGetIssue` and heartbeat context: read the parent, children,
  blockers, comments, documents, work products, and current assignee before
  deciding next action.
- `paperclipCheckoutIssue`: move your assigned executable issue to active work.
  Do not manually simulate `in_progress` without a real active run.
- `paperclipCreateIssue`: create a child issue only when the child has one
  owner, a parent, a goal/project, clear expected evidence, and a return
  condition.
- `paperclipUpdateIssue`: update status, assignee, blocker links, priority, or
  parent only when the new state reflects a real operational fact.
- `paperclipAddComment`: leave progress, handoff, blocker, evidence, and
  closure synthesis in the issue thread.
- `paperclipUpsertIssueDocument`: keep plans, audits, matrices, and reusable
  proof in issue documents when they are more than a short comment.
- work products and attachments: attach inspectable evidence before claiming
  delivery, review, deploy, or production proof.
- `paperclipSuggestTasks`, `paperclipAskUserQuestions`, and
  `paperclipRequestConfirmation`: use interactions when the board/owner/AIA
  must choose, approve, or answer before safe progress.

If the next action is known and safe, create or route the child issue instead
of blocking forever. If the next action is a true decision, create an
interaction or escalate through AIA in Polish.

## Blocker And Resume Playbook

Blocked is a temporary governed state, not a parking lot.

When blocking an issue, the agent must record:

- what exact fact prevents progress;
- which issue, agent, or owner can produce that fact;
- whether a first-class `blockedByIssueIds` relation exists;
- what condition returns this issue to `todo` or active work;
- who should be woken or notified after the blocker changes.

When completing a blocker, the completing agent must notify the parent or
dependent assignee. `00 AIA`, `04 DPM`, and the relevant lead should treat
stale blocked inbox items as intervention work: resume, attach a real blocker,
delegate a missing proof issue, or escalate a real owner decision.

## Stage 1 Delivery Meaning

Current Stage 1 is no longer just a controlled dry run. It continues until
Soar and Roost are owner-usable on VPS with inspectable evidence. Reports,
plans, preflights, and child task trees are useful only if they lead to
implementation, verification, deployment readiness, production smoke, and
learning.

The active shape is:

```text
LUC-25 parent
-> app/product child lane
-> specialist child issue
-> local/code/docs/test evidence
-> review/security/deploy gate
-> commit/push/deploy observation when gated
-> production smoke when gated
-> parent synthesis
-> learning/procedure update
-> next executable child until Soar/Roost are usable
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

- Runtime behavior is being proven during Stage 1 and should be judged by
  actual Soar/Roost progress, not by plan quality alone.
- The activation bridge is policy-ready but not implemented; board/Codex action
  remains the current lifecycle mechanism.
- Conservative budget policy is accepted for Stage 1; hard limits and
  dashboard visibility should be refined from observed run data.
- Product-specific playbooks should be expanded from real Stage 1 findings,
  not invented prematurely.
