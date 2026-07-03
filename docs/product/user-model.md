# User Model

Last updated: 2026-05-26

## User Roles

| Role | Goals | Permissions | Core journeys | Risks |
| --- | --- | --- | --- | --- |
| Owner/operator | See project status, give direction, approve sensitive gates. | Human authority for production/LIVE/secret decisions. | Review inbox, approve/deny gates, request new apps/work. | Over-approval or unclear scope can trigger unsafe work. |
| Project-level Codex chat | Bridge between the owner and Paperclip for a specific repo. | Local repo access; no autonomous production mutation unless gated. | Ask Paperclip PM/agents for scans, fixes, proof, and status. | Duplicating Paperclip lanes or bypassing project manager hierarchy. |
| Paperclip project manager agent | Maintain project truth and delegate narrow work. | Create/route issues, update status, request specialists. | Intake, triage, supervise, integrate evidence, update project docs. | Broad task ownership can hide unresolved specialist blockers. |
| Specialist agent | Execute one bounded responsibility. | Work only in assigned lane and allowed workspace. | Implement, test, document evidence, report blocker. | Scope creep, missing proof, or touching unrelated layers. |

## Operator Roles

| Role | Responsibilities | Tools | Approval authority | Evidence needed |
| --- | --- | --- | --- | --- |
| Portfolio Director | Maintain `/Aplikacje` radar and project priorities. | Paperclip, root index updater, audits. | Can decide project intake order. | Project status and root index evidence. |
| CTO / Architect | Maintain architecture awareness and role boundaries. | Graph scripts, agent roster, instruction sync. | Can change architecture/process after evidence. | Graph drift, instruction drift, audit results. |
| Ops / Security | Handle deploy, Coolify, secrets, and production gates. | Coolify, smoke scripts, Paperclip secrets. | Needs explicit gate for deploy/recovery/mutation. | SHA, smoke, readiness, rollback, no-secret proof. |

## Context Model

- The system may know project paths, issue IDs, agent roles, public URLs, and
  redacted presence of required secrets.
- The system must never persist secret values, cookies, tokens, passwords, raw
  account data, or private API keys.
- User preferences: local/free tools first, no push/deploy without explicit
  instruction, autonomous agents should keep working until state is known.
- Learnable preferences: preferred project lifecycle, role split, proof format,
  and acceptable automation cadence.

## Maintenance Rule

When agent authority, user approval boundaries, or project-chat bridge behavior
changes, update this model and the shared instructions.
