# LUC-1898 Legacy Hosted Paperclip Decommission Postflight

Date: 2026-07-26
Result: PASS

## Executed Boundary

- Deleted Coolify application UUID: `tcf6zwrsz3x5cjtyx9in8aj2`
- Deleted exclusive volume UUID: `7cff7696bb5136cb1e0025ac`
- Deleted application configurations: yes
- Broad Docker cleanup: no
- Connected-network deletion: no
- Project/environment/destination deletion: no
- Repository or Git history mutation: no

The write-scoped API token rejected deletion with HTTP 403 and the operation
stopped without mutation. The owner-authenticated Coolify action was then
executed through the installed version's `project.shared.danger` workflow,
with only `delete_volumes` and `delete_configurations` selected. Coolify
returned the environment redirect and no error return.

## Coolify Postconditions

- Exact target application GET: HTTP 404
- Exact target storage GET: HTTP 404
- Application count: 13 before, 12 after
- Existing service count: 1 before, 1 after
- Existing database count: 2 before, 2 after
- Missing protected application UUIDs: 0

All 12 non-target application UUIDs recorded in the preflight remain present,
including Roost, Featherly test, Aviary, Jarvis, both Nest applications, both
Soar applications, and all four Soar workers.

## Runtime And Domain Probes

- `paperclip.luckysparrow.ch/`: HTTP 503 after deletion
- `paperclip.luckysparrow.ch/api/health`: HTTP 503 after deletion
- Local `127.0.0.1:3200/api/health`: HTTP 200
- Soar web: HTTP 200
- Soar API health: HTTP 200
- Roost web: HTTP 200
- Roost API health: HTTP 200

The 503 responses are the expected proxy outcome after removing the application
while leaving the wider DNS/proxy infrastructure untouched. They prove the old
Paperclip is no longer served. Coolify did not expose a usable byte-level disk
metric through the available server API, so exact reclaimed bytes are not
claimed; application configuration, container lifecycle, and its exclusive
volume have been removed.

## Final Disposition

Paperclip is now local-only on strict ports `3200` and `54329`. VPS application
capacity remains reserved for Soar, Roost, and the other preserved product
applications. The owner GitHub repository remains intact and will receive the
local Paperclip lineage through a separately verified non-deployment branch.
