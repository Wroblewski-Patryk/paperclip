# LUC-1898 Legacy Hosted Paperclip Decommission Preflight

Date: 2026-07-26
Decision: PASS for exact-target application deletion only
Owner authorization: current owner conversation, limited to hosted Paperclip

## Exact Target

- Coolify type: application
- UUID: `tcf6zwrsz3x5cjtyx9in8aj2`
- Name: `Paperclip`
- Domain: `https://paperclip.luckysparrow.ch`
- Repository: `Wroblewski-Patryk/paperclip`
- Branch: `main`
- Coolify source field: `HEAD`
- Status before deletion: `running:healthy`
- Environment id: `12`
- Destination id: `0`
- Application database relationships returned by Coolify: none
- Additional networks returned by Coolify: none
- Exclusive persistent storage returned by the application storage endpoint:
  `7cff7696bb5136cb1e0025ac`, named
  `tcf6zwrsz3x5cjtyx9in8aj2_paperclip-data`, mounted at `/paperclip`

The target matched both the exact domain and the exact owner repository. No
other Coolify application matched either identifier.

## Preserved Application Inventory

The before snapshot contained 13 applications, one service, and two databases.
Every application below is outside the deletion target and must remain present:

| UUID | Name | Repository/domain signal |
| --- | --- | --- |
| `rnqqkhl3o3dut4qv56mlxly2` | Roost | `Wroblewski-Patryk/Roost` |
| `e11uwjxmbvoxnucqvb7lhpwq` | Test website | `Wroblewski-Patryk/Featherly` |
| `jr1oehwlzl8tcn3h8gh2vvih` | aviary | `Wroblewski-Patryk/Aviary` |
| `ilkbdv7u0kjyiryysypuj61s` | jarvis | `Wroblewski-Patryk/jarvis` |
| `ftv6g7enj8qddkivh4q8btz4` | nest-api | `api.nest.luckysparrow.ch` |
| `pn81lbc9nsq9zcmd992phtfs` | nest-web | `nest.luckysparrow.ch` |
| `k126p7vqxs5cly2zc4y4g4rq` | soar-api | `api.soar.luckysparrow.ch` |
| `ato4fqkncd6t38wzlle2m0rv` | soar-web | `soar.luckysparrow.ch` |
| `gktawk85w6826z2bs8z123mz` | workers-backtest | `Wroblewski-Patryk/Soar` |
| `s2qz86w8c9hc5anajdtl5d8r` | workers-execution | `Wroblewski-Patryk/Soar` |
| `sj0bh3pirqq1jf41bijaf77y` | workers-market-data | `Wroblewski-Patryk/Soar` |
| `d2oo1wwy8i55q27e5mdky0i4` | workers-market-stream | `Wroblewski-Patryk/Soar` |

The target shares the Coolify destination with several applications and its
environment id with some preserved applications. Therefore neither the
destination nor the environment may be deleted. The application-specific API
is the only approved deletion boundary.

## Safe Delete Parameters

The installed Coolify version reports `4.0.0-beta.473`. Its matching official
OpenAPI contract defines `DELETE /applications/{uuid}` and four optional query
flags. The approved request is:

- `delete_configurations=true`
- `delete_volumes=true` because the only discovered volume is named with the
  exact target UUID and is mounted only into Paperclip
- `docker_cleanup=false` to avoid a broad Docker cleanup affecting artifacts
  retained for other applications
- `delete_connected_networks=false` because other applications share the
  destination and no target-specific additional network was discovered

No project, environment, destination, repository, DNS zone, service, database,
or non-target application deletion is authorized.

## Review Limitation And Disposition

The assigned independent SPA run could not start because the configured OpenAI
metered lane returned `Quota exceeded` before consuming tokens. The local board
operator therefore performed the read-only Coolify/API review directly,
recorded the exact boundary above, and kept the destructive action separately
gated behind this inspectable preflight. Raw credentials and environment values
were not emitted.

## Required Postconditions

1. The target application and exact target volume are absent.
2. The other 12 application UUIDs remain present.
3. The existing service and two databases remain present.
4. Soar and Roost remain present with no deletion request sent to their UUIDs.
5. `paperclip.luckysparrow.ch` stops serving Paperclip.
6. Local Paperclip remains healthy on `127.0.0.1:3200` and PostgreSQL remains
   on `54329`.
