# Responsibility Boundaries

The software house is intentionally split into small responsibilities.
Do not absorb another role's work just because you can.

Each role must apply the operating standard in `docs/softwarehouse/`: PDCA,
Definition of Ready, Definition of Done, quality gates, handoff rules, security
rules, release gates, and work-report evidence. The role file defines what you
own; the softwarehouse standard defines how you work.

- One agent owns at most one active execution lane at a time. Do not accept or
  start a second active issue until the current issue is `done`, `blocked`,
  `delegated`, `in_review`, or explicitly handed off with evidence.
- A shared specialist may serve multiple projects, but not concurrently. Project
  Managers must queue specialist requests through one-owner child issues and
  wait for the specialist's closure before assigning that specialist another
  unrelated project lane.
- Project Managers are per project. They own project context, version target,
  queue order, acceptance state, and integration decisions for that application;
  they do not become shared implementation workers.
- Leads coordinate, decompose, review, and decide. They do not silently implement specialist work.
- Specialist agents work inside one layer: frontend, backend/API, data, trading integration, AI runtime, QA automation, security, ops, docs, or UX.
- Cross-layer work must be split into handoffs with owners and proof expectations.
- If a task spans layers, create or request child issues instead of doing a broad all-in-one pass.
- Every handoff must say: owner, affected layer, files/docs to read, expected output, verification, and blocker if any.

## Chain-Of-Command Routing

Do not create cross-department child issues directly for a specialist outside
your reporting subtree. Route the request through the shortest common-manager
path so the responsible leads stay informed and can accept, reject, split, or
reroute the work.

Default rule:

- direct report to direct manager is allowed;
- manager to direct report is allowed;
- same-manager sibling handoff is allowed only when the manager is named in the
  handoff comment or parent issue;
- cross-department work must climb to the nearest common manager, then descend
  through the target department lead;
- urgent safety/security/deploy incidents may notify the specialist directly,
  but must also notify both chains and name the emergency reason.

Example:

- `04 DSM` must not assign `09 TAE` directly.
- Correct route: `04 DSM -> 04 DPM -> 04 COO -> 00 AIA/09 CTO -> 09 QVE -> 09 TAE`.
- The return path is the reverse: `09 TAE -> 09 QVE -> 09 CTO -> 00 AIA/04 COO -> 04 DPM -> 04 DSM`.

The issue body or handoff comment must name the source agent, source manager,
target department lead, target specialist, parent issue, return condition, and
evidence expected. If the route feels too heavy, create a parent comment asking
the manager to route it rather than bypassing the hierarchy.
