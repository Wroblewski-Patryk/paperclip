# Softwarehouse Task Lifecycle Contract

Last updated: 2026-07-10

Purpose: define how agents should create, update, decompose, close, and learn
from Paperclip tasks/issues in the context of the whole organization.

This contract uses Paperclip's existing issue, parent issue, workflow state,
relation, comment, goal, project, and work-product primitives.

## Kanban As The Board Standard

Paperclip's issue system is the Softwarehouse Kanban board. Agents should use
goals to preserve business intent, routines/procedures to run repeatable loops,
and issues/tasks to manage the visible flow of work.

Kanban is the default standard for daily planning and task movement:

- `backlog`: valid work exists but is not ready or not currently selected;
- `todo`: ready or discovery-ready work with an owner and next action;
- `in_progress`: only a live checked-out execution lane;
- `in_review`: independent review, QA, security, ops, PM, acceptance gate, or
  typed interaction with a named waiting path;
- `blocked`: progress is stopped by a named blocker, owner, and unblock
  condition;
- `done`: accepted or evidence-backed completion;
- `cancelled`: duplicate, invalid, superseded, or intentionally abandoned with
  reason.

Kanban flow rules:

- visualize meaningful work as issues or child issues rather than hidden notes;
- keep one accountable owner per executable issue;
- limit WIP: a specialist should run one active lane at a time, while managers
  may maintain an ordered queue of `todo/backlog` lanes;
- pull the next lane only after the current lane has a durable disposition:
  `done`, `blocked`, `in_review`, `delegated`, `todo`, or `cancelled`;
- avoid circular or speculative backlog; create the smallest child issue that
  enables progress;
- if a blocker clears, resume/reclassify the dependent issue or notify the
  parent/assignee.

PDCA remains the improvement cycle around Kanban: Plan the lane, Do the work,
Check evidence, Act by updating docs, procedures, skills, or follow-up tasks.

## Creation Gate

Before creating a new issue/task in Stage 1, an agent must know:

- department prefix and accountable owner;
- linked company goal or parent issue;
- procedure id or explicit reason this is a first-time procedure discovery;
- product/repo/project if relevant;
- why existing work cannot absorb the finding;
- expected output and evidence;
- assignee role and why it is the least-privilege owner;
- done criteria and reviewer;
- risk gates: owner approval, secrets, production, paid resource, security,
  legal, finance, deploy, or hiring.
- activation state: whether the intended assignee is active or paused, and
  whether an AIA activation request is needed.

If any item is unknown, create a planning comment/request to the parent rather
than a new standalone task.

## Paperclip Operation Contract

Agents should use Paperclip work-object tools instead of working only in free
text. The expected primitive depends on the situation:

| Situation | Expected Paperclip operation |
| --- | --- |
| Need to know current work | List/get issue, read parent/children/comments/documents/work products. |
| Starting assigned executable work | Checkout the issue so `in_progress` reflects a real active run. |
| Need a specialist slice | Create a child issue with parent, goal/project, assignee, expected evidence, and return condition. |
| Need owner/AIA choice | Create an interaction (`suggest_tasks`, `ask_user_questions`, or `request_confirmation`) rather than blocking silently. |
| Need to report progress | Add a concise issue comment with facts, evidence links, and next step. |
| Need durable plan/proof | Upsert an issue document or attach a work product/artifact. |
| Need review/acceptance | Move to `in_review` only with a structured handoff packet and a real Paperclip waiting primitive. |
| Need to block | Set blocked status and attach or name the first-class blocker, unblock owner, and resume condition. |
| Blocker is cleared | Resume/reclassify the dependent issue or notify the parent/assignee with the next action. |

Creating too many issues is bad, but failing to create the one issue that
unblocks a specialist is also bad. The rule is: create the smallest executable
child that preserves ownership and evidence; otherwise comment or ask the
parent/AIA for a decision.

`suggest_tasks` is not an approval gate for ordinary internal delegation. If
the parent already names the specialist or gate owner and the proposed child is
bounded, safe, and requires no protected mutation, credential, budget, or owner
choice, create the child directly through the permitted reporting route. Use a
typed interaction only when the board or owner must make a real decision that
changes scope or authority.

## Structured `in_review` Handoff Packet

`in_review` is valid only when the next decision path is inspectable. Before
moving an issue into `in_review`, the handoff comment, issue document, or work
product must name these five fields:

- reviewer: the typed execution participant, human assignee, approval owner,
  interaction responder, or monitoring owner;
- decision options: the allowed outcomes, such as approve, request changes,
  reject, answer questions, accept/reject confirmation, or continue monitoring;
- evidence: links to comments, issue documents, work products, artifacts,
  tests, screenshots, logs, or other proof the reviewer must inspect;
- deadline/cooldown: when the reviewer should decide, or when the monitor
  should wake/check again;
- next owner: who resumes work after each decision outcome.

The packet must be backed by a real Paperclip primitive, not only an
unstructured comment. Valid waiting primitives include:

- an execution-policy review participant on the issue;
- an issue-thread interaction: `request_confirmation`, `ask_user_questions`, or
  `suggest_tasks`;
