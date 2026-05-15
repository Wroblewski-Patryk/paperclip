# Hindsight Memory

Paperclip includes a bundled LuckySparrow Hindsight Memory plugin at
`packages/plugins/plugin-hindsight-memory`.

On server startup, Paperclip auto-provisions the plugin from the bundled package
unless `PAPERCLIP_HINDSIGHT_AUTO_INSTALL=false` is set. This keeps local
development and Docker/Coolify redeploys on the same plugin implementation
instead of depending on a manually installed package in `~/.paperclip`.

## Runtime Behavior

- `agent.run.started`: fetches the assigned issue and recalls relevant memories
  into run-scoped plugin state as `recalled-memories`.
- `issue.comment.created`: retains the full comment body to Hindsight when the
  comment can be attributed to an agent.
- `agent.run.finished`: no-op; retention is comment-driven.
- Agent tools:
  - `hindsight_recall`
  - `hindsight_retain`

Memory banks default to `paperclip::{companyId}::{agentId}`, so memories remain
isolated per company and agent.

## Environment Variables

Set these in local shell, Docker, or Coolify environment variables:

```sh
PAPERCLIP_HINDSIGHT_AUTO_INSTALL=true
PAPERCLIP_HINDSIGHT_API_URL=http://localhost:8888
PAPERCLIP_HINDSIGHT_RECALL_BUDGET=mid
PAPERCLIP_HINDSIGHT_AUTO_RETAIN=true
PAPERCLIP_HINDSIGHT_API_KEY_REF=HINDSIGHT_API_KEY
```

`PAPERCLIP_HINDSIGHT_API_KEY_REF` is optional. Use it only when the Hindsight
backend requires an API key. The value must be a Paperclip secret reference name,
not the raw token.

## Local Setup

Build the bundled plugin once before starting a fresh local dev instance:

```sh
pnpm --filter @luckysparrow/paperclip-plugin-hindsight-memory build
pnpm dev
```

For local self-hosted Hindsight, start Hindsight on port `8888` before testing
the plugin connection:

```sh
python -m pip install hindsight-all
```

PowerShell:

```powershell
$env:HINDSIGHT_API_LLM_API_KEY = "<provider-api-key>"
hindsight-api
```

## Coolify / VPS

The Paperclip Docker build compiles the bundled plugin. On redeploy, server
startup installs or refreshes the registry row for `paperclip-plugin-hindsight`
from `packages/plugins/plugin-hindsight-memory`.

Required Coolify configuration:

- Set `PAPERCLIP_HINDSIGHT_API_URL` to a URL reachable from the Paperclip
  container.
- If using Hindsight Cloud, create a Paperclip secret such as
  `HINDSIGHT_API_KEY`, then set
  `PAPERCLIP_HINDSIGHT_API_KEY_REF=HINDSIGHT_API_KEY`.
- Do not put raw Hindsight tokens in repository files or Docker image config.

For a separate Hindsight service in the same Docker network, use the service
DNS name, for example:

```sh
PAPERCLIP_HINDSIGHT_API_URL=http://hindsight:8888
```

For a Hindsight process running directly on the VPS host, expose it through a
private reverse proxy or use an address reachable from the container. Do not
assume `localhost` inside the Paperclip container points to the VPS host; it
points to the Paperclip container itself.

## Verification

After Paperclip starts:

```sh
curl http://localhost:3100/api/plugins/paperclip-plugin-hindsight
curl -X POST http://localhost:3100/api/plugins/paperclip-plugin-hindsight/config/test \
  -H "Content-Type: application/json" \
  -d '{"configJson":{"hindsightApiUrl":"http://localhost:8888","bankGranularity":["company","agent"],"recallBudget":"mid","autoRetain":true}}'
```

Expected result:

- plugin status is `ready`;
- manifest capabilities include `issues.read` and `issue.comments.read`;
- config test passes only when the Hindsight backend is reachable.
