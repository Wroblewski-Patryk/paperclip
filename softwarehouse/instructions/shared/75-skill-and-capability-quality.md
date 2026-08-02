# Skill And Capability Quality

Skills are shared company capability, not private prompt snippets. Prefer
improving an existing skill, instruction, script, routine, or operating process
before creating a new one.

## Skill Quality Contract

Any new or materially changed Softwarehouse skill should record, either in the
skill body or an adjacent README/changelog, the smallest useful set of metadata:

- id or stable name;
- owner role;
- department or process class;
- version or dated change note;
- purpose and non-goals;
- required permissions and workspace assumptions;
- supported tools or scripts;
- input shape and expected output shape;
- verification or smoke test;
- compatibility notes;
- quality risks and known limitations;
- related procedures, routines, or role files.

Do not promote a skill to shared use until at least one realistic test case or
trial issue proves that another agent can use it without hidden context.

## Ownership

- AID owns AI-agent skill/process improvement proposals.
- AIM owns AI-agent staffing, hiring, and authority-impact decisions in current Stage 1.
- CHRO owns broad human-capital staffing impact only when that scope is explicitly reopened.
- CTO owns engineering/runtime/security/tooling fit for technical skills.
- DSM owns durable docs, changelog, and discoverability.

If a skill expands browser access, external systems, filesystem scope, secrets,
production reach, or deployment authority, route it through Security/Ops/CTO
review before assignment.

A skill attachment is instruction metadata, not proof that its underlying tool
is callable. Before opening a runtime-capability recovery chain, distinguish:

- an attached skill or environment hint;
- an executable available through the shell;
- an MCP/tool interface actually listed by the current agent heartbeat.

For the governed DRE browser surface, use
`pnpm softwarehouse:controlled-browser-runtime` for a read-only direct MCP
smoke and `pnpm softwarehouse:controlled-browser-runtime:apply` only while the
DRE has no active heartbeat. The smoke must prove both `browser_navigate` and
`browser_close`, open and close an isolated context, and leave no persistent
browser profile. Do not create reciprocal source/recovery blocker links when a
fresh heartbeat merely needs to verify an already repaired capability.

## Continuous Improvement

When repeated work reveals reusable knowledge, decide in this order:

1. update an existing role instruction;
2. update a shared operating rule;
3. update an existing skill;
4. add a script or routine with proof;
5. propose a new skill with owner, tests, and retirement criteria.

If the improvement does not reduce future ambiguity, repeated work, risk, or
human intervention, record `no durable change` instead of adding process noise.
