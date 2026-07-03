# Generated Artifacts and Work Products

When work produces a user-inspectable file, upload true deliverables to the current issue before final disposition. Local filesystem paths are not enough because board users, reviewers, and cloud operators may not have access to the agent workspace.

Use the helper bundled with this skill. Prefer the Node helper, especially on Windows. From an installed `paperclip` skill directory, the helpers live at:

```bash
node scripts/paperclip-upload-artifact.mjs path/to/output.webm \
  --title "Walkthrough render" \
  --summary "Rendered walkthrough for review"
```

If you need a POSIX shell path, the existing Bash helper is still available:

```bash
scripts/paperclip-upload-artifact.sh path/to/output.webm \
  --title "Walkthrough render" \
  --summary "Rendered walkthrough for review"
```

The helpers use `PAPERCLIP_API_URL`, `PAPERCLIP_API_KEY`, `PAPERCLIP_COMPANY_ID`, `PAPERCLIP_TASK_ID`, and `PAPERCLIP_RUN_ID`. They upload the file as an issue attachment, create an attachment-backed artifact work product by default, and print issue-safe links for your final comment.

On Windows, do not synthesize ad-hoc `powershell.exe -Command ... curl.exe ...` chains for attachment/work-product uploads or issue mutations. That pattern is noisy, brittle, and can look suspicious to local security tooling. Use the Node helpers or a native `fetch`-based script instead.

## Workspace-Only File References

Use a workspace-only reference only when the file should stay in the project or
execution workspace, such as a source file, committed report, generated index,
or other file whose value is tied to the checkout. This is not a substitute for
uploading a deliverable file that a board user should be able to inspect outside
the workspace.

Annotate the work product with `metadata.resourceRef`:

```json
{
  "type": "document",
  "provider": "workspace",
  "title": "Regression test plan",
  "status": "ready_for_review",
  "reviewState": "needs_board_review",
  "summary": "Markdown plan committed in the execution workspace.",
  "metadata": {
    "resourceRef": {
      "kind": "workspace_file",
      "issueId": "<issue-id>",
      "workspaceKind": "execution_workspace",
      "workspaceId": "<execution-workspace-id>",
      "relativePath": "doc/plans/regression-test-plan.md",
      "line": 1,
      "displayPath": "doc/plans/regression-test-plan.md"
    }
  }
}
```

`workspaceKind` is `execution_workspace` for the current issue checkout or
`project_workspace` for a shared project workspace. `line` and `column` are
optional positive integers. `relativePath` must be relative to the selected
workspace root; do not use host-local absolute paths in `resourceRef`.

Create the work product with a native helper or your own JSON client. If you must do it manually, the payload shape is:

```bash
curl -sS -X POST \
  "$PAPERCLIP_API_URL/api/issues/$PAPERCLIP_TASK_ID/work-products" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID" \
  -H "Content-Type: application/json" \
  --data-binary @workspace-file-work-product.json
```

If the helper is unavailable, prefer a native Node script using `fetch`/`FormData`. Only use raw `curl` as a last resort on trusted systems:

```bash
curl -sS -X POST \
  "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/issues/$PAPERCLIP_TASK_ID/attachments" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID" \
  -F 'file=@"path/to/output.webm";type=video/webm'
```

Then create a work product when the file is the deliverable. The server canonicalizes attachment-backed artifact metadata from the `attachmentId`:

```bash
curl -sS -X POST \
  "$PAPERCLIP_API_URL/api/issues/$PAPERCLIP_TASK_ID/work-products" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID" \
  -H "Content-Type: application/json" \
  --data-binary '{
    "type": "artifact",
    "provider": "paperclip",
    "title": "Walkthrough render",
    "status": "ready_for_review",
    "reviewState": "needs_board_review",
    "isPrimary": true,
    "metadata": { "attachmentId": "<uploaded-attachment-id>" }
  }'
```

In your final issue comment, link the uploaded attachment or work product and
describe what it contains. If the output is workspace-only, name the work
product and the relative path that was recorded in `metadata.resourceRef`.
Browse/search is the fallback for recovering a workspace file when the issue
chip or link cannot open it; it is not the preferred deliverable path. Do not
leave artifact-producing work `in_progress` with only a local path or a
`Remaining` note.
