# Current Pilot And Intake

- Active sellable app lane 1: `Soar`
- Active sellable app lane 2: `Roost`
- Version roadmap: `V1 local Soar + Roost completion -> V2.1 Roost connected to Paperclip -> V2.2 Paperclip VPS builder -> V3 portfolio expansion`
- Deferred app streams: `Featherly`, `Nest`, `Aviary`, `LuckySparrow.ch`,
  `OpenJarvis`, `Obiekty`, Paperclip product work, and other portfolio
  experiments
- Workspace path: `C:/Personal/Projekty/Aplikacje/Soar`
- Soar documentation path: `C:/Personal/Projekty/Aplikacje/Soar/docs`
- 11 Innovations priority order: finish `Soar` and `Roost` locally in V1 using
  indexed app truth, one-owner repair lanes, verification, source-control
  closure, docs refresh, and gated deploy evidence. Soar is the first
  tie-breaker for conflicting protected work; Roost must keep moving when safe
  local work is available. Everything else stays backlog/archived until V3 or
  explicit board reopen.
- Roost workspace path: `C:/Personal/Projekty/Aplikacje/Roost`
- Roost documentation path: `C:/Personal/Projekty/Aplikacje/Roost/docs`
- Template path: `C:/Personal/Projekty/Aplikacje/!template`
- Portfolio root: `C:/Personal/Projekty/Aplikacje`
- Portfolio index: `C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/softwarehouse/portfolio/APPLICATIONS_INDEX.md`
- Portfolio CSV: `C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/softwarehouse/portfolio/APPLICATIONS_INDEX.csv`
- Portfolio index refresh: `node scripts/update-softwarehouse-portfolio-index.mjs`
- Paperclip canonical workspace: `C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse`
- Naming rule: `Paperclip` means `Paperclip_Softwarehouse`; the old
  `C:/Personal/Projekty/Aplikacje/Paperclip` folder is not active.

Workspace discipline:

- `C:/Personal/Projekty/Aplikacje/<Application>` is the canonical local
  workspace for each active app. Use that existing folder for local work.
- Do not clone, copy, or create a second local instance of Soar, Roost, or any
  portfolio app. Isolated worktrees are exceptional, require explicit board
  approval for the specific issue, and must be removed after handoff.
- Do not use `C:/tmp`, `%TEMP%`, Downloads, Desktop, or ad hoc scratch folders
  as application repos/checkouts. Temporary folders are only for short-lived
  generated artifacts and must be cleaned or attached before handoff.
- Prefer Paperclip project workspace/runtime controls for preview or dev
  services, but default execution cwd must remain the canonical project folder;
  do not start multiple unmanaged dev servers for the same app.

Soar owns the first active sellable lane. Close production build provenance,
protected smoke/auth proof, deploy/rollback evidence, security/QA evidence, and
inspectable work products before sales claims.

Soar starts as an innovation lane. Do not treat it as a Product lane until the
working app, deployment/readiness proof, safe operating loop, and board
confidence are recorded. After promotion, Soar Product work may continue as the
safe/default development lane.

Roost owns the second active sellable lane. Keep local implementation,
known-state, source-control closure, project-truth gap repair, and milestone
evidence moving whenever the work is safe and owner-scoped. Roost also carries
the V2.1 integration purpose: Roost is the product/application layer in which
reusable company capabilities should ultimately live. Once each capability is
usable and governed, Paperclip agents consume it through an accepted MCP-first
boundary, with API/data interfaces beneath MCP where appropriate. Do not move
company authority, budgets, approvals, issue ownership, or execution evidence
out of Paperclip; Roost supplies tools and digital capabilities, while
Paperclip remains the control plane that decides who may use them and why.
This is future architecture context only. It does not create a current MCP,
integration, or platform-expansion lane and must not reorder present work.
Current Roost agents must build and verify Roost against its existing project
documentation; Paperclip-to-Roost integration starts only after the board
activates that stage.

V2.2 moves Paperclip to `paperclip_luckysparrow` on the VPS for server-side app
creation and Coolify-mediated deploys. Until then, VPS/Coolify work is deploy
evidence and remains gated, while local Roost repair/proof/docs work continues.

Deferred app streams stay quiet. Do not create new routine/controller issues or
specialist work for deferred applications unless the board explicitly reopens
that stream.

Anti-token-waste rules:

- Do not create a new routine/controller issue when a canonical active issue
  for the same title/project/owner exists.
- Do not wake an issue because of status-sync comments alone.
- A done/cancelled/in-review tail should be cleaned by janitor, not restarted.
- Every done release-critical issue must have evidence: work product, artifact,
  linked file, test output, deploy proof, screenshot, or explicit
  blocked/approval record.
- Protected production gates are valid blocked outcomes. Retry only after a
  fresh operator/credential fact or explicit board approval.

Protected actions still remain gated: do not push, deploy, restart, mutate
production, run protected smoke, or expose secrets unless a fresh operator
approval or credential fact exists for that specific action.

Current deployment model, until staging exists:

- Active apps should become usable on the VPS after the strongest feasible
  local tests.
- The current path is local verification -> coherent commit bundle -> push ->
  Coolify automatic redeploy -> VPS production smoke/readiness proof.
- Production/VPS is the owner-usable environment for final verification today,
  but agents must not treat that as permission to skip local checks.
- When a staging VPS exists, change the path to local -> staging VPS ->
  production.

Do not start product work on Paperclip or other applications unless the board
explicitly reintroduces them. Paperclip Softwarehouse operating-system work is
allowed when the issue is in the Softwarehouse project, assigned to a
company-scope owner such as Portfolio Director, 11 Innovations Director, or CTO
Architect, and the control tick allows `paperclip_os_closure` or another
Softwarehouse OS/process lane. `Personality` is a legacy alias for Aviary only,
not a separate project.
