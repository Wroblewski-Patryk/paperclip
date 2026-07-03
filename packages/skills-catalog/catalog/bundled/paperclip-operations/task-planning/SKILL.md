---
name: task-planning
description: Turn a Paperclip issue or request into a structured implementation plan with child task graph, blockers, owners, and acceptance criteria, then save it as the issue `plan` document.
key: paperclipai/bundled/paperclip-operations/task-planning
recommendedForRoles:
  - manager
  - engineer
  - product
tags:
  - paperclip
  - planning
  - issues
  - delegation
---

# Task Planning

Produce implementation plans that the Paperclip executor can actually run: explicit child issues, real blockers, named owners, and a defined acceptance bar. Avoid plans that read well but cannot be split into work.

## When to use

- An issue asks you to "plan", "scope", "break down", "design the rollout", "propose the work", or similar.
- A user wants a written plan before approving implementation.
- A manager needs to delegate non-trivial work and the shape of the work is not obvious yet.
- You inherited an issue too large to deliver in one heartbeat and need to split it.

## When not to use

- The issue is a single small change you can ship in the same heartbeat. Just ship it.
- The issue is forensic ("why did this break"). Use a diagnosis skill first; plan only after the root cause is named.
- A current `plan` document already exists and the change is minor. Update that document; do not start fresh.

## Outputs

1. An updated issue document with key `plan` (markdown).
2. A short comment on the issue that links to the plan document and names the next action.
3. Where the plan requires approval, an issue-thread interaction of kind `request_confirmation` bound to the latest plan revision.

Do not create implementation subtasks until the plan is accepted.

## Delegation standard

Use this standard whenever a plan will be executed by more than one agent, a manager will hand work to reports, or the issue is large enough that responsibility can blur.

1. Start from the business process, not the org chart. Frame the work as an APQC-style value chain: trigger, inputs, transformation steps, controls, outputs, customer/user outcome, and feedback loop. This prevents teams from creating issues that are internally neat but do not move the real process.
2. Split MECE where practical. Child issues should be mutually exclusive in ownership and collectively sufficient for the parent acceptance bar. If two children can edit the same file, own the same decision, or claim the same proof, redraw the boundary.
3. Assign one directly responsible owner per child. Use RACI/DACI language when helpful, but never let it weaken the single-assignee model: one owner decides or delivers, named reviewers advise/verify, and blockers name the next owner/action.
4. Separate decision work from execution work. Strategy, product acceptance, architecture, implementation, QA, security, ops, docs, and source-control closure are different lanes unless the task is genuinely tiny.
5. Keep WIP visible. Managers may coordinate many queued issues, but each active execution lane should have one live owner and one live next action. Do not create a swarm of vague `in_progress` children.
6. Define Definition of Ready for every child: context, owner specialty, input artifacts, allowed scope, dependencies, and the first action the assignee can take without re-asking.
7. Define Definition of Done for every child: deliverable, proof command or evidence, review/gate owner if needed, and the status/comment/work-product update required before handoff.
8. Escalate missing capability instead of hiding it. If no current agent owns the specialty, create a hire/request/board decision lane rather than assigning the work to the nearest manager.

## Plan structure

Required sections, in order:

1. **Goal** — one paragraph. What changes for the user, the operator, or the system once this work lands.
2. **Context reviewed** — bullet list of documents, files, and prior issues you read. Lets reviewers spot missing inputs.
3. **Constraints and non-goals** — what must hold (compatibility, security, performance) and what this plan deliberately will not do.
4. **Approach** — the chosen path, with a short rationale. If you considered alternatives, name them and why you rejected them.
5. **Work breakdown** — ordered list of child issues. Each child has:
   - Title in imperative form.
   - Owner specialty (Engineer, QA, Designer, Security, DevRel, Manager, etc.).
   - Scope and deliverables.
   - Acceptance criteria.
   - Definition of Ready and Definition of Done.
   - Directly responsible owner plus reviewers/consulted roles where relevant.
   - Blocks/blocked-by relationships expressed by phase letter or child title.
6. **Acceptance** — the bar for the parent issue. How the user knows the whole thing is done.
7. **Risks and mitigations** — short list. Skip if there are none.
8. **Deferrals** — what is intentionally pushed to follow-up issues, with why.

## Rules of thumb for splitting

- One child issue, one specialty. If two specialties have to coordinate inside the same issue, split it.
- One child issue, one acceptance verdict. If a reviewer would say "this is half done", split it.
- A child must be checkout-able by the owner from its title and description alone. Reviewers should not have to re-read the parent plan to understand a child.
- Order children by real blocker chains, not by author preference. Parallel children should explicitly say `blockers: none`.
- Avoid `polish` or `cleanup` child issues without acceptance criteria — they never close.

- Avoid responsibility fog: `coordinate`, `support`, `assist`, and `review later` must resolve into either a named owner action, a reviewer/gate, or a blocker.
- Prefer a broad-to-narrow-to-broad loop for complex work: map the process and risks, create narrow owned lanes, execute, verify, then integrate evidence back into the parent.

## Manager checklist before filing

- [ ] The parent goal and user/company outcome are explicit.
- [ ] The child set is MECE enough that no two children own the same decision, file surface, acceptance proof, or final handoff.
- [ ] Every child has one directly responsible owner, one owner specialty, Definition of Ready, Definition of Done, and acceptance proof.
- [ ] Blockers use first-class `blockedByIssueIds` in the task graph after filing, not only prose.
- [ ] Review, QA, security, ops, docs, and source-control closure are separate lanes when risk or evidence requires them.
- [ ] Missing agents, permissions, credentials, product decisions, or external inputs are surfaced as explicit blockers or follow-up issues.
- [ ] The parent can be closed only after child evidence is integrated, not merely after children were created.

## Filing the plan

Use the Paperclip API to write the plan document, then comment:

- `PUT /api/issues/{issueId}/documents/plan` with the markdown body. If `plan` already exists, include the latest `baseRevisionId`.
- `POST /api/issues/{issueId}/comments` with a short summary that links the plan: `/<prefix>/issues/<issue-id>#document-plan`.
- If approval is required: `POST /api/issues/{issueId}/interactions` with `kind: request_confirmation`, `targetRevisionId` set to the new plan revision, `continuationPolicy: wake_assignee`, and `idempotencyKey: "confirmation:{issueId}:plan:{revisionId}"`.
- Set the issue to `in_review` after creating the confirmation. Stay assigned so the acceptance wakes the planner.

When the plan is accepted, see the companion skill for converting accepted plans into Paperclip executable tasks.

## Anti-patterns

- Plan disguised as a description edit. Use the `plan` document.
- "Phases A–Z" with no work breakdown inside the phases.
- Children with descriptions that say "see parent" — they fail at delegation time.
- Acceptance written as "code review approval". Reviewers need a behavior bar, not a process bar.
- Plans that bury blocker chains in prose. Use explicit blocked-by lines.
