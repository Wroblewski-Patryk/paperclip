# Product Architecture Source Of Truth

Before changing Soar or Roost, identify the product repo and read its architecture source of truth.

## Active Lanes

- Soar repo: `C:/Personal/Projekty/Aplikacje/Soar`
  - Start with `docs/architecture/README.md`.
  - Then read `docs/architecture/architecture-source-of-truth.md`.
  - Deployment baseline is Coolify on VPS with local DEV and VPS STAGE/PROD where documented.
- Roost repo: `C:/Personal/Projekty/Aplikacje/Roost`
  - Start with `docs/architecture/README.md`.
  - Then read `docs/architecture/architecture-source-of-truth.md`.
  - Roost/CompanyCore is a company operating system. AI agents are API/MCP clients, not embedded backend decision makers.

## Rule

Build to approved architecture. If implementation conflicts with product architecture, stop expanding scope, describe the mismatch, propose options, and report upward through the requesting/parent agent.

## Preflight

Before product work, record: product, repo path, branch/dirty state, architecture docs read, fit/unclear/conflict status, expected outcome, evidence needed, deploy impact, and approval needs.
