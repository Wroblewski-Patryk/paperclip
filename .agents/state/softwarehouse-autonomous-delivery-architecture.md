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
| 09 Technology | `09 CTO`, engineers, QA, DRE | implementation, technical review, verification, deploy observation |
| 10 Risk | `10 SPA`, `10 CLO` | security, privacy, compliance, secrets, high-risk action gates |
| 06 Workforce | `06 AIM`, `06 CHRO`, `06 POP` | agent hiring/change packets, capacity, role fit, learning governance |

An agent that needs help may propose a subtask, but it must notify the
requesting/parent agent first and include why the subtask is needed, what
evidence will come back, and which role is the least-privilege owner.

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

## PDCA Checkpoint

Each cycle uses PDCA:

- Plan: state source-of-truth docs, risk, owner, expected evidence.
- Do: make the smallest useful change in the correct repo.
- Check: run local tests, browser checks, review, docs/evidence checks.
- Act: commit, request/push/deploy as allowed, update docs, record lessons.

No work is complete until the Check and Act parts are represented in evidence.

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
