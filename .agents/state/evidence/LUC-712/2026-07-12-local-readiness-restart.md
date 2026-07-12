# LUC-712 local readiness restart evidence

Date: 2026-07-12
Scope: local Soar development runtime only

## Change applied

- Restarted the local Soar backend so the running process loaded source commit `674b59374e6d969a7d6a8ada77d6845734228ee9`.
- The commit provides process-local development keyring injection without writing secret material to repository files.
- No production process, VPS resource, Coolify application, or remote repository was changed.

## Verification

Final probes after the restart:

```text
GET http://127.0.0.1:3001/health
HTTP 200
{"status":"ok","service":"api"}

GET http://127.0.0.1:3001/ready
HTTP 200
{"status":"ready","service":"api"}
```

The final board readback was recorded at `2026-07-12T13:23:43Z`.

## Runtime disposition

- The long-lived backend process remained healthy after the agent run was cancelled.
- The run was cancelled only because uploading a 1.1 MB live backend log did not terminate; the full live log was not used as evidence.
- After cancellation, there were zero Paperclip-owned agent Codex processes and the Soar backend still returned `200` for both probes.

## Safety

- No credentials, request headers, cookies, key values, or protected inputs are included here.
- No push, deploy, production restart, rollback, or destructive infrastructure action occurred.
