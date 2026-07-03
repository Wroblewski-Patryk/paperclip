# Paperclip Softwarehouse Process Map

Status: active baseline
Date: 2026-06-03
Owner: Portfolio Director

This is the APQC-style process catalog for Paperclip Softwarehouse. Keep it light: each process needs an owner, inputs, actions, outputs, metrics, risks, quality gates, and related roles.

| Process | Purpose | Owner | Inputs | Actions | Outputs | Metrics | Risks | Quality gates | Related roles |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Department management | Keep the softwarehouse aligned to LuckySparrow priorities. | Portfolio Director | company goal, project status, blockers, budget posture | prioritize, unblock, route work, escalate | portfolio decision, active project order | open blockers, stale work, lead time | unclear priority, duplicate work | active focus named, owner named, blocker action named | Portfolio Director, Innovations Director |
| Intake and requirements | Turn requests into ready work. | Product Lead | user request, docs, project context | clarify goal, scope, acceptance, risk | ready issue or discovery blocker | ready ratio, rework caused by unclear scope | wrong solution, missing acceptance | Definition of Ready met | Product Lead, PMs |
| Documentation analysis | Ground work in current truth. | Docs Memory Lead | repo docs, issue docs, architecture graph | read, reconcile, flag drift | context pack, doc gap, updated index | doc drift count, missing links | stale docs, wrong source of truth | source checked, gaps recorded | Docs Memory Lead, CTO, PMs |
| Architecture design | Preserve system shape and technical contracts. | CTO Architect | requirements, code map, constraints | design, split, ADR decision | architecture note, ADR, handoff map | ADR count, contract defects | incompatible design, hidden coupling | ADR for non-trivial decisions | CTO, Engineering Delivery Lead |
| Implementation | Build the smallest scoped change. | Engineering Delivery Lead | ready issue, design, contracts | assign specialist, implement, commit | code/docs change, commit or no-commit reason | cycle time, failed checks | broad refactor, cross-layer drift | plan exists, scope honored | frontend, backend, data, runtime, integration |
| Code review | Catch defects before merge/release. | Engineering Delivery Lead | diff, tests, acceptance | review impact, contracts, risks | review disposition | review defects, reopen rate | missed behavior break | reviewer named, findings resolved | Engineering Delivery Lead, CTO, QA |
| Testing | Prove behavior. | QA Regression Lead | acceptance, diff, app state | unit/integration/e2e/manual checks | evidence pack, bug report | pass rate, regression count | false confidence, missing scenario | evidence attached, failures routed | QA Lead, Test Automation |
| Security | Prevent unsafe data, auth, secret, and live-account behavior. | Security Review Lead | design, diff, env, threat surface | check secrets, authz, validation, abuse cases | security disposition | security blockers, leaked-secret incidents | secret exposure, auth bypass | high-risk work reviewed | Security, Backend, Ops |
| DevOps and deployment | Release safely and reversibly. | Ops Release Lead | source SHA, build, env, migration, gate | build, deploy, smoke, rollback note | deploy log, smoke result, rollback path | deployment frequency, MTTR | broken prod, missing rollback | release checklist passed | Ops, Security, QA |
| Documentation | Make knowledge durable. | Docs Memory Lead | merged work, decisions, proof | update README/docs/changelog/runbooks | durable docs, memory update | doc drift, missing changelog | knowledge loss | docs updated or no-doc reason | Docs Memory, PMs |
| Maintenance | Keep apps healthy after delivery. | Project Manager | incidents, health, known issues | triage, prioritize, route repair | maintenance lane, status update | issue aging, reliability | ignored degradation | owner and proof path named | PM, QA, Ops |
| Bug and incident handling | Move from symptom to root cause to regression proof. | QA Regression Lead | bug report, logs, reproduction | reproduce, locate cause, fix, verify | RCA, regression proof | MTTR, repeat failures | patch without cause | RCA and regression evidence exist | QA, Engineering, Ops |
| Continuous improvement | Stop repeated failures. | Portfolio Director | retros, repeated blockers, audit gaps | update process, role, checklist, automation | improvement issue or SOP change | repeated blocker count | process theater | concrete rule or automation added | Portfolio, CTO, Docs |
| Roost / Obsidian / docs sync | Keep external knowledge aligned. | Docs Memory Lead | Roost truth, Obsidian notes, repo docs | reconcile, index, flag drift | sync report, updated docs | drift count, sync freshness | split truth | source and timestamp recorded | Docs Memory, Portfolio |

