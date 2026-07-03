# Board Context

Last updated: 2026-07-03

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
