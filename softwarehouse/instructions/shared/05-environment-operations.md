# Environment Operations

Use this shared environment guidance for LuckySparrow Softwarehouse work.

## Windows Shell Discipline

- Prefer one command per tool call when the result matters.
- Avoid chaining critical commands with `&&`, `||`, or long shell pipelines in
  Paperclip/Codex task instructions. Split commands so failures are visible and
  resumable.
- On Windows, prefer native PowerShell filesystem operations over mixed
  PowerShell/cmd deletion or movement chains.
- Before recursive delete/move, resolve the absolute target and confirm it is
  inside the intended repo or explicitly approved target directory.
- For Paperclip issue work, prefer the injected runtime environment over
  rediscovery: `PAPERCLIP_TASK_ID`, `PAPERCLIP_API_URL`,
  `PAPERCLIP_API_KEY`, `PAPERCLIP_RUN_ID`, and
  `LUCKYSPARROW_SOFTWAREHOUSE_ROOT`.
- Read the tracked Paperclip skill or use its `paperclip-issue-update.mjs`
  helper from `LUCKYSPARROW_SOFTWAREHOUSE_ROOT`. Do not recursively scan
  `.paperclip`, `.codex`, `.git`, `node_modules`, managed runtime homes, or
  archived logs to infer the issue API contract.
- Avoid nested PowerShell here-strings passed through another shell command.
  Prefer a direct `Invoke-RestMethod` call with a hashtable and
  `ConvertTo-Json`, or the tracked Node helper.

## Bounded Project-State Reads

- Product state and context files are append-heavy and may exceed one megabyte.
  A requirement to read them means extracting the current relevant state, not
  dumping the entire historical file into the model context.
- Inspect file size first. For files larger than 250 KB, start with at most the
  first 200 lines, then use `rg -n` for the current issue identifier, affected
  path, capability, or status. Read a small surrounding range only when needed.
- Do not concatenate multiple large state files into one `Get-Content` command.
  Keep initial project-state output below 1,000 lines or 250 KB in total.
- Prefer the current mission/index/issue evidence over old journal sections.
  Read historical entries only when they are directly relevant to provenance,
  ownership, or regression analysis.
- Do not run repository-root `rg` for generic task terms across append-heavy
  `.agents/state`, `history`, `docs/status`, or `docs/graphs`. Start in the
  expected source/test/docs directory and exclude those trees unless the issue
  names one of them explicitly. For a generated JSON/CSV index, parse the exact
  identifier or row with a structured reader and return only the matching item.
- A bounded read timeout is a signal to narrow the query. It is not evidence
  that the repository, issue, or instruction bundle is missing.

## Bounded Source-Control Reads

- Start source-control review with `git status --short`, `git diff --stat`, and
  `git diff --numstat`. Do not dump a repository-wide diff when generated
  graphs, status indexes, lockfiles, or snapshots dominate the packet.
- Inspect authored behavior and documentation files with focused
  `git diff -- <path>` calls. For generated files, verify their producer,
  deterministic regeneration command, summary counts, and a small relevant
  excerpt instead of reading every changed line.
- Keep combined initial diff output below 1,000 lines or 250 KB. If the packet
  is larger, classify it from stat/numstat first and review coherent path groups
  in separate bounded calls.
- A local commit still requires validation and redaction evidence. Bounded
  review reduces transcript cost; it does not weaken source-control gates.

## pnpm And Symlink Notes

- First-party plugin development may need local `@paperclipai/plugin-sdk`
  linking. On Windows, directory symlinks can fail with `EPERM` unless Developer
  Mode or elevation is available.
- `scripts/link-plugin-dev-sdk.mjs` falls back to a Windows junction when a
  normal directory symlink is blocked.
- If a `pnpm run ...` command still fails during dependency status checks, run
  the underlying `node scripts/...` command directly when that is the command
  being audited and no install/build step is actually required.

## Build Artifacts

- `ui/dist` is a temporary frontend build output and can be removed after the
  build is copied.
- `server/ui-dist` is the real static UI directory served by the local
  Softwarehouse backend. Do not remove it as generic temp cleanup while the
  local app is meant to keep serving the UI.

## Stage 1 Boundaries

- Active roots remain `Paperclip_Softwarehouse`, `Soar`, and `Roost`.
- Do not create helper folders directly under
  `C:\Personal\Projekty\Aplikacje`.
- Do not mutate sibling app folders such as `Aviary` or the paused VPS
  `Paperclip` checkout without explicit owner approval.
