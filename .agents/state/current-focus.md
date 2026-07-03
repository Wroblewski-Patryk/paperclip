# Current Focus

Last updated: 2026-07-03

## Paperclip Softwarehouse Direction

Paperclip Softwarehouse is being shaped as an autonomous softwarehouse/control
plane for building, repairing, verifying, and selling subscription
applications. The owner, Patryk, remains the CEO/vision owner/strategic
approver. Agents should do operational analysis, planning, implementation,
verification, release coordination, monitoring, and learning, but must stop for
secrets, paid/live account mutation, irreversible production mutation, legal or
commercial commitments, and decisions that change the business promise.

The active app focus is:

- `Soar`: first active sellable application lane.
- `Roost`: second active lane in thin readiness/known-state mode.

Future streams such as `Aviary`, `Nest`, `Featherly`,
`LuckySparrow.ch`, `OpenJarvis`, `Obiekty`, and Paperclip product work should
stay parked/backlog unless the board explicitly activates them.

## Softwarehouse Operating Focus

The owner wants the minimum structure that leads to a high-quality autonomous
company, not artificial bureaucracy. Paperclip agents should understand the
full application lifecycle:

- takeover of existing apps;
- known-state and architecture indexing;
- repair of mapped gaps;
- greenfield app creation;
- user-flow completion proof;
- browser/screenshot/clickthrough verification;
- subscription/auth/configuration/integration gates;
- review handoff upward to PM/Product/CTO/QA/Docs;
- learning loop back into instructions, routines, skills, and standards.

Important current standard documents include:

- `docs/softwarehouse/12-app-completion-review.md`
- `docs/softwarehouse/13-app-lifecycle-standard.md`
- `docs/softwarehouse/14-business-operating-standard.md`
- `softwarehouse/operating-processes.md`
- `softwarehouse/instructions/shared/90-pipeline-and-supervision.md`
- `softwarehouse/instructions/shared/95-operating-processes.md`

Agents were synced after these updates; the sync reported `38` agents updated.

## Runtime Focus

Active local Paperclip Softwarehouse instance:

- Base URL: `http://127.0.0.1:3200`
- Company: `LuckySparrow`
- Company id: `f13051a7-d0aa-4261-9254-d3ab90735de5`
- Config: `.paperclip/config.json`
- Port `3100` may be a separate managed dev-runner instance and should not be
  treated as the active Softwarehouse runtime by default.

Before restart or configuration mutation, check `/api/health` and
`/api/companies/{companyId}/live-runs`. Do not restart while live runs are
active unless the owner explicitly asks for an interrupting restart.
