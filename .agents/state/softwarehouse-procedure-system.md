# Softwarehouse Procedure System

Last updated: 2026-07-04

Purpose: define how LuckySparrow Softwarehouse agents create, follow, review,
and improve procedures/flows without acting blindly or creating noisy task
trees.

This is a Stage 0 configuration contract. It does not create Paperclip issues,
run routines, or approve Stage 1.

## Core Principle

Agents may create and update work only inside a known operating path:

```text
goal -> procedure -> parent issue -> child issues -> evidence -> closure
  -> retrospective -> procedure update proposal
```

If an agent cannot name the goal, procedure, parent owner, expected evidence,
and closure condition, it should not create a new task. It should report a
planning gap to the parent/requesting agent.

Goal and routine ownership is governed by
`.agents/state/softwarehouse-goal-routine-governance.md`. Raw API permission is
not enough; agents must follow the owner/department/accountability matrix
before proposing or changing goals/routines.

## Paperclip Capabilities To Use

Paperclip already provides the raw primitives needed for this model:

- goals connect work to business intent;
- projects group time-bound deliverables;
- issues are the executable work unit;
- `parentId` supports sub-issues and multi-level breakdown;
- workflow states model triage, backlog, unstarted, started, completed, and
  cancelled categories;
- issue relations model blockers, duplicates, and related work;
- comments carry coordination and parent/child status;
- work products carry inspectable evidence;
- routines can create execution issues and keep revision history;
- routines can stay paused/inactive in Stage 0.

The missing part is operating discipline: every created task must be traceable
to a procedure and reviewed after execution.

## Procedure Card

Every repeatable flow should be represented by a procedure card in `.agents`
memory, a product repo doc, a Paperclip routine description, or a future
CompanyCore/Roost procedure record.

Minimum procedure card fields:

- id: stable slug, for example `PROC-SH-DELIVERY-CLOSURE`;
- title with department prefix;
- owner department and accountable agent role;
- trigger: what starts the procedure;
- entry criteria: what must be true before it starts;
- inputs: docs, repo, secrets, issue, project, product, environment;
- steps: small numbered actions;
- decision gates: owner/security/deploy/finance/legal approval points;
- outputs: artifacts, comments, commits, work products, docs, metrics;
- evidence checklist;
- exit criteria;
- retrospective questions;
- update path: who may propose and approve changes;
- related skills/tools/secrets.

## Procedure Lifecycle

Procedures have their own lifecycle:

| State | Meaning |
| --- | --- |
| Draft | Proposed, not yet used by autonomous agents. |
| Paused | Configured but inactive; allowed in Stage 0. |
| Active | Approved for Stage 1 execution. |
| Review | A run found friction or failure; improvement packet is pending. |
| Superseded | Replaced by a newer procedure; keep history but do not use for new work. |
| Archived | No longer relevant. |

Stage 0 procedures should remain Draft or Paused.

## Initial Procedure Registry

These procedures should guide the first Stage 1 cycles:

| Id | Department | Owner | Purpose | Current state |
| --- | --- | --- | --- | --- |
| `PROC-00-INTAKE-ROUTING` | 00 Ogolny | `00 AIA` | turn owner/company intent into routed work or approval request | Paused |
| `PROC-04-TASK-DECOMPOSITION` | 04 Operacje | `04 DPM` | split parent outcomes into MECE child issues with closure criteria | Paused |
| `PROC-04-PROCEDURE-RETRO` | 04 Operacje | `04 COO` | review completed procedure runs and propose improvements | Paused |
| `PROC-09-DELIVERY-CLOSURE` | 09 Technologia | `09 CTO` / `09 DRE` | close code -> test -> commit -> deploy observation -> prod smoke loops | Paused |
| `PROC-09-EVIDENCE-GATE` | 09 Technologia | `09 QVE` | verify done evidence before completion | Paused |
| `PROC-10-SECRET-DEPLOY-GATE` | 10 Prawo | `10 SPA` | gate secrets, production, deploy, privacy, and security-sensitive actions | Paused |
| `PROC-06-AGENT-HIRING` | 06 Kadry | `06 AIM` | evaluate, approve, create, onboard, and review AI agents | Paused |
| `PROC-11-PRODUCT-ARCHITECTURE-PREFLIGHT` | 11 Innowacje | `11 SPM` / `11 RPM` | read product architecture and define accepted product outcome before implementation | Paused |

## Procedure Run Record

Each meaningful run should leave a compact record in the parent issue comment,
work product, or future procedure-run record:

- procedure id and version/date;
- triggering goal/project/issue;
- parent and child issue ids;
- agents involved;
- decision gates encountered;
- evidence produced;
- outcome: completed, blocked, cancelled, superseded, or needs review;
- time/cost/risk observations when known;
- lessons and proposed procedure changes.

## Retrospective Questions

After closing a parent issue or procedure run, the accountable parent agent must
answer:

- Did the procedure produce the intended goal?
- Were child tasks necessary, MECE, and closed constructively?
- Did any child task lack context, tool, secret, skill, or owner?
- Did any agent duplicate work or bypass parent reporting?
- Which step created the most friction?
- What should change before the next run: instruction, skill, routine, access,
  tool, product doc, test, or procedure?

If there is no improvement, record "no change" with evidence. Silence is not a
retrospective.

## Procedure Improvement Path

Agents may propose procedure changes. They may not self-approve changes that
alter authority, secrets, production gates, hiring, or company policy.

Improvement flow:

1. Agent creates a learning/procedure packet.
2. Parent agent reviews whether this is individual, department, or company
   level.
3. Department owner accepts, rejects, or escalates.
4. Company-level changes go to `00 AIA`, `12 CEO`, or owner depending on risk.
5. `06 AIM` handles agent hiring or role changes only after the hiring
   procedure passes.
6. Approved changes update the relevant procedure card, instructions, routine,
   skill, or product documentation before the next run.

## Do Not

- Do not create tasks from vague curiosity.
- Do not create child tasks without a parent outcome and return condition.
- Do not leave a parent issue open with completed children but no synthesis.
- Do not close a parent issue if children are incomplete, cancelled without
  explanation, or missing evidence.
- Do not run the same procedure repeatedly without reading the previous run's
  lesson packet.
