# Softwarehouse Agent Activation Governance

Last updated: 2026-07-04

Purpose: define how agents may be turned on/off during active Stage 1 without
losing owner control, least privilege, or scope discipline.

## Verified Paperclip Capability

- REST endpoints exist for board/operator-controlled agent lifecycle:
  - `POST /api/agents/:id/resume`
  - `POST /api/agents/:id/pause`
- These REST endpoints require a board actor. A normal agent API key cannot
  directly resume or pause agents through these routes.
- Paperclip plugin host capabilities include `agents.pause` and
  `agents.resume`, so an approved plugin/automation/board-level bridge can
  technically execute lifecycle changes.
- A paused agent is assignable to work, but not invokable. Assigning work to a
  paused agent can express demand, but the agent will not run until resumed.
- `00 AIA` has `canAssignTasks: true` and `canCreateAgents: false`.
- `06 AIM` remains the only AI-agent creation/hiring authority.

## Operating Model

The owner or Codex gives the Stage 1 start signal to `00 AIA`.

`00 AIA` does not bulk-resume the company blindly. It prepares an activation
packet and selects the smallest sufficient activation tree for the current
mission.

Activation tree principle:

```text
owner/Codex signal
  -> 00 AIA decision packet
  -> approved activation bridge / board operator action
  -> minimal active agent set
  -> task demand discovers needed roles
  -> parent/manager requests additional activation
  -> AIA approves or escalates
  -> bridge resumes or pauses selected agents
```

## Who Decides

| Decision | Owner |
| --- | --- |
| Stage 1 start | Owner, optionally assisted by Codex |
| Initial activation packet | `00 AIA` |
| Agent resume/pause execution | Owner/Codex board action or approved activation bridge |
| Task routing and assignment | `00 AIA`, parent agents, department owners |
| Hiring/new agent creation | `06 AIM` only, after hiring procedure |
| High-risk production/secrets/cost expansion | Owner/AIA/CEO/SPA/CFO according to risk |

## Current Stage 1 Active Set

The controlled dry run has completed. The current active app-factory core is:

- `00 AIA`, `01 CSO`, `02 CPO`, `02 UID`, `02 UXW`, `02 WPM`;
- `04 COO`, `04 DPM`, `04 DSM`;
- `06 AIM`;
- `07 CFO`;
- `08 CAO`;
- `09 CTO`, `09 TSA`, `09 EDL`, `09 CBE`, `09 FEW`, `09 DBE`, `09 IDE`,
  `09 RTE`, `09 TAE`, `09 QVE`, `09 CRS`, `09 DRE`;
- `10 CLO`, `10 SPA`;
- `11 CINO`, `11 IPM`, `11 SPM`, `11 RPM`.

Still paused/out of scope unless separately approved:

- `03 CRO`, `05 CCO`, `05 CSM`, `06 CHRO`, `06 POP`, `11 APM`, `11 FPM`,
  `11 NPM`, `12 CEO`.

Do not resume every agent just because they exist. Resume additional roles only
when the work remains inside the `LUC-25` Soar/Roost delivery mission or the
owner explicitly expands scope.

## Activation Request Packet

When an active agent needs a paused specialist, it should send an activation
request upward, not self-resume anyone.

Required fields:

- requesting agent;
- parent issue or goal;
- needed agent/role;
- why the current active set cannot complete the work;
- exact task or evidence the agent will produce;
- expected duration or stop condition;
- risk flags: secrets, production, deploy, cost, legal, finance, hiring;
- existing work checked to avoid duplication;
- whether the agent should be paused again after completion.

## AIA Decision Criteria

AIA may recommend activation when:

- the request is tied to an approved Stage 1 goal;
- the work remains inside active innovation lanes, initially Soar/Roost;
- the requested role is least-privilege for the task;
- no existing active agent can reasonably do the work;
- cost/quota and risk are understood;
- parent/child reporting and evidence return condition are clear.

AIA should reject or escalate when:

- the request would broaden work beyond the approved mission;
- it touches Featherly, Aviary, or Nest before VPS plus owner activation;
- it requires production mutation, secret rotation, paid resources, or broad
  deploy action without an explicit gate;
- it asks to hire/create a new agent without `06 AIM` procedure;
- it is duplicate, vague, or missing evidence expectations.

## Pause-Back Rule

Agents resumed for a narrow role should be paused again when:

- their assigned slice is done and evidence returned;
- the parent issue is blocked on owner input;
- cost/quota pressure appears;
- the agent begins expanding scope outside its activation packet;
- the Stage 1 mission narrows and the role is no longer needed.

## Implementation Note

Because normal agent REST access cannot call `/agents/:id/resume` or
`/agents/:id/pause`, the practical v1 implementation is:

1. AIA decides and records the activation packet.
2. Owner/Codex or an approved activation bridge performs the resume/pause.
3. The bridge logs which agents were changed and why.
4. AIA reports the active tree to the owner in Polish.

Do not build a code bridge in Stage 0 unless the owner explicitly asks. The
policy is ready; the technical bridge is a future controlled implementation
choice.
