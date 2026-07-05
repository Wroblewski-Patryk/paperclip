# Softwarehouse Company Operating System

This document is the operating contract for the local Paperclip softwarehouse.
The company exists to plan, build, verify, and improve applications such as
Soar and Roost.

Brand marketing, broad finance, formal legal counsel, and unrelated business
administration are outside this pilot unless they directly unblock app
creation.

## Operating Chain

`Board/User dream -> 11 Innovation/PM packet -> 02 Product acceptance -> 09 CTO technical acceptance -> Delivery decomposition -> Specialist build/proof -> QA/Security/Ops gates -> Release/observation -> Retrospective -> Process/agent improvement`

## Version Roadmap And Active Scope

`V1 local Soar + Roost completion -> V2.1 Roost connected to Paperclip -> V2.2 Paperclip VPS builder -> V3 portfolio expansion`

- V1 is the current local Paperclip operating target: agents finish Soar and
  Roost through indexed frontend/backend/worker/event-chain evidence,
  source-control closure, local verification, and gated deploy proof where
  credentials/production access are available.
- Soar and Roost are both active V1 application lanes. Soar remains the first
  tie-breaker when two safe actions compete for the same owner, credential, or
  protected production gate, but Roost must not be parked when local
  known-state, source-control, implementation, proof, or documentation work is
  legal and owner-scoped.
- V2.1 starts only after Roost is fully working as an app and then connects
  Roost/CompanyCore into Paperclip through an accepted API/MCP/data boundary.
- V2.2 moves Paperclip to a dedicated VPS so agents can build applications on
  the server and let project pushes redeploy through Coolify to production.
- V3 opens additional application projects after the local+VPS operating loop
  proves it can run Soar and Roost without silent idle, duplicate churn, or
  hidden blockers.
- Aviary, Nest, Featherly, and other future apps remain parked until the board
  explicitly reopens them for V3 or a named exception.

## Value Streams

1. Dream to Product Slice
   - Owner: 02 CPO + 02 WPM.
   - Input: human dream, project `docs/architecture`, PM packet, screenshots,
     constraints, blockers.
   - Output: accepted product slice, discovery questions, defer/park decision,
     or reject/merge decision.

2. Product Slice to Technical Plan
   - Owner: 09 CTO + 09 TSA.
   - Input: accepted Product slice or explicit technical-only repair.
   - Output: architecture boundaries, modules, contracts, risk, proof plan,
     specialist owners.

3. Technical Plan to Delivery Tasks
   - Owner: Engineering Delivery Lead.
   - Input: CTO/TSA packet.
   - Output: one-owner tasks with dependency order, proof requirements,
     workspace policy, and parent disposition.

4. Delivery to QA/Security/Ops Gate
   - Owner: QA, Security, Ops.
   - Input: completed implementation/proof lanes.
   - Output: pass, blocker with owner, or release hold with plain reason.

5. Release to Observation
   - Owner: Ops + PM + Product.
   - Input: gated release candidate.
   - Output: deploy/readiness state, rollback path, smoke proof,
     user-visible status.

6. Failure to Learning
   - Owner: AIM/AID + Docs/Memory.
   - Input: repeated blockers, rework, failed handoffs, unclear ownership,
     stale routines.
   - Output: improved role instruction, skill, routine, template, or a
     deliberate no-change note.

## Human Decision Rule

If the system needs a board/user choice, it creates a task assigned to the
human user. The task must explain:

- what decision is needed;
- why it matters now;
- the recommended option;
- 2-3 realistic alternatives;
- consequence of doing nothing;
- which work will resume after the answer.

The wording must be plain Polish or plain English. No dense implementation
jargon unless the task is explicitly technical.

## Definition Of Company-Ready Work

- One accountable owner exists at every step.
- The next handoff is named before work starts.
- Product intent is accepted before broad feature implementation.
- Technical boundaries are accepted before broad specialist fan-out.
- QA/Security/Ops gates can block release.
- Workspaces protect human changes and preserve source-control closure.
- Done work has evidence or an explicit no-evidence reason.
- Repeated failures become learning tasks, not silent frustration.
