# Next Steps

Last updated: 2026-07-28

## Canonical Portfolio Execution Ladder

- Use portfolio goal `b74b43a1-efeb-43b2-8da2-4a6a5c967f76` as the current
  goal and keep persistent coordinator `LUC-1909` alive until its application
  outcomes are deployed, observable, and owner-usable.
- Execute `LUC-1910`: publish the authenticated Roost live project map with
  exact state and the complete `11 Innovation` -> `02 Products & Services`
  path.
- Execute the `LUC-1911`/`LUC-1912` Featherly split: close risks with
  non-destructive prevention independently of any destructive Git history
  rewrite, which remains approval-gated.
- Execute `LUC-1913` and `LUC-1914`: obtain independent Soar release review,
  then prove owner/paper readiness for reliable decision support and
  paper/sandbox trading.
- Preserve Soar's safety boundary: no guaranteed-profit claims and no
  real-money or live-order mutation without exact protected authorization.

## Paperclip Softwarehouse Stage 1

- Keep the active mission focused on `LUC-25`: deliver Soar and Roost to usable
  VPS production.
- Monitor whether agents convert reports and blockers into concrete executable
  child issues instead of stopping at preflight.
- If a parent/child issue becomes `done` without implementation, verification,
  deployment, or owner-usability evidence appropriate to its scope, reopen or
  create a corrective child issue.
- Keep active app defaults focused on `Soar`, `Roost`, and the owner-activated
  Featherly takeover/security-hardening lane. Aviary and Nest remain parked.
- Have FPM turn the Featherly baseline into narrow security, reliability,
  test, documentation, and release-readiness issues before feature expansion.
- Preserve the app-factory core; keep marketing, sales, customer service,
  broad HR, parked app PMs, and executive proxy work paused unless separately
  approved.
- Use active routines as internal governance, but watch for noisy duplicate
  work. The old controlled-dry-run routine should remain paused/historical.

## Delivery Loop

- Use the current loop:
  `PM/product map -> CTO/TSA technical map -> specialist implementation -> local tests -> review/security/evidence -> DRE deploy path -> production smoke/user-flow proof -> owner-ready AIA summary -> PDCA learning`.
- Soar, Roost, and Featherly work must start from each repo's available
  architecture/product truth and keep
  architecture drift visible.
- Product-app work belongs in the product app repo, not in the Paperclip
  control-plane repo, unless the task explicitly modifies Paperclip itself.
- For deploy-impacting work, require: repo state classified, dirty/divergent
  changes handled, commit/push status known, Coolify/VPS state observed, and
  production smoke/readiness evidence recorded.
- VPS/Coolify deployment is part of the target outcome for Soar/Roost, but raw
  secret exposure, destructive infrastructure actions, paid features, legal or
  finance commitments, and LIVE trading/order proof remain gated.

## Owner Interface

- Owner-facing decisions, blockers, and summaries should go through `00 AIA`
  in clear Polish.
- When a recommendation needs Patryk's decision, Paperclip should create or
  surface a decision/approval packet with context, recommendation,
  alternatives, consequence of doing nothing, and what resumes after approval.
- Do not rely on chat-only state for durable owner gates.

## Runtime / Operations

- Before Paperclip restart:
  1. call `http://127.0.0.1:3200/api/health`;
  2. call company live-runs endpoint;
  3. avoid interrupting active runs unless explicitly approved or necessary;
  4. restart only the process serving port `3200`;
  5. verify `/api/health`, `/`, `/api/companies`, live-runs, agent/project/
     routine counts, and duplicate active routines.
- If agents appear idle, inspect live runs, open issues, routine runs, blockers,
  and comments before assuming the scheduler is broken. If the board is quiet
  while `LUC-25` is incomplete, create or nudge the next executable child issue
  instead of accepting idle completion.

## Memory / Repo Hygiene

- Use `.agents/skills/paperclip-project-memory/SKILL.md` for future memory
  updates.
- Keep Stage 0 files as historical baseline, not current operating guidance.
- Prefer adding short supersession notes over deleting historical context.
