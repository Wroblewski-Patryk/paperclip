# Board Context

Last updated: 2026-07-04

## User Intent

The user wants Paperclip to become the control plane for their autonomous software company: a practical Softwarehouse that can create, maintain, verify, deploy, and eventually sell software with AI agents acting as an organized company.

The project is both product work and company-building work. Future Codex chats should understand that the goal is not only to implement features, but also to improve the operating system around agents: memory, delegation, proof, review, safe autonomy, and a calm board-level view of work.

## Desired Collaboration

- Speak naturally and keep project context alive across chats.
- Treat phrases like "zapisz do dziennika", "przeanalizuj tę rozmowę", "zapisz sobie do pamięci", and similar Polish requests as explicit instructions to use `.agents/skills/paperclip-project-memory/SKILL.md`.
- When the user asks to analyze an older conversation and save it, synthesize durable decisions into `.agents/state/project-journal.md` and update related memory files.
- Help manage Paperclip as a living company system: priorities, agents, routines, blockers, evidence, docs, and release gates.
- Suggest durable instructions or skills when repeated friction appears.
- Keep the user's larger vision visible while still verifying local facts before acting.

## Operating Preferences

- Prefer repo-local memory for project context so older and newer chats can converge.
- Prefer Paperclip issues/work products for issue-specific execution evidence.
- Keep high-risk actions gated: secrets, production, deploys, pushes, destructive operations, and protected smoke tests require explicit evidence/permission paths.
- Treat Paperclip as the control-plane repo and each agent-built product app as its own repo. For product changes, agents should run git, push, deploy checks, and production smoke verification from the product app repo, not from `Paperclip_Softwarehouse`.
- Avoid broad rewrites and context churn. Capture what matters, then keep moving.
- When cleaning the Softwarehouse board, prefer targeted state repairs over
  broad automation resets: archive duplicate routines, clear stale agent errors,
  remove terminal blockers, and resume only the paused role that is directly
  blocking current critical work.

## Current Company Shape

- Paperclip is the control plane and product foundation.
- LuckySparrow Software House is the local autonomous company instance.
- Soar is the first active sellable app lane.
- Roost is the second active sellable app lane in thinner readiness mode.
- Other app/project ideas stay backlog unless the board reopens them.

## Stage 0 Foundation Direction

- The owner intentionally reset to a nearly clean Paperclip instance after an
  earlier noisy state with thousands of tasks. Future work should avoid
  recreating volume without signal.
- Current phase is Stage 0: configure Paperclip Softwarehouse before any
  autonomous agent execution.
- Prefer official Paperclip configuration surfaces first: managed agent
  instructions, company skills, routines, secret refs, company import/export,
  issue documents, work products, and evidence gates.
- Use new code only when a verified Paperclip capability is missing or broken.
- Operating standards such as APQC/PCF, MECE, PDCA, governance gates,
  QA/security/DevOps, customer success, and learning loops should be encoded as
  practical instructions, skills, routines, and issue gates rather than vague
  philosophy.
- Agent design should model company employees: role scope, authority,
  responsibility, access, escalation, collaboration norms, and optionally Big
  Five-style personality fit when it improves role behavior.
- Do not store raw secrets in memory, instructions, comments, docs, or logs.
  Use Paperclip secret refs and explicit operator entry paths.
- During Stage 0/v0, Codex in the current chat is the implementer/configurator.
  Do not create Paperclip issues/tasks for Paperclip agents unless the owner
  explicitly asks. Paperclip agents remain quiet until the owner confirms v0 is
  complete and approves Stage 1.
- The owner approved creating Paperclip routines during Stage 0 only when they
  are inactive: routine `status: paused` and every trigger `enabled: false`.
- All agents should stay paused during Stage 0 unless the owner explicitly asks
  for a targeted resume.
- Current Stage 0 configuration now has managed instruction bundles for all 38
  agents, 18 company skills attached by role, 7 paused routines, 3 planned
  company goals, all 38 agents paused, and `06 AIM (AI Agent Manager)` as the
  only agent with AI-agent creation authority.
