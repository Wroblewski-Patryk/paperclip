# Current Focus

Last updated: 2026-07-04

## Paperclip Softwarehouse Direction

Paperclip Softwarehouse is now in active Stage 1 delivery mode. It is being
used as the control plane for an autonomous softwarehouse, not merely as a task
runner. The current proof is whether LuckySparrow can deliver two real apps,
Soar and Roost, through the company structure until they are usable by the
owner on VPS.

The owner, Patryk, remains the vision owner and strategic approver. Agents
should perform operating analysis, planning, implementation, verification,
release/deploy coordination, monitoring, and learning. They must still stop or
escalate for raw secret exposure, destructive infrastructure actions, paid or
unavailable resources, legal/customer/finance commitments, and LIVE
trading/order proof.

## Active Stage 1 Mission

Hard parent:

- `LUC-25`: `00 General: Deliver Soar and Roost to Usable VPS Production`.

This issue must remain open until:

- Soar is created/finished enough to be owner-usable on VPS.
- Roost is created/finished enough to be owner-usable on VPS.
- Each app has inspectable architecture, implementation, local verification,
  review, security/secrets, deployment, production smoke/user-flow evidence,
  and residual-risk notes.
- AIA provides any owner-facing decision or final summary in Polish.

Active app focus:

- `Soar`: first active sellable/personal-capital app lane.
- `Roost`: second active sellable app lane and part of the same hard delivery
  mission.

Parked until explicit owner activation:

- `Aviary`, `Nest`, `Featherly`, `LuckySparrow.ch`, `OpenJarvis`, `Obiekty`,
  broad Paperclip product work beyond what is needed for the current company
  proof, and any other non-Soar/Roost stream.

Out of scope for this Stage 1 mission unless separately approved:

- Marketing, sales, customer service, unrelated client work, broad HR, parked
  product work, paid GitHub/cloud features, destructive actions, legal/customer
  commitments, and LIVE trading/order proof.

## Softwarehouse Operating Focus

The owner wants the minimum structure that lets the autonomous company deliver
quality work without noisy bureaucracy. Agents should work like a real
softwarehouse with clear responsibilities:

- owner direction -> AIA Polish decision packet when needed;
- AIA/COO/DPM routing and parent/child task hygiene;
- product ownership by SPM/RPM;
- architecture and implementation routing by CTO/TSA/engineering roles;
- QA/review/test evidence by QVE/CRS/TAE;
- deployment/reliability by DRE/RTE;
- security/legal gates by SPA/CLO;
- documentation and learning by DSM plus PDCA routines;
- cost/resource realism by CFO/CAO;
- AI-agent hiring/governance by AIM only when a real gap is proven.

Core lifecycle:

`goal -> procedure -> parent issue -> child issues -> implementation/evidence -> review -> deployment/readiness -> production smoke/user-flow proof -> owner-ready summary -> learning/procedure update`

Do not close user-facing work because only backend code, a report, or a
preflight exists. Closure needs evidence appropriate to the work.

## Runtime Focus

Active local Paperclip Softwarehouse instance:

- Base URL: `http://127.0.0.1:3200`
- Company: `LuckySparrow`
- Company id: `ae26bb8b-8f5f-4a85-b341-78d4e1985975`
- Prefix: `LUC`
- Config: `.paperclip/config.json`
- Port `3100` may be a separate managed dev-runner instance and should not be
  treated as the active Softwarehouse runtime by default.

Before restart or configuration mutation, check `/api/health` and
`/api/companies/{companyId}/live-runs`. Do not restart while live runs are
active unless the owner explicitly asks for an interrupting restart or the
system is unrecoverably unhealthy.
