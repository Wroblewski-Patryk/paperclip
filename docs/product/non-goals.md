# Non-Goals

Last updated: 2026-06-19

## Current Non-Goals

| ID | Non-goal | Reason | Revisit trigger | Owner |
| --- | --- | --- | --- | --- |
| NG-001 | Replace the broader Paperclip company-management VPS instance | This local instance is only for software development and app maintenance. | A separate migration decision is opened. | Owner/operator |
| NG-002 | Add full LuckySparrow business departments such as brand marketing, broad finance/accounting, formal legal counsel, or broad customer operations | Current scope is a local autonomous app studio: take dreams and project architecture docs, plan apps, build them, verify them, maintain them, and improve the agents/processes needed to do that work. Product, UX, app access readiness, support-path design, agent staffing, and agent-development roles are in scope when they directly help applications get created and improved. | User explicitly expands this local instance beyond app creation/maintenance into full company operations or promotes an app into sellable product/service operations requiring dedicated business departments. | Portfolio Director |
| NG-003 | Blindly auto-push or auto-deploy every commit | Production changes require approval, SHA proof, smoke, rollback, and no-secret evidence. | User grants a narrower deploy automation policy. | Ops / Security |
| NG-004 | Store secrets in repository files | Secrets must remain in Paperclip/local secret stores or transient approved env. | Never, except redacted examples. | Security |
| NG-005 | Treat structure readiness as runtime readiness | Docs structure means agents can work; it does not prove user flows. | Runtime tests/proofs are attached. | QA / PM |
| NG-006 | Let one agent own all layers of a complex fix | Small responsibility boundaries improve evidence and reduce regressions. | Emergency fix with explicit owner approval. | CTO |

## Rule

If work touches a non-goal, stop and create an open decision before
implementation.