- Canonical departments live in `.agents/state/softwarehouse-departments.md`.
  Department-owned routines, goals, issues, work products, reports, approvals,
  and notes should start with `NN NazwaDziału - ...` for filtering and fast
  recognition.
- Every current agent bundle includes a shared end-to-end operating flow:
  intake, triage, plan, do, check, review, act, and learning handoff. The goal
  is pleasant, clear work with small context, explicit evidence, and clean
  handoffs.
- Agents should learn through governed learning packets: individual lessons,
  department pattern reviews, and company-level operating updates. They must not
  directly edit their own instructions, skills, permissions, or routines.
- Department 05 is Relacje / customer service. Department 06 is Kadry / people
  and AI workforce. Human/workforce
  operations and AI-agent management are separate subdomains; only the AI-agent
  manager may hire/create AI agents after the hiring procedure passes.
- Required secret names and policy live in
  `.agents/state/softwarehouse-secret-requirements.md`; the file stores no
  values. Do not enter real production secrets until the local encrypted key ACL
  warning is either accepted for local use or fixed by a better runtime/provider
  setup.
- Coolify Stage 0 base/login/read/deploy credentials, LuckySparrow team
  id/name, Soar resource ids, Roost app id, Soar/Roost production URLs, and
  Soar/Roost production test accounts have been entered as Paperclip managed
  secrets and bound by least-privilege secret refs. Do not repeat the values in
  memory, docs, comments, or final responses. The Coolify read token was tested
  against live API endpoints; deploy-token use remains gate-controlled.
- Resource access policy lives in
  `.agents/state/softwarehouse-resource-access-matrix.md`. The operating model
  is least privilege across secrets, skills, tools, markdown resources,
  routines, repositories, deployment access, and production test accounts.
- Resource constraints live in `.agents/state/softwarehouse-resource-policy.md`.
  The owner does not have a paid GitHub plan. Agents must not assume paid GitHub
  features, paid Actions capacity, Advanced Security, paid runners/packages,
  enterprise-only controls, paid GitHub AI features, or notification-heavy
  automation. Prefer local/free verification and report missing plan/quota as a
  constraint with a free/local alternative.
- Current v0 coverage audit lives in
  `.agents/state/softwarehouse-v0-readiness-audit.md`. Draft Stage 1 activation
  packets live in `.agents/state/stage1-activation-soar.md` and
  `.agents/state/stage1-activation-roost.md`; these are not approval to create
  Paperclip issues or resume agents.

## Standing Codex Watchdog

- The only active Codex-level Paperclip supervision automation should be
  `check-paperclip-soar-autonomy` / `Paperclip Softwarehouse liveness
  watchdog`, running every 480 minutes in `Paperclip_Softwarehouse`.
- The former weekly `paperclip-autonomous-company-standards-review` automation
  was intentionally merged into the watchdog and deleted on 2026-07-03. Do not
  recreate it unless the owner explicitly asks for a separate cadence again.
- The watchdog is a temporary parent supervisor over Paperclip. It should check
  whether Paperclip is alive, moving work forward, repairing its own operating
  gaps, and learning toward an autonomous softwarehouse. Its long-term goal is
  to become unnecessary once Paperclip can reliably supervise itself.
- The watchdog should include strategic standards review inside the 8-hour
  loop: APQC, MECE, PDCA, capability models, governance patterns, customer
  success, pricing/subscription, QA/security/DevOps, and agent-execution
  practices may be used only when they produce practical, local improvements.
- Human-in-the-loop means owner approve/decision tasks created inside
  Paperclip by autonomous agent work. Strategic standards, authority,
  commercial, production, secrets, live-account, and broad organization changes
  should be routed as approve tasks, not kept as chat-only assumptions.
- The watchdog must not perform owner-gated actions by default: no push,
  deploy, production restart, destructive git, secret disclosure, paid account
  mutation, or irreversible production changes without the required gate.
