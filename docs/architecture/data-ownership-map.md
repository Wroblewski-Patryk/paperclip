# Data Ownership Map

Last updated: YYYY-MM-DD

## Purpose

Define which module owns each important data entity, who may write it, who may
read it, and which values are projections or caches.

## Data Ownership

| Entity / store | Source of truth | Write owner | Read consumers | Lifecycle | Risk | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| ExampleEntity | database table | example module | web/api | create/update/archive | medium |  |

## Rules

- Data writes happen only through the approved owner.
- Projections and caches must name their source.
- Deletes should be lifecycle transitions unless irreversible deletion is
  explicitly required.
- Cross-tenant/workspace ownership must fail closed.

## Maintenance Rule

When schema, persistence, cache, projection, import/export, or reset behavior
changes, update this map.
