# Environment Operations

Use this shared environment guidance for LuckySparrow Softwarehouse work.

## Windows Shell Discipline

This company currently runs on Windows 11 Home with Windows PowerShell 5.1,
Node 22, pnpm 9, 16 logical processors, and about 32 GiB RAM. Treat it as one
bounded workstation, not as an elastic build cluster.

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
- Filter process queries before projecting `CommandLine`; never serialize the
  full `Win32_Process` table or recurse through every process descendant just
  to check one service. Prefer the bounded runtime topology audit.
- Never use broad process-name kills (`taskkill`/`Stop-Process` against every
  Node, PowerShell, Paperclip, or Postgres process). Stop the registered
  Paperclip service, or terminate one verified PID tree.
- Do not launch detached or visible helper windows with nested
  `Start-Process`. A required background process must be registered with the
  Paperclip service supervisor and use hidden-window behavior on Windows.
- Run repo-wide builds, typechecks, browser tests, and embedded-Postgres suites
  sequentially. Start with the smallest targeted check and never overlap two
  memory-heavy validation lanes on this workstation.
- If PowerShell, a test, or a build hangs, stop and inspect its bounded PID
  tree. Do not retry in parallel or spawn a new Paperclip instance.

## Canonical Local Topology

- The only Paperclip checkout is
  `C:\Personal\Projekty\Aplikacje\Paperclip_Softwarehouse`; its API is fixed to
  `127.0.0.1:3200` and embedded PostgreSQL to `54329`. Strict-port mode means a
  second startup must fail instead of selecting `3201` or another database
  port.
- The only Soar checkout is `C:\Personal\Projekty\Aplikacje\Soar`.
- The only Roost checkout is `C:\Personal\Projekty\Aplikacje\Roost`.
- Do not create another clone, worktree, copied app directory, alternate dev
  server, or fallback-port instance. Use the project primary workspace already
  attached to the issue.
- Verify topology with `pnpm run softwarehouse:runtime-topology-audit`. A
  failure is a stop signal: report it instead of self-replicating the runtime.
- Use canonical Compose services for long-lived application runtimes. For a
  bounded one-off proof, use `docker compose run --rm ...`; do not retain a
  per-issue container that publishes the same host port as the canonical
  service. After an interrupted proof, inspect and remove only the verified
  stopped one-off container after confirming that it has no required mounts or
  volumes. Never substitute `docker system prune` for this targeted cleanup.
- A development-mode one-off health response does not prove that the canonical
  application service is ready. If the canonical service fails because a
  protected input is unavailable, preserve that as the blocker instead of
  naming and retaining an alternate per-issue service. Runtime evidence work
  must finish with `pnpm run softwarehouse:runtime-topology-audit` and an empty
  stopped one-off inventory.

## Script Runtime Discipline

- Never invoke a `.js`, `.mjs`, `.cjs`, or `.ts` file by entering only its
  path, with `Invoke-Item`/`ii`, or with `Start-Process` pointed at the script.
  Windows can follow the file association and open VS Code or Notepad instead
  of executing the script. Do not change global Windows file associations to
  work around this.
- Execute JavaScript modules with `node <absolute-script-path>`. Execute
  TypeScript with the owning repository's `pnpm exec tsx <script-path>` (or its
  documented package script). In Node child-process code, use `process.execPath`
  as the executable and pass the script path as the first argument.
- Run the tracked Paperclip issue helper explicitly through Node:

  ```powershell
  $issueHelper = Join-Path $env:LUCKYSPARROW_SOFTWAREHOUSE_ROOT 'skills/paperclip/scripts/paperclip-issue-update.mjs'
  @'
  ## Closeout

  - Outcome and evidence go here.
  '@ | node $issueHelper --issue-id $env:PAPERCLIP_TASK_ID --status in_review
  ```

- Pass transient issue comments through stdin or an operating-system temporary
  file. Never create `closeout*.md`, `.closeout.md`, or other transient payload
  files in a repository/workspace root. A durable deliverable belongs in its
  canonical tracked directory and must be uploaded as an artifact/work product.

- Upload inspectable artifacts through the tracked Node helper in the same way:

  ```powershell
  $artifactHelper = Join-Path $env:LUCKYSPARROW_SOFTWAREHOUSE_ROOT 'skills/paperclip/scripts/paperclip-upload-artifact.mjs'
  node $artifactHelper .\path\to\artifact.md --title 'Artifact title'
  ```

- If a command unexpectedly opens an editor, close the editor window, record
  the failed invocation once, and retry with the explicit runtime. Do not keep
  launching the path or treat the editor process as successful execution.

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
- A line-count cap is not a byte cap when generated JSON/CSV records are
  minified or contain very wide fields. Do not use `Get-Content -TotalCount` or
  `Select-Object -First` as the only bound for generated JSON/CSV. Parse the
  exact record structurally, project only the needed fields, truncate any
  returned string field to 4 KB, and keep the complete command output below
  50 KB unless the issue explicitly requires a larger inspectable artifact.
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
- Keep redaction checks bounded too. Prefer the repository's existing secret
  scanner. Otherwise search only high-confidence credential signatures and
  return matching file names or counts, capped at 100 paths. Do not search
  generic words such as `token`, `password`, or `secret` across generated
  graphs, status indexes, or append-heavy state files.
- Never pipe a full generated diff into a secret-search expression. Added-line
  screening is for the small authored/untracked portion of a packet and must
  have an explicit output cap. Validate generated groups through their producer
  and deterministic summary instead of printing their content into the log.
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

- Active roots remain `Paperclip_Softwarehouse`, `Soar`, `Roost`, and `Featherly`.
- These roots are allowed company scope, not interchangeable write targets. The
  assigned execution workspace (`cwd`) is the run's write boundary. Reading a
  shared tool from another allowed root is permitted; modifying another repo
  requires a separately assigned linked issue whose project and primary
  workspace are that repo. An agent must not expand its own scope by adding the
  external path to a task packet.
- When a run discovers a cross-repo defect, record the exact handoff and leave
  the foreign repo untouched. Do not mark the current issue done while its
  assigned repo, or any repo touched by the run, is dirty unless a linked open
  source-control closure issue or exact no-commit blocker preserves ownership.
- Do not create helper folders directly under
  `C:\Personal\Projekty\Aplikacje`.
- Do not mutate sibling app folders such as `Aviary` or the paused VPS
  `Paperclip` checkout without explicit owner approval.
