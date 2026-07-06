# Standards

Use standards as practical operating tools, not decoration.

- APQC/PCF and APQC-style process map: use `references/departments-and-naming.md` as the canonical 00-12 company map and department naming rule.
- MECE: decompose work into non-overlapping, collectively exhaustive parts before creating child work.
- PDCA: plan, do, check, act. Every repeated failure should produce a bounded improvement proposal.
- Definition of Ready: before starting work, confirm owner/parent, scope, repo/project, constraints, risk gates, expected evidence, and least-privilege assignee.
- Definition of Done: important work is done only when inspectable evidence proves the outcome and the parent/reviewer can verify it.
- Quality gates: code, architecture, security, deployment, production, and documentation checks must match the risk and blast radius of the change.
- Work-report evidence: every meaningful run should leave a comment, document, or work product showing what changed, what was checked, what remains, and who owns the next action.
- Evidence gates: no important work is done without inspectable proof.
- Least privilege: use only the tools, secrets, and repos required for the assigned scope.
- End-to-end flow: use `references/end-to-end-operating-flow.md` for intake, triage, plan, do, check, review, act, and learning handoffs.
- Naming: department work items should start with `NN Department: ...` in English-facing Paperclip objects; direct owner-facing AIA messages may be Polish.

## Complementary Standard Stack

Use the smallest standard that removes ambiguity, risk, cost, or delivery friction:

- Kanban: Paperclip issues are the visible board. Use backlog, todo, in_progress, in_review, blocked, done, and cancelled intentionally. Limit WIP; in_progress means live execution.
- RACI/DACI-lite: non-trivial work names accountable owner, consulted roles/reviewers, decision owner/approver, and informed parent.
- ADR/RFC-lite: record non-trivial architecture, integration, data, security, or product decisions before future agents rely on them.
- C4/traceability-lite: connect user flow, frontend, backend, data, workers/jobs, integrations, tests, docs, and deploy evidence.
- DevOps/DORA/SRE-lite: record deployment evidence, rollback path, smoke checks, change failure, recovery, and reliability signals.
- OWASP ASVS/SAMM plus least privilege: scale security checks to risk; use secret refs only; gate auth, data, production, and live-action work.
- ITIL-inspired incident/problem/change: separate immediate containment, root-cause learning, and controlled change/release approval.
- Value-stream/no-waste review: remove duplicate search, stale blockers, noisy backlog, accidental wakes, excessive context, and repeated failed runs.

Decision order: APQC/PCF decides process home; RACI/DACI decides accountability; MECE decides task split; Kanban decides board state; DoR/DoD decides start/finish quality; ADR/C4 decides architecture traceability; Security/DevOps/ITIL decides risk gates; PDCA decides what improves next.

## No-Wake Change Hygiene

Paperclip comments can reopen or wake blocked/done work. Treat comments as signals, not punctuation.

- Use ordinary comments when continuation is intended.
- For finalization, prefer status updates, issue documents, work products, or an explicit no-continuation path when available.
- Do not restart terminal work because an operator added a finalization comment unless the comment explicitly asks for new action.
- If an accidental wake starts, cancel the unintended run, restore the correct issue state, resume the agent if it entered error, and record learning outside the terminal issue.
