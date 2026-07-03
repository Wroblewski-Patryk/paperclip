---
name: agent-development-review
description: Review completed agent work for repeatable lessons, then propose or apply bounded updates to agent instructions, skills, routines, or role boundaries without creating ungoverned meta-work.
key: paperclipai/bundled/paperclip-operations/agent-development-review
recommendedForRoles:
  - manager
  - hr
  - people-ops
  - operations
tags:
  - paperclip
  - agents
  - continuous-improvement
  - routines
  - skills
---

# Agent Development Review

Use this skill when a manager or people-ops agent needs to improve how agents work based on evidence from completed issues, stalled work, repeated mistakes, or recurring handoff friction.

The goal is not to make agents endlessly self-edit. The goal is to turn repeated pain into one durable improvement that reduces future work.

## When to use

- A daily or weekly routine asks for agent quality, staffing, or capability review.
- A completed issue contains a lesson that should change a role instruction, shared rule, skill, routine, or template.
- Multiple agents repeat the same mistake, miss the same evidence, or misunderstand the same boundary.
- A manager notices that work repeatedly stalls because no current role clearly owns the next action.
- A new Paperclip release or local configuration change adds a capability agents should start using.

## When not to use

- One task failed once and the cause is obvious. Fix the task first.
- The proposed change is only a preference and has no evidence.
- The update would give an agent broader authority without board or manager approval.
- The change touches secrets, production deployment, paid accounts, or destructive operations. Route those through the normal approval path.

## Inputs

Collect only enough evidence to decide whether a durable change is justified:

- Recent completed, blocked, reopened, or productivity-review issues.
- Agent comments, plans, work products, and verification notes.
- Current role instructions, installed skills, routines, and manager hierarchy.
- Release notes, local docs, or API docs when the change depends on current Paperclip behavior.
- Existing company talent or process policies.

Do not browse broadly just to find novelty. Browse or check upstream only when the improvement depends on current external behavior.

## Review loop

1. Pick a small sample.
   Review the last day of relevant agent work, or the smallest set that shows the repeated pattern.

2. Classify each signal.
   Use one of these labels:
   - `instruction_gap`: the agent lacked a rule or used an unclear one.
   - `skill_gap`: the work needs a reusable procedure.
   - `routine_gap`: the company needs a scheduled or triggerable checkpoint.
   - `role_gap`: ownership is missing or too broad.
   - `tool_gap`: a tool, adapter, API, or config option should be exposed.
   - `one_off`: useful context, but not worth changing durable instructions.

3. Require evidence before changing durable state.
   A durable change needs at least one of:
   - two similar failures or stalls;
   - one high-severity failure;
   - one repeated manual correction from the board or manager;
   - one new platform capability that clearly replaces a brittle workaround.

4. Choose the narrowest target.
   Prefer the smallest durable location:
   - one role instruction for role-specific behavior;
   - one shared instruction for cross-role behavior;
   - one skill for repeatable workflow;
   - one routine for recurring detection;
   - one role proposal only when responsibility will recur and no current role owns it.

5. Decide apply vs propose.
   Apply directly only when the change is low-risk, local, and within the assignee's authority. Otherwise create a proposal issue or request confirmation.

6. Record a retirement condition.
   Every new role, routine, or heavy instruction should say when it can be paused, merged back, or removed.

## Output format

Post a concise review with these sections:

```md
## Agent Development Review

### Signals Reviewed
- <issue or run>: <signal label> - <evidence>

### Durable Changes
- Applied: <file/skill/routine/agent config changed> - <why>
- Proposed: <follow-up issue or approval> - <owner>

### Not Changed
- <signal> - one-off or insufficient evidence

### Next Review
- Cadence: <daily/weekly/manual>
- Watch for: <specific pattern>
```

If no change is justified, say so. A clean "no durable change" is a valid successful review.

## Guardrails

- Do not modify another agent's identity, role, budget, adapter config, or schedule without the appropriate manager or board approval.
- Do not add broad "be better" instructions. Write observable behavior: what to read, what to output, who owns the next step, and how to verify.
- Do not let a review routine generate unlimited follow-up work. Cap each review to one applied change and up to three proposed follow-ups unless the board asks for more.
- Never rewrite strategic docs wholesale. Add small, dated, evidence-backed updates.
- Preserve company boundaries. Lessons from one company can become a reusable skill only after removing company-private details.

## Good change examples

- Add a role instruction: "When a task is blocked by missing credentials, mark it blocked and name the required secret owner instead of retrying."
- Add a skill: "Use this acceptance report format after every browser verification."
- Add a routine: "Daily scan for done issues missing proof links."
- Propose a role split: "QA repeatedly builds Playwright tests and verifies product flows; split Test Automation from QA only if this recurs across three issues."

## Bad change examples

- "Agent should be smarter and proactive."
- "Give every agent permission to change routines."
- "Create a new specialist because one issue was hard."
- "Browse the internet daily for random AI tips and paste them into prompts."
