# Softwarehouse Agent Instruction Audit

Date: 2026-07-06

## Verdict

LuckySparrow Softwarehouse agents do have rich Markdown-based instruction bundles. The current layout is not a single shared `personas/` directory; it is one tracked instruction bundle per agent:

`C:\Personal\Projekty\Aplikacje\Paperclip_Softwarehouse\.paperclip\agent-instructions\ae26bb8b-8f5f-4a85-b341-78d4e1985975\agents\<agentId>\instructions`

The legacy user-home instance copy may still exist as a runtime fallback, but it is no longer the canonical source for active Softwarehouse agent instructions:

`C:\Users\wrobl\.paperclip\instances\default\companies\ae26bb8b-8f5f-4a85-b341-78d4e1985975\agents\<agentId>\instructions`

This is acceptable for the current `codex_local` runtime because each agent receives its own `AGENTS.md` plus shared reference Markdown files. The discoverability issue is real, though: a human cannot easily browse "all personalities" from one obvious directory.

## Current Shape

Each active agent bundle contains:

- `AGENTS.md` with agent name, title, role, skills, role scope, department, working profile, manager/reporting context, operating guardrails, and role-specific collaboration rules.
- `references/*.md` shared operating policies covering Paperclip mechanics, evidence gates, secrets/deploy safety, cost/token efficiency, owner language policy, delegation/reporting, product lifecycle, learning packets, and task lifecycle.

Runtime audit on 2026-07-06 found:

- 39 active/non-terminated agents audited.
- 39 unique instruction bundles; no exact duplicate bundles.
- Minimum bundle size above 54 KB.
- 21 Markdown files per audited bundle.
- Coverage present for persona, scope, evidence, safety, model/cost/quota, and hierarchy/reporting signals.

## Quality Bar

Agent instruction bundles should remain valid only when all are true:

- The tracked repo instruction root exists.
- `AGENTS.md` exists.
- The active agent `adapterConfig.instructionsRootPath` points at the tracked repo instruction root.
- The bundle has enough Markdown surface to be more than a stub.
- The bundle contains role/persona, scope, evidence, safety, model/cost/quota, and hierarchy/reporting guidance.
- No two active agents share an identical instruction bundle.

Run:

```sh
pnpm run softwarehouse:agent-instructions-audit
pnpm run softwarehouse:runtime-file-state-audit
```

## Known Gap

There is no canonical human-facing `personas/` index yet. That is a discoverability/documentation gap, not a runtime blocker. If it becomes painful, add a generated index under `docs/` or a read-only UI surface that groups each active agent by department, role, working profile, model profile, and instruction root.
