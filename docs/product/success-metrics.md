# Success Metrics

Last updated: 2026-05-26

## Product Metrics

| Metric | Target | Source | Review cadence | Notes |
| --- | --- | --- | --- | --- |
| Project structural readiness | Active project rows at `structure-ready` once onboarded | `/Aplikacje/APPLICATIONS_INDEX.md` | after project audit | Structural only; runtime proof is separate. |
| Known-state freshness | Active project has current index/ledger/status artifacts | project `docs/status` and `history/audits` | daily or after meaningful work | Soar uses `pnpm run ops:project:known-state`. |
| Blocker clarity | Every blocked issue has owner, unblock action, and evidence | Paperclip audit | each heartbeat | No anonymous blocked work. |
| Evidence closure | Done issues link to tests/docs/history/proof | issue comments + repo history | each closure | Prevents repeated fixes without proof. |

## Quality Metrics

| Metric | Target | Source | Review cadence | Notes |
| --- | --- | --- | --- | --- |
| Paperclip audit health | `overall: pass` | `node scripts/audit-luckysparrow-softwarehouse.mjs` | each coordination pass | Includes stale runs, Spark drift, instruction drift, root drift. |
| Instruction drift | `0` drift rows | softwarehouse audit | after agent instruction changes | Ensures agents share the same core operating context. |
| Root portfolio drift | `0` drift rows | softwarehouse audit | after project docs/status changes | Keeps `/Aplikacje` usable as the dashboard. |
| Secret leakage | no secret values in repo artifacts | scoped scans and manual review | before commit | Presence booleans are allowed; values are not. |

## Agent/Automation Metrics

| Metric | Target | Source | Review cadence | Notes |
| --- | --- | --- | --- | --- |
| Live-run posture | active work when runnable work exists; no stale `in_progress` | Paperclip audit | heartbeat | Autonomy should not be idle while safe work exists. |
| Pending confirmations | only real human/operator gates remain pending | Paperclip audit | heartbeat | Stale confirmations should be synchronized with newer evidence. |
| Routine coverage | key routines active with triggers | Paperclip audit | daily | Avoid too many duplicate loops; keep meaningful routines alive. |

## Maintenance Rule

When a metric becomes irrelevant, mark it deprecated with a reason instead of
silently deleting it.