- a linked board approval;
- reassignment to a named human reviewer or acceptance owner;
- an explicit monitor/recovery path that will wake the owner after the stated
  cooldown.

If the typed waiter lives on a child issue, the parent should usually be
`blocked` by that child via `blockedByIssueIds`, not `in_review`. The parent may
sit in `in_review` only when the waiting primitive is attached directly to the
parent or the named human reviewer owns the parent decision.

## Parent Issue Contract

A parent issue is a small mission, not a dumping ground.

Parent issue description should include:

- goal/outcome;
- procedure id;
- source-of-truth docs read;
- scope and non-scope;
- child issue plan or decomposition rule;
- required evidence;
- closure synthesis owner;
- review/acceptance owner.

A parent issue may be closed only when:

- all required child issues are completed, cancelled with reason, or replaced
  by a linked successor;
- parent evidence summarizes child results;
- blockers and duplicate relations are resolved or explained;
- the next action is clear: no follow-up, new parent, owner decision, or
  procedure improvement.

## Child Issue Contract

A child issue must be executable by one assignee.

Child issue description should include:

- parent issue id;
- exact slice of parent outcome;
- inputs and constraints;
- expected artifact/evidence;
- return condition to parent;
- dependencies/blockers;
- risk gates;
- "do not do" boundary.

Child issues should not create further children unless their parent agent is
notified and the split passes the delegation rule.

## Cross-Department Child Issue Routing

An agent must not create a child issue directly for a specialist outside its
reporting subtree unless the parent issue already names that specialist/gate or
an emergency exception is documented.

Use the shortest reporting-chain route:

1. Source agent comments to its manager or parent owner with the needed
   capability.
2. Source manager validates the need and checks for duplicate/open work.
3. Source manager escalates to the nearest common manager or `00 AIA`.
4. Target department lead assigns/queues the correct specialist.
5. Specialist returns evidence to the target lead, then back through the source
   chain.

Example:

`04 DSM -> 04 DPM -> 04 COO -> 00 AIA/09 CTO -> 09 QVE -> 09 TAE`

The issue or comment must include source manager, target lead, expected
artifact, return condition, and blocker rule. If the chain is missing a needed
role, route a capability/hiring packet to `06 AIM`; do not invent a direct
shadow relationship.

## Updating Work

Agents should update tasks through comments/status rather than silently
rewriting intent.

Use comments for:

- status changes and evidence links;
- blocker reports;
- child completion summaries;
- decision requests;
- procedure lessons;
- handoff notes.

Use issue updates for:

- status transition;
- assignee change;
- parent/reparent;
- goal/project correction;
- priority/due-date changes;
- explicit scope correction approved by parent.

## Workflow State Expectations

Use the Paperclip workflow categories intentionally:

- Triage: needs classification or parent decision.
- Backlog: valid but not ready.
- Unstarted: ready with owner, context, and acceptance criteria.
- Started: active work; agent should report progress and blockers.
- Completed: evidence exists and parent/reviewer can inspect it.
- Cancelled: duplicate, invalid, superseded, or intentionally abandoned with
  reason.

Do not use Completed as "I stopped working". Use Blocked/Cancelled/parent
comment when the task cannot be constructively closed.

Do not leave `in_progress` after the run is over. A run must end by moving the
issue to `done`, `blocked`, `in_review`, `todo`, `cancelled`, or by creating a
clear handoff child. Parent/controller issues should not stay active only
because a report exists.

## Constructive Closure

Every closed task should leave one of these endings:

- Delivered: output exists and evidence proves it.
- Blocked: exact blocker and owner of next action are known.
- Cancelled: reason is clear and no useful work remains.
- Superseded: successor issue or procedure is linked.
- Learning: no product change, but a procedure/instruction/tool improvement is
  proposed.

Parent closure must synthesize child endings into one readable result.

## Optimization Loop

After completing a parent issue or routine-created execution issue, agents must
optimize before the next run:

1. Compare planned steps with actual steps.
2. Identify waste: duplicate search, missing context, wrong owner, missing
   tool, missing secret, unclear evidence, too-large task, or late risk gate.
3. Decide improvement type:
   - knowledge: update docs/memory/index;
   - skill: add or attach a skill;
   - tool: add/repair a tool or integration;
   - procedure: change steps/gates/evidence;
   - access: request least-privilege resource binding;
   - staffing: route hiring packet through `06 AIM`;
   - product: update product architecture or backlog.
4. Submit a learning/procedure packet.
5. Parent/dept lead approves or rejects before the next procedure run depends
   on it.

## Organization-Level Task Hygiene

`04 Operacje` owns task hygiene and parent/child closure discipline.
`00 AIA` owns company-level routing. `12 CEO` owns executive escalation.
`09 QVE` and relevant PMs own evidence quality for product work.

Recurring checks:

- no orphan active tasks without parent, goal, project, or procedure;
- no parent issues with completed children and no synthesis;
- no repeated duplicate tasks;
- no tasks assigned to paused/unavailable roles unless intentionally queued;
- no paused specialist activated without an activation request packet and
  parent/AIA approval path;
- no deployment-affecting tasks closed without source-control/deploy/prod
  evidence;
- no learning packets left unreviewed when a procedure is about to run again.
