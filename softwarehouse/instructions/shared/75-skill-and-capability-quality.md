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
- CHRO owns staffing/authority impact.
- CTO owns engineering/runtime/security/tooling fit for technical skills.
- DSM owns durable docs, changelog, and discoverability.

If a skill expands browser access, external systems, filesystem scope, secrets,
production reach, or deployment authority, route it through Security/Ops/CTO
review before assignment.

## Continuous Improvement

When repeated work reveals reusable knowledge, decide in this order:

1. update an existing role instruction;
2. update a shared operating rule;
3. update an existing skill;
4. add a script or routine with proof;
5. propose a new skill with owner, tests, and retirement criteria.

If the improvement does not reduce future ambiguity, repeated work, risk, or
human intervention, record `no durable change` instead of adding process noise.
