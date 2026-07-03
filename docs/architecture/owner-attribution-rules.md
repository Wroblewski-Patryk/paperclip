# Architecture Owner Attribution Rules

Last updated: 2026-05-27
Scope: LUC-277

This mapping is the default owner-attribution contract used by
`scripts/build-architecture-awareness-index.mjs` when entity owners are not
explicitly set in source artifacts.

## Rules

| Path prefix | Default owner |
| --- | --- |
| `server/` | `Backend Platform Lead` |
| `ui/` | `Frontend Experience Lead` |
| `packages/db/` | `Data Platform Lead` |
| `packages/shared/` | `Shared Contracts Lead` |
| `packages/adapters/` | `Adapters Runtime Lead` |
| `packages/adapter-utils/` | `Adapters Runtime Lead` |
| `packages/plugins/` | `Plugin Platform Lead` |
| `cli/` | `Developer Experience Lead` |
| `tests/` | `QA Regression Lead` |
| `scripts/` | `Engineering Delivery Lead` |
| `doc/` | `Docs Memory Lead` |
| `docs/` | `Docs Memory Lead` |
| `softwarehouse/` | `CTO Architect` |

Fallback for unmatched paths: `Engineering Delivery Lead`.

## Notes

- Existing explicit owner values remain authoritative.
- This is a default attribution layer to make ownership visible in generated
  architecture exports and reports.
