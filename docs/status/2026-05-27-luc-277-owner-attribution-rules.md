# 2026-05-27 LUC-277 Owner Attribution Rules

Issue: `LUC-277` (`[LUC-265] Define and apply architecture owner attribution rules`)

## Objective

Define deterministic owner mapping for architecture entities and apply defaults
in the graph export pipeline.

## Changes Implemented

1. Added deterministic path-prefix owner attribution rules in
   `scripts/build-architecture-awareness-index.mjs`.
2. Added default fallback owner for unmatched paths.
3. Applied owner inference during entity finalization when owner is unset.
4. Extended report output with owner-coverage signal:
   `Entities without owner attribution`.
5. Added mapping contract documentation:
   `docs/architecture/owner-attribution-rules.md`.

## Verification

Commands:

```sh
node scripts/build-architecture-awareness-index.mjs --project Paperclip --root . --out docs
```

```sh
node -e "const fs=require('fs');const g=JSON.parse(fs.readFileSync('docs/graphs/architecture-awareness.json','utf8'));console.log(g.entities.filter(e=>!e.owner||!String(e.owner).trim()).length)"
```

Observed evidence:

- `docs/status/architecture-awareness-report.md` includes
  `Entities without owner attribution: 0`.
- `docs/graphs/architecture-awareness.json` has `0` entities with blank owner.

## Notes

- Workspace contains unrelated pre-existing changes outside this issue lane.
  This issue update intentionally avoided modifying or reverting those files.
- 2026-05-27 project consolidation note: the generated report includes an
  environment-specific absolute `Root` path string, but owner attribution
  rules and verification are based on repository-relative entity paths. If this
  repo is run from a new canonical workspace location, regenerate exports with
  the same command to refresh only location metadata.
