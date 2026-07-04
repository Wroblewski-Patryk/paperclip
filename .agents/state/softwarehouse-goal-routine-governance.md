# Softwarehouse Goal And Routine Governance

Last updated: 2026-07-04

Purpose: define who is responsible for creating, changing, reviewing, and
activating Paperclip goals and routines in LuckySparrow Softwarehouse.

## Short Answer

`00 AIA` is the intake and routing owner for company-level goal/routine
proposals.

`12 CEO` is the executive owner for company-level goal fit and priority.

`04 COO` owns operating process coherence and routine hygiene.

Department owners own goals/routines inside their department.

`06 AIM` owns AI-agent hiring/governance routines only; it does not own all
company routines just because it can create agents.

The owner remains the approval authority for Stage 1 activation, broad company
direction, production risk, cost risk, secrets, hiring authority, and anything
commercially or legally meaningful.

## Technical Reality In Paperclip

Current verified implementation:

- Goals can be created/updated through the goals API by an actor with company
  access. The API itself does not encode the full business governance model.
- Routines can be created/updated by board actors. Agent actors can manage
  routines assigned to themselves; changing assignee or activating routines is
  more tightly controlled.
- Agent resume/pause is board-level through normal REST access.
- `00 AIA` has `canAssignTasks: true` for routing.
- `06 AIM` has `canAssignTasks: true` and `canCreateAgents: true`.

Therefore governance must be encoded in instructions, routines, and review
packets, not assumed from raw API permissions alone.

## Responsibility Matrix

| Object/action | Accountable owner | Contributors | Approval gate |
| --- | --- | --- | --- |
| Owner direction intake | `00 AIA` | Codex when owner asks | Owner when unclear/high-risk |
| Company-level goal proposal | `00 AIA` | `12 CEO`, `01 CSO`, relevant department owner | Owner or `12 CEO` depending on risk |
| Product/app goal proposal | `11 SPM` for Soar, `11 RPM` for Roost | `09 CTO`, `04 DPM`, `09 QVE`, `10 SPA` when needed | AIA/owner for Stage 1 or high-risk work |
| Goal priority/fit | `12 CEO` | `01 CSO`, `00 AIA` | Owner for broad direction |
| Routine proposal | Department owner | `04 COO`, affected roles | AIA/COO; owner for activation/high risk |
| Routine hygiene and anti-duplication | `04 COO` | `04 DPM` | AIA/CEO for company-level changes |
| Procedure/task lifecycle routine | `04 DPM` / `04 COO` | affected department owners | AIA/COO |
| Evidence/DoD routine | `09 QVE` | `09 CTO`, PMs, `10 SPA` | AIA/CTO/SPA as risk requires |
| Deploy/source-control routine | `09 DRE` | `09 CTO`, PMs, `10 SPA` | Owner for production mutation |
| Secrets/security routine | `10 SPA` | `09 DRE`, `09 CTO`, AIA | Owner for raw secret/provider/production risk |
| Cost/budget routine | `07 CFO` | AIA, `09 CTO`, `04 COO` | Owner for hard budgets or paid resources |
| Agent hiring/governance routine | `06 AIM` | `06 CHRO`, `06 POP`, requesting parent | Owner/AIA/CEO for authority changes |
| Routine activation | AIA proposes; board/bridge executes | COO/department owner | Owner for Stage 1/broad/high-risk activation |

## Proposal Rules

Agents may propose a new goal or routine when:

- it connects to owner direction or an approved company goal;
- it has a clear department owner;
- it avoids duplication with existing goals/routines/issues;
- it has entry criteria, outputs, evidence, and stop condition;
- it names activation status: draft, paused, active, review, superseded, or
  archived;
- risk gates are explicit: owner, production, secrets, cost, legal, finance,
  hiring, deploy, or paid resource.

Agents must not create new goals/routines from vague curiosity or to bypass an
existing parent goal/procedure.

## Current Stage 1 Ownership

Current goals:

- `00 General: v0 Softwarehouse Readiness - Achieved` -> `00 AIA`
  (historical baseline).
- `00 General: Stage 1 Softwarehouse Delivery to VPS` -> `00 AIA`.
- `11 Innovation: Soar Delivery to Usable VPS Production` -> `11 SPM`.
- `11 Innovation: Roost Delivery to Usable VPS Production` -> `11 RPM`.

Current active routines:

- `00 AIA` owns owner direction and liveness routines.
- `04 COO` owns portfolio truth and PDCA memory/process review.
- `06 AIM` owns agent hiring/governance review.
- `07 CFO` owns cost/quota/budget review.
- `09 QVE` owns evidence/definition-of-done review.
- `09 DRE` owns source-control/deploy readiness review.
- `10 SPA` owns secrets/Coolify/VPS access readiness review.

Historical paused routine:

- `00 General - v1 Draft Paused - Controlled Activation Dry Run` remains paused
  because the controlled dry run is complete.

## Activation Rule

Creating or editing a paused goal/routine is not the same as permission to run
it.

During Stage 0 (historical):

- Codex/board may configure goals and routines.
- Agents remain paused.
- Routines remain paused.
- Triggers remain disabled.
- No Paperclip issues/tasks should be created unless the owner explicitly asks.

During current Stage 1:

- AIA routes owner direction and escalates in Polish when decisions are needed.
- Stage 1 delivery goals and app-factory routines are active.
- `LUC-25` is the hard parent and must not close until Soar and Roost are
  owner-usable on VPS.
- COO/DPM monitor duplicate work and routine hygiene.
- Department owners keep their routines useful and narrow.
- Marketing, sales, customer service, broad HR, parked product PMs, and CEO
  proxy work remain paused unless separately approved.
- Production/deploy/secret/destructive/paid/legal/live-trading gates remain
  explicit.

## Review Cadence

After every meaningful Stage 1 run, ask:

- Did the goal still describe the real intent?
- Did the routine create useful work or noise?
- Did the routine duplicate another path?
- Did the right department own it?
- Did evidence prove the outcome?
- Should the goal/routine stay paused, become active, be revised, or be
  superseded?

Changes that alter authority, production risk, secrets, cost, hiring, or owner
communication require explicit escalation.
