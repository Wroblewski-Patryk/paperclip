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
