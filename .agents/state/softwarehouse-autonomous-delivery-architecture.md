# Softwarehouse Autonomous Delivery Architecture

Last updated: 2026-07-04

Purpose: define the Stage 1 operating architecture for the loop the owner wants:
agents inspect product truth, detect gaps, implement locally, verify, commit,
push when approved/appropriate, observe Coolify redeploy, smoke-test production,
learn, and repeat without creating noisy duplicate work.

This is an operating contract for Paperclip configuration. It does not start
agents, create issues, or approve Stage 1 by itself.

## Core Loop

The target loop is:

```text
intake -> architecture preflight -> PDCA plan -> implementation -> local proof
  -> review/security/doc proof -> commit -> push/deploy gate
  -> Coolify observation -> production smoke -> learning packet
  -> parent report -> next approved cycle
```

Every meaningful cycle must leave evidence. If evidence cannot be produced,
the agent reports the exact missing capability, secret, repo state, or
architecture decision instead of pretending the work is done.

## Fix Once Prevention Rule

When the owner reports a problem, or an agent detects an error, the response is
not complete after repairing the immediate symptom. The responsible operator or
agent must also look around the failure and decide whether Paperclip needs a
process, configuration, instruction, routine, permission, script, test, or
documentation update to prevent the same class of failure.

Every non-trivial incident should leave:

- immediate containment: what was fixed or paused now;
- root cause: why it happened in this Windows + Paperclip + local-agent
  environment;
- recurrence risk: where the same pattern could happen again;
- durable prevention: the smallest config/process/tooling/instruction change
  that reduces recurrence;
- learning packet: individual, department, or company-level lesson;
- verification: how the prevention was checked or how it will be checked next.

Examples:

- `recovery needed` should lead to adapter/runtime diagnosis, a targeted
  repair, and instructions or tests that prevent the same recovery loop.
- stale blockers should lead to blocker hygiene, dependent wakeups, and a rule
  that blocked work cannot park without an owner/action.
- workspace escapes should lead to path-boundary audits and no-delete/no-root
  artifact policy, not only deletion of the stray files.
- deploy or secret incidents should lead to gate and least-privilege updates,
  not only a one-off rerun.

This rule is bounded by scope: do not create broad speculative backlogs or
rewrite the company. Apply the smallest systemic correction that keeps Stage 1
moving toward usable Soar and Roost on VPS.

## Hierarchy Contract

Work flows top-down and evidence flows bottom-up.

| Layer | Accountable role | Responsibility |
| --- | --- | --- |
| Board / owner | human owner | approve Stage 1, high-risk actions, broad direction, production-risk tradeoffs |
| 00 General | `00 AIA` | route owner intent, decide whether existing policy is enough, keep company-level context coherent |
| 12 Governance | `12 CEO` | executive priority, goal fit, final business escalation |
| 01 Strategy | `01 CSO` | strategic fit, conflicts, roadmap implications |
| 04 Operations | `04 COO`, `04 DPM` | delivery flow, task structure, dependency hygiene, parent/child closure |
| 11 Innovation/Product lanes | `11 SPM`, `11 RPM`, other PMs | app-specific outcomes, product acceptance, architecture fit with Soar/Roost |
| 09 Technology | `09 CTO`, `09 TSA`, `09 EDL`, engineers, QA, DRE | architecture, execution breakdown, implementation, technical review, verification, deploy observation |
| 10 Risk | `10 SPA`, `10 CLO` | security, privacy, compliance, secrets, high-risk action gates |
| 06 Workforce | `06 AIM`, `06 CHRO`, `06 POP` | agent hiring/change packets, capacity, role fit, learning governance |

An agent that needs help may propose a subtask, but it must notify the
requesting/parent agent first and include why the subtask is needed, what
evidence will come back, and which role is the least-privilege owner.

## Reporting-Tree Routing Contract

Paperclip agents must treat `reportsTo` as the chain of command for routing,
not just a UI org chart.

Normal delegation moves through the shortest common-manager path:

1. Source specialist reports the need to its direct manager or parent issue
   owner.
2. Source manager decides whether the request is real, MECE, and aligned with
   the parent outcome.
3. Source manager escalates to the nearest common manager or `00 AIA` when the
   target owner is in another department.
4. Target department lead accepts, rejects, splits, or queues the request.
5. Target specialist executes only after the target lead/manager path is clear.
6. Evidence returns upward through the target chain and then back to the source
   parent/manager.

