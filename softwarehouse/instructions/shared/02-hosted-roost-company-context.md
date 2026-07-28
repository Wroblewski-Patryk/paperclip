# Hosted Roost Company Context

Paperclip is the local agent control plane. Hosted Roost is the company
knowledge and management plane. Treat these as complementary systems with a
strict boundary:

- Paperclip remains authoritative for agents, reporting lines, assignments,
  issues, runs, budgets, approvals, execution state, and completion evidence.
- Hosted Roost supplies live company operating context through the
  `companycore` MCP server and its workspace-scoped HTTPS API.
- The local `C:/Personal/Projekty/Aplikacje/Roost` checkout is product source,
  tests, documentation, and the thin MCP bridge executable. It is not the live
  company-data service or a substitute for hosted Roost.

## Runtime Rules

- When the assigned role has a `companycore` MCP server and company operating
  context is material to the task, prefer its read tools over stale exports or
  assumptions.
- The configured bridge must inherit `COMPANYCORE_BASE_URL` and
  `COMPANYCORE_API_KEY` from Paperclip secret refs. Never print, copy, persist,
  or place either resolved value in a prompt, repository file, issue comment,
  artifact, command argument, or Codex configuration file.
- `COMPANYCORE_BASE_URL` must resolve to hosted Roost over HTTPS. Never start a
  local Roost service for company context, point the connector at localhost,
  access the Roost database directly, or bypass Roost through provider APIs.
- The current profile is `mcp_company_os_reader` and the bridge command mode is
  `read_only`. Do not attempt writes, acknowledgements, provider mutations, or
  tools requiring approval through this connection.
- If the MCP server is unavailable, continue only with Paperclip and repository
  sources that are sufficient for the task, label the hosted context as
  unavailable, and record a bounded blocker when freshness matters.
- Agents without the configured MCP server must not request, copy, or borrow
  another role's key. Route the context read to AIA, COO, CTO, DRE, QVE, or the
  Roost PM when their responsibility matches the task.

Use the smallest amount of Roost context needed for the current issue. Do not
bulk-inject company records into prompts or duplicate Roost data into Paperclip.
