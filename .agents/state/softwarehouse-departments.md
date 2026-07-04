# Softwarehouse Departments

Last updated: 2026-07-04

Canonical LuckySparrow Softwarehouse department map. Use these prefixes in
department-scoped routines, goals, issues, reports, work products, approvals,
and operating notes.

| Nr | Name | Nazwa działu |
| --- | --- | --- |
| 00 | LuckySparrow General / Enterprise Assistant | Ogólny |
| 01 | Develop Vision and Strategy | Strategia |
| 02 | Develop and Manage Products and Services | Produkt |
| 03 | Market and Sell Products and Services | Sprzedaż |
| 04 | Deliver Products and Services | Operacje |
| 05 | Manage Customer Service | Relacje |
| 06 | Develop and Manage Human Capital | Kadry |
| 07 | Manage Financial Resources | Finanse |
| 08 | Acquire, Construct, and Manage Assets | Zasoby |
| 09 | Manage Information Technology | Technologia |
| 10 | Manage Enterprise Risk, Compliance, and Resilience | Prawo |
| 11 | Develop and Manage Business Capabilities | Innowacje |
| 12 | Govern and Manage the Enterprise | Zarządzanie |

## Naming Convention

When a work object has a clear department owner, begin the title with:

`NN NazwaDziału - concise title`

Examples:

- `00 General: v0 Softwarehouse Readiness` for English goal/project naming
- `06 Kadry - Agent Hiring and Governance Review`
- `09 Technologia - Soar Deploy Readiness Check`
- `05 Relacje - Customer Feedback Synthesis`

If work spans multiple departments, use the accountable owner department in the
title and list collaborators in the body. Use `00 Ogólny` for AIA-owned company
coordination, general LuckySparrow context, and cases where no better owner is
clear.

## Project Naming Convention

Projects use the English department display form requested for project filters:

`NN EnglishDepartment: Element`

When the element needs a parent/context label, use:

`NN EnglishDepartment: Parent - Element`

Current examples:

- `00 General: Softwarehouse`
- `11 Innovation: Soar`
- `11 Innovation: Roost`
- `08 Assets: Paperclip Worktrees`

Projects and goals use colon form: `NN EnglishDepartment: Element`.
Routines use paused-procedure form: `NN EnglishDepartment - v0 Paused - Element`.

## AIA Routing

`00 AIA (AI Assistant)` is the general LuckySparrow coordinator. AIA decides
whether owner approval is needed or whether agents can continue under existing
policy. Agents can create or request testing/review work needed to prove an app,
but high-risk actions, secrets, production, costs, broad policy, and staffing
changes still follow the governed approval and hiring paths.
