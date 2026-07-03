# Definition Of Ready

Status: active baseline
Date: 2026-06-03
Owner: Product Lead

An issue can start implementation only when it has enough context for a competent agent to act without guessing.

## Minimum Ready Fields

- business or technical goal
- project context
- related files, modules, documents, or repositories
- expected result
- acceptance criteria
- technical constraints
- known risks
- receiver or reviewing role
- process class from `docs/softwarehouse/01-process-map.md`
- planned verification method

## If Ready Is Missing

The agent enters DISCOVERY:

1. Check issue documents, repo docs, architecture graph, project docs, and recent comments.
2. Fill in missing context if it can be inferred safely.
3. Create a narrow follow-up if a different role owns the missing piece.
4. Use `NEEDS_HUMAN_DECISION` only when the missing information cannot be discovered locally and a reasonable assumption would be risky.

