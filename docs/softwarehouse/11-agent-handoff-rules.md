# Agent Handoff Rules

Status: active baseline
Date: 2026-06-03
Owner: Engineering Delivery Lead

Handoffs keep autonomy from turning into chaos.

## Required Handoff Fields

- source issue
- receiving owner or role
- affected project/layer
- files/docs to read
- expected output
- acceptance criteria
- verification required
- blocker if the handoff cannot proceed
- due/priority signal when relevant

## When To Handoff

- task crosses role boundaries
- implementation needs architecture decision
- product acceptance is unclear
- QA evidence is missing
- security/deploy risk appears
- data model changes affect backend/frontend contracts
- the current agent lacks tool access

## Reporting-Tree Routing

Use the organization chart as the routing map. A handoff is not only "who can
do the work"; it is also "which manager owns the decision to spend that role's
attention".

Allowed direct handoffs:

- manager to direct report;
- direct report to manager;
- sibling to sibling when the shared manager is named and notified;
- specialist to reviewer/QA/Ops/Security when the parent issue already names
  that gate.

For cross-department work, climb to the nearest common manager, then descend
through the target department lead. Example:

`04 DSM -> 04 DPM -> 04 COO -> 00 AIA/09 CTO -> 09 QVE -> 09 TAE`

`04 DSM` should not create a direct `09 TAE` task. It should request routing
from `04 DPM` or `04 COO`, who then coordinates with `09 CTO`/`09 QVE`.

Every cross-department handoff must include:

- source agent and source manager;
- target department lead and target specialist;
- parent issue and business reason;
- expected evidence and return condition;
- whether this is normal routing or an emergency exception.

Emergency exception: if a production, security, deploy, or secret-risk issue
requires immediate attention, the source agent may mention the specialist
directly, but the same update must notify both manager chains and explain why
the shortcut was necessary.

## When To Ask Human

Ask Patryk only for:

- secrets or credentials not available through approved channels
- irreversible production mutation
- paid account/subscription mutation
- live exchange or live financial action
- legal/commercial decision
- destructive repository action
- ambiguous product decision where local docs cannot resolve the choice
