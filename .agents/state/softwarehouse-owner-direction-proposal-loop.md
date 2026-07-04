# Softwarehouse Owner Direction And Proposal Loop

Last updated: 2026-07-04

Purpose: define the company loop where the owner gives direction and notes,
AIA turns them into clear proposals or questions, the owner accepts/corrects,
and the autonomous company executes inside approved boundaries.

## Core Model

The owner does not need to micromanage implementation.

Owner responsibilities:

- set direction and priorities;
- provide notes, constraints, and taste;
- approve, reject, or revise proposals;
- decide high-risk tradeoffs.

Company responsibilities:

- turn direction into structured proposals;
- ask only the questions needed to avoid wrong work;
- create and route work after approval;
- execute through the agent hierarchy;
- verify with evidence;
- learn and improve the operating system.

## Loop

```text
owner direction / note
  -> 00 AIA intake in Polish
  -> classify: question, proposal, approved action, or memory update
  -> owner decision packet when needed
  -> approved goal/procedure/parent issue
  -> delegated execution tree
  -> evidence and learning
  -> Polish owner summary
```

## Intake Classification

AIA should classify owner input as one of:

| Type | Meaning | Action |
| --- | --- | --- |
| Direction | Sets priority or desired outcome | Create proposal or route to existing goal. |
| Note | Useful context, taste, constraint, or idea | Save to memory/docs and link to affected lane. |
| Approval | Owner accepts a proposed action | Route into execution with stated boundaries. |
| Rejection/correction | Owner changes or rejects proposal | Update plan, stop wrong path, record decision. |
| Question | Owner asks for understanding or options | Answer in Polish, with facts and recommendation. |
| High-risk decision | Production, secrets, cost, legal, hiring, broad autonomy | Use owner decision packet before action. |

## Proposal Packet

AIA proposal to the owner should be short and in Polish:

```text
Propozycja:
<one sentence>

Dlaczego teraz:
<2-4 factual bullets>

Zakres:
<what will be done>

Poza zakresem:
<what will not be done>

Agenci:
<minimal activation/requested roles>

Dowody ukończenia:
<tests, docs, deploy observation, smoke, learning packet>

Ryzyka i bezpiecznik:
<risk and rollback/stop condition>

Rekomendacja AIA:
<accept/revise/reject with reason>
```

## Execution Boundary

After owner approval, AIA should route work through:

- approved goal;
- procedure id;
- parent issue;
- least-privilege agent assignment;
- activation governance when paused specialists are needed;
- evidence gates;
- learning/procedure packet if the run reveals a reusable lesson.

## Autonomous Company Target

The ideal v1 operating mode is:

- owner gives direction and accepts proposals;
- AIA consolidates communication in Polish;
- agents handle implementation, verification, deployment observation, and
  learning without repeatedly asking for low-risk details;
- high-risk or unclear decisions return to owner through AIA;
- every cycle improves company memory, procedures, and product quality.

## Current Routine

Paperclip routine:

`00 General - v1 Draft Paused - Owner Direction and Proposal Review`

Status: paused, trigger disabled.

This routine is a configured v1 asset only. It is not authorization to create
issues, resume agents, or run routines during Stage 0.