Example route:

`04 DSM -> 04 DPM -> 04 COO -> 00 AIA/09 CTO -> 09 QVE -> 09 TAE`

Reverse evidence route:

`09 TAE -> 09 QVE -> 09 CTO -> 00 AIA/04 COO -> 04 DPM -> 04 DSM`

Implementation requests route through EDL after CTO/TSA acceptance:

`requesting manager -> 09 CTO/09 TSA -> 09 EDL -> 09 specialist`

The return path is:

`09 specialist -> 09 EDL -> 09 CTO/09 TSA -> requesting manager`

Direct cross-department assignment is allowed only when the parent issue already
names that specialist/gate, or when there is an active emergency involving
production, security, deploy, or secrets. Emergency shortcuts must notify both
manager chains in the same issue comment.

This preserves accountability without preventing work. If the routing chain
reveals a repeated missing capability, the manager creates a capability gap
packet and routes it to `06 AIM` for the hiring/change procedure.

## Activation Governance

Agent lifecycle is governed separately from task delegation.

`00 AIA` owns the activation decision packet and now has task-assignment
authority. It does not directly resume or pause agents through normal agent REST
access. Board/operator action or an approved activation bridge performs actual
resume/pause calls.

Agents may request activation of paused specialists through their parent or
manager chain. Requests must state the needed role, parent goal/issue, expected
evidence, risk flags, cost/quota impact, and pause-back condition.

The activation policy lives in
`.agents/state/softwarehouse-agent-activation-governance.md`.

## Delegation Rule

Before a child issue/task may be created in Stage 1, the parent agent must have
enough information to answer:

- What parent outcome does this child unblock?
- Why can the current agent not complete it directly?
- Which department and role owns it?
- What is the expected artifact/evidence?
- What is the due/return condition?
- What existing open work or routine was checked to avoid duplication?
- Does this require owner approval, secrets, production, paid resources, or
  agent hiring?

If those answers are missing, the agent should ask the parent agent for a
decision instead of creating more work.

## Duplicate Prevention

Before creating new work, agents must search the active issue/task queue,
current product docs, recent comments, and applicable memory/state files for an
existing lane. If a similar lane exists, agents should attach findings or ask
the owner/parent to merge rather than create a parallel lane.

Use MECE decomposition:

- one owner per executable task;
- child tasks are mutually exclusive;
- together they cover the parent acceptance criteria;
- discovery tasks end with a decision, not with an expanding task tree.

## Blocker Hygiene

Blocked work is healthy only when it has first-class blocker issues, a named
unblock owner, and a concrete return condition. A blocked issue with no
unresolved blocker, or with blockers that are already `done`, is not a stable
resting state.

Blocker hygiene rules:

- If a blocker issue becomes `done`, the blocked dependent must be resumed or
  reclassified by its assignee or parent.
- If an issue is blocked by a fact rather than a task, create or attach the
  smallest responsible blocker issue with owner/action.
- If a parent issue is blocked by children, that is valid only while those
  children are active, queued, or explicitly blocked with their own owner.
- The blocked inbox is a queue for intervention, not a parking lot. `00 AIA`,
  `04 DPM`, and the relevant department lead should clear it by resuming,
  attaching blockers, or escalating a real owner decision.
- A blocker comment must name what fact changes the status and which agent is
  responsible for producing that fact.

## PDCA Checkpoint

Each cycle uses PDCA:

- Plan: state source-of-truth docs, risk, owner, expected evidence.
- Do: make the smallest useful change in the correct repo.
- Check: run local tests, browser checks, review, docs/evidence checks.
- Act: commit, request/push/deploy as allowed, update docs, record lessons.

No work is complete until the Check and Act parts are represented in evidence.

## Feature Slice Traceability Contract

For Soar and Roost implementation, repair, verification, and deploy-readiness
work, the executable issue must name the feature slice it is changing or
proving. A feature slice is the smallest useful end-to-end user or system
capability, not just a backend function, frontend component, or isolated test.

Before changing code, the agent must identify or refresh:

- product intent and acceptance criteria;
- user/system entrypoint, route, or trigger;
- frontend page/component/control when user-visible;
- API route, service, job, worker, adapter, or command boundary;
- database model, migration, event, queue, cache, secret ref, or external
  integration touched by the slice;
- upstream callers and downstream callees from graph, registry, code search, or
  explicit manual analysis;
- existing tests, browser proof, production proof, docs, and known blockers;
- expected parent issue and reporting path.

After changing code or evidence, the same cycle must update or explicitly
classify the affected product traceability surfaces. Prefer existing project
native sources instead of inventing duplicates:

- Soar: `docs/status/project-truth-index.md`,
  `docs/status/app-completion-index.md`,
  `docs/status/function-journey-index.md`,
  `docs/status/user-action-index.md`, `docs/graphs/*`,
  `docs/architecture/registry/*`, `docs/architecture/chains/chains.csv`,
  `docs/pipelines/*`, and module docs.
- Roost: `docs/status/project-truth-index.md`,
  `docs/status/app-completion-index.md`, `docs/status/architecture-*`,
  `docs/graphs/*`, `docs/architecture/nodes/*`,
  `docs/architecture/registry/*`, `docs/architecture/chains/chains.csv`,
  `docs/pipelines/*`, and module docs.

If a backend change affects a user-visible behavior, completion requires a
frontend impact check. If a frontend change depends on backend state,
completion requires API/data impact checks. If the code graph is incomplete,
the agent must write down the manual caller/callee search used and route a
traceability repair when the gap is reusable.

## Cross-Product Dependency Diagnosis

For portfolio products that depend on other LuckySparrow apps or external
providers, diagnosis must include provenance. A failure observed in a downstream
app may be caused by:

- the downstream app's own code, UI, API, cache, or permissions;
- an upstream LuckySparrow app providing stale, incomplete, malformed, or
  unauthorized data;
- a third-party provider connected to the upstream app or owner account;
- a broken mapping, webhook, event, import/export, file sync, queue, or polling
  contract between products;
- a missing or incorrectly scoped smoke credential or owner-linked integration
  credential.

When this pattern applies, the issue must identify:

- downstream product and feature slice;
- upstream product(s), provider(s), and data contract(s);
- expected data shape/freshness/permission assumptions;
- evidence distinguishing downstream defect from upstream-data defect;
- owner-linked or AI-smoke credential path needed for proof;
- which role owns each side of the handoff.

Do not close a downstream bug as fixed until the responsible agent has either
proved the downstream app is correct with valid upstream data, fixed the
upstream source/contract, or created a first-class blocker for the upstream
owner. Do not create work for parked products only to model this pattern; apply
it when the product lane is active.

Agents must not close product work only because a plan, report, commit, or
local unit test exists. Close only when the feature slice has current
cross-layer evidence or a clearly owned blocker under the parent.

## Deployment Closure Loop

For product changes with deployment impact:

1. Confirm product repo, branch, upstream, dirty state, and remote.
2. Commit locally or explicitly record why the work is not committable.
3. Push only when the branch state, policy, and approval gate permit it.
4. Observe Coolify through `COOLIFY_READ_API_TOKEN` first.
5. If deployment fails, capture status/log pointer and decide whether the fix is
   app code, env/config, infrastructure, or a gate.
6. Make the smallest corrective change in the owning repo/config.
7. Re-observe deployment until it is healthy or a real blocker is escalated.
8. Run production smoke using the app-specific test account secret refs.
9. Record production URL, smoke steps, result, and residual risk.

Deploy-token or UI-login actions are restricted to the configured
least-privilege roles and remain gated.

## Evidence Of Done

A delivery item is not done without:

- architecture/source-of-truth fit or approved deviation;
- local verification evidence;
- review evidence appropriate to risk;
- documentation/index update evidence when behavior changed;
- source-control state;
- deploy/Coolify evidence when deployment is affected;
- production smoke evidence when production behavior is affected;
- learning packet when the cycle found a reusable lesson.

## Learning Architecture

Agents learn through packets, not self-modification.

Learning levels:

- individual: what this role should do differently next time;
- department: pattern affecting that department's playbook or checklist;
- company: policy, routine, skill, access, or instruction change proposal.

Learning packets go upward through the parent/department lead. Instruction,
skill, permission, routine, secret, or agent changes are applied only through
the governed path. `06 AIM` is the only AI-agent hiring/creation authority and
does not self-approve new agents.

## Stage 0 Guard

This architecture is installed during Stage 0 only as configuration. It does
not authorize agents to start, routines to run, issues to be created, pushes to
happen, or production to be changed. Stage 1 still requires explicit owner
approval.
