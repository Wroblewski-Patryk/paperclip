# Paperclip Knowledge + CompanyCore Integration Plan

Date: 2026-05-15
Status: implementation plan
Scope: add a Paperclip `Knowledge` surface that lets the board and agents work from LuckySparrow's real company structure in CompanyCore, Google Drive, and later ClickUp.

## Goal

Add a `Knowledge` tab to Paperclip that shows agent-readable company tables and operational readiness state, then connect it to CompanyCore as the canonical company source of truth.

The first production outcome is not a general wiki. The outcome is an operating cockpit:

- what real company data exists,
- what is missing before agents can run the company,
- which Drive files/sheets/docs back each fact,
- which CompanyCore tables are safe for agents to read or write,
- which Paperclip issues should be created for humans and agents to close the gaps.

## Product Direction

Paperclip remains the control plane: companies, agents, issues, approvals, runs, budgets, and governance.

CompanyCore remains the operating data spine and tool gateway: clients, deals, tasks, notes, decisions, agents, logs, operating areas, operating tables, Drive files, snapshots, ClickUp mappings, procedures, pipelines, policies, risks, controls, and automation definitions.

The `Knowledge` tab in Paperclip should be a governed window into that spine, not a duplicate CRM or second database of truth.

Paperclip agents should not connect directly to Google Drive, ClickUp, or other
company tools while those tools are already represented through CompanyCore.
CompanyCore is the only supported bridge for those layers. If a future tool is
outside CompanyCore, it should be added deliberately as a separate Paperclip
tool/integration surface or first folded into CompanyCore.

## Two Paperclip Surfaces

Use two distinct Paperclip concepts:

1. `Knowledge`
   - what the company knows,
   - where facts came from,
   - what is missing,
   - business plan reviews,
   - Drive-derived summaries exposed by CompanyCore,
   - semantic document and pipeline proposals.

2. `Tools`
   - what agents can do through CompanyCore,
   - available MCP tools from CompanyCore manifest,
   - capability scopes,
   - approval requirements,
   - tool health,
   - recent tool calls,
   - agent-to-tool access policy.

This keeps cognition and action separate. `Knowledge` is the map. `Tools` is
the governed command surface.

## Target Operating Loop

The deeper goal is for Paperclip agents to turn the owner's scattered company
knowledge into an executable company operating system.

The loop should work like this:

1. An agent starts from a high-value source, such as the current business plan.
2. It extracts claims, assumptions, goals, offers, target customers, promises,
   responsibilities, missing inputs, and implied work.
3. It compares those facts against CompanyCore records and Drive-backed
   knowledge.
4. When it finds gaps, it plans the next evidence pass:
   - which Drive docs/sheets to inspect,
   - which CompanyCore tables to query,
   - which Paperclip issues/comments/documents to read,
   - which human questions need answers.
5. It proposes or performs governed updates:
   - update the business plan,
   - create or update semantically connected documents,
   - create or update CompanyCore records,
   - create Paperclip issues for human/agent execution,
   - create pipelines/procedures that make the work repeatable.
6. It records provenance so every update says where the fact came from and how
   confident the agent is.

CompanyCore should be treated as the bridge between Paperclip agents and the
company tools/data available in CompanyCore. Paperclip should not bypass that
bridge for CompanyCore-owned provider state, Drive state, ClickUp state,
operating model data, or governed business records.

## Business Plan Intelligence

The business plan should become a living governed document, not a static file.

Paperclip should support a `Business Plan Review` workflow:

1. Locate the canonical business plan through CompanyCore knowledge roots,
   Drive files, or an explicit operator-selected source.
2. Read the latest business plan content or snapshot.
3. Build a structured map:
   - mission and vision,
   - target customers,
   - offer/service/product definitions,
   - revenue model,
   - acquisition channels,
   - delivery process,
   - current constraints,
   - metrics and targets,
   - risks,
   - missing assumptions,
   - decisions already made,
   - unresolved questions.
4. Compare that map to CompanyCore tables:
   - `clients`, `stakeholders`, `deals`, `interactions`,
   - `projects`, `goals`, `targets`, `task_lists`, `tasks`,
   - `processes`, `pipelines`, `procedures`,
   - `standards`, `policies`, `risks`, `controls`, `metrics`,
   - `knowledge_items`, `notes`, `decisions`,
   - `storage_locations`, `knowledge_roots`, `google_drive_files`.
5. Produce a review result:
   - confirmed facts,
   - contradictions,
   - missing sections,
   - stale claims,
   - source documents that need review,
   - proposed edits,
   - proposed new connected documents,
   - proposed CompanyCore records,
   - proposed Paperclip tasks.
6. Apply changes only through the configured governance mode:
   - `draft_only`: create a Paperclip document/issue with proposed patches.
   - `approval_required`: request approval before writing to CompanyCore or Drive.
   - `supervised_write`: write low-risk updates, then log evidence.

Connected documents that may be created or updated:

- company strategy
- ICP / customer profiles
- offer catalog
- sales pipeline definition
- delivery pipeline definition
- onboarding checklist
- operating procedures
- risk register
- metric definitions
- agent role briefs
- ClickUp workspace/list mapping notes
- Drive cleanup plan

## Pipeline Generation

The Knowledge system should convert recurring company work into CompanyCore
pipelines and Paperclip execution patterns.

Pipeline candidates should be inferred from the business plan, Drive docs,
CompanyCore records, and repeated Paperclip issues. Examples:

- lead intake
- lead qualification
- offer preparation
- proposal follow-up
- client onboarding
- project delivery
- weekly company review
- Drive cleanup and knowledge hygiene
- business plan review
- ClickUp task maintenance
- content/marketing production
- finance/admin review
- agent performance review

For every proposed pipeline, the agent should produce:

- name and purpose,
- trigger,
- inputs,
- outputs,
- owner role,
- stages,
- stage entry/exit conditions,
- required tools,
- approval gates,
- risks,
- linked CompanyCore tables,
- linked Paperclip agent roles,
- linked Drive/ClickUp/GitHub sources if relevant.

Safe first implementation:

1. Generate pipeline proposals as Paperclip documents and issues.
2. Store them as CompanyCore `processes`, `pipelines`, `pipeline_stages`, and
   `procedures` only after approval.
3. Keep automation disabled by default.
4. Enable automation definitions one by one after a dry-run succeeds.

## Architecture Decision

Use a read-through bridge first.

```text
Paperclip UI Knowledge and Tools tabs
  -> Paperclip server company-scoped knowledge/tool routes
    -> CompanyCore HTTP API / MCP manifest tools only
      -> CompanyCore PostgreSQL + provider adapters
        -> Google Drive / Docs / Sheets
        -> ClickUp
```

Why:

- CompanyCore already has workspace-scoped auth, service API keys, scopes, operating model routes, Drive import/snapshot tables, ClickUp sync, events, and an MCP manifest.
- Paperclip V1 explicitly defers a native knowledge base subsystem, but already supports plugin/runtime surfaces and company-scoped governance.
- A bridge lets Paperclip agents use real business structure without bypassing CompanyCore validation, audit, provider secrets, or workspace boundaries.
- Direct Paperclip-to-Drive or Paperclip-to-ClickUp access is intentionally out of scope for this integration. Those providers are reached through CompanyCore.

## Phase 0: Discovery And Safety Baseline

1. Create a Paperclip test company: `LuckySparrow Lab`.
2. Create a CompanyCore service key with least privilege:
   - read: `connection:read`, `mcp:read`, `company-os:read`, `operating-model:read`, `google-drive:files:read`, `notes:read`, `decisions:read`, `tasks:read`, `clients:read`, `deals:read`
   - write later, not in phase 0: `notes:write`, `decisions:write`, `tasks:write`, `agent-logs:write`, selected lifecycle command scopes
3. Store CompanyCore base URL and API key in Paperclip company secrets/provider config, never in repo files.
4. Add a CompanyCore connection smoke:
   - `GET /v1/connection`
   - `GET /v1/mcp/manifest`
   - `GET /v1/operating-model`
5. Save connection metadata in Paperclip activity log:
   - workspace id/name
   - effective capabilities
   - schema version
   - no raw key material

Acceptance:

- Paperclip can verify the CompanyCore workspace for one selected Paperclip company.
- Failure states are visible in UI: missing config, invalid key, missing scopes, CompanyCore unreachable.

## Phase 1: Paperclip Knowledge Tab MVP

Add a first-class route:

- UI route: `/:companyPrefix/knowledge`
- Sidebar entry under `Company`, icon: `BookOpen` or `Database`
- Mobile nav: do not add initially unless usage proves it deserves one of five slots

Initial tabs inside the page:

1. `Overview`
   - connection health
   - CompanyCore workspace
   - total operating areas/tables
   - Drive files imported/scanned
   - open data gaps
   - last audit run

2. `Tables`
   - operating areas, folders, tables from CompanyCore
   - table slug, source, description, linked storage/knowledge roots
   - record count where the CompanyCore API exposes it
   - read/write capability badges

3. `Drive`
   - imported Drive folders/files
   - scan status, content kind, last synced/scanned
   - linked operating area/folder/table
   - latest snapshot summary

4. `Readiness`
   - structured checklist of missing company-core data
   - each finding can become a Paperclip issue
   - severity, owner, suggested target table, source evidence

5. `Agent Access`
   - which Paperclip agents may read/write CompanyCore
   - mapped CompanyCore key profile
   - allowed tools/capabilities
   - last agent read/write evidence

6. `Plans`
   - canonical business plan status
   - latest review result
   - proposed patches
   - connected document graph
   - contradictions and missing inputs

7. `Pipelines`
   - proposed CompanyCore pipelines
   - approved pipelines
   - dry-run status
   - linked Paperclip issues/routines/agents

MVP backend routes:

```text
GET /api/companies/:companyId/knowledge/connection
GET /api/companies/:companyId/knowledge/overview
GET /api/companies/:companyId/knowledge/tables
GET /api/companies/:companyId/knowledge/drive-files
GET /api/companies/:companyId/knowledge/readiness
GET /api/companies/:companyId/knowledge/business-plan
GET /api/companies/:companyId/knowledge/pipelines
POST /api/companies/:companyId/knowledge/audit-runs
POST /api/companies/:companyId/knowledge/business-plan/reviews
POST /api/companies/:companyId/knowledge/pipeline-proposals
POST /api/companies/:companyId/knowledge/findings/:findingId/create-issue
GET /api/companies/:companyId/tools/companycore/manifest
GET /api/companies/:companyId/tools/companycore/health
GET /api/companies/:companyId/tools/companycore/agent-access
PATCH /api/companies/:companyId/tools/companycore/agent-access/:agentId
```

These routes should:

- enforce board/company access,
- derive Paperclip company from `companyId`,
- use stored secret refs for CompanyCore credentials,
- redact all external secrets,
- write Paperclip activity log entries for mutations,
- return stable `400/401/403/404/409/422/500` errors.

## Phase 2: Minimal Paperclip Persistence

Keep only bridge state in Paperclip, not duplicated business records.

Add Paperclip tables:

```text
company_knowledge_connections
  id
  company_id
  provider = companycore
  base_url
  secret_binding_id
  external_workspace_id
  external_workspace_name
  capabilities_snapshot jsonb
  schema_version
  status active|degraded|disabled
  last_checked_at
  last_error_code

company_knowledge_mappings
  id
  company_id
  provider
  external_type
  external_id
  paperclip_entity_type
  paperclip_entity_id
  relation_kind
  metadata jsonb

knowledge_audit_runs
  id
  company_id
  provider
  status queued|running|succeeded|failed|cancelled
  started_at
  finished_at
  summary jsonb
  error text

knowledge_audit_findings
  id
  company_id
  audit_run_id
  severity low|medium|high|critical
  status open|accepted|converted_to_issue|ignored|resolved
  finding_type
  title
  description
  evidence jsonb
  external_table_slug
  external_record_id
  issue_id

knowledge_document_reviews
  id
  company_id
  provider
  external_document_id
  document_kind
  status queued|running|drafted|approval_required|applied|failed
  summary jsonb
  proposed_patch jsonb
  evidence jsonb
  confidence numeric
  issue_id

knowledge_pipeline_proposals
  id
  company_id
  audit_run_id
  status proposed|approved|rejected|applied|archived
  name
  purpose
  trigger_type
  proposal jsonb
  evidence jsonb
  external_pipeline_id
  issue_id

companycore_tool_access_policies
  id
  company_id
  agent_id
  companycore_key_profile
  allowed_tool_names jsonb
  allowed_capabilities jsonb
  command_mode read_only|draft_only|approval_required|supervised_operator
  status active|paused|disabled
  last_checked_at
  last_error_code
```

Do not copy CompanyCore clients/tasks/deals/notes into Paperclip tables unless there is a concrete Paperclip governance reason. Use mappings and snapshots for provenance.

## Phase 3: Drive Cleanup And Company Readiness Audit

The first real operating job is a Drive audit that answers:

- which folders are canonical,
- which docs/sheets are stale or duplicated,
- which files map to CompanyCore operating tables,
- which files should become structured CompanyCore records,
- which missing records block ClickUp/task execution,
- which human-owned tasks must be done before agents can operate safely.

Audit pipeline:

1. Inventory selected Drive roots through CompanyCore.
2. Pull metadata and content snapshots for Docs/Sheets where allowed.
3. Classify files:
   - clients / CRM
   - offers and services
   - active projects
   - tasks / obligations
   - procedures / SOPs
   - decisions
   - finance and invoices metadata
   - legal/contracts metadata
   - credentials/secrets references only, never values
   - brand/marketing assets
   - unknown / needs human review
4. Compare classification against CompanyCore operating tables.
5. Produce gap findings:
   - missing table
   - missing record
   - ambiguous source of truth
   - duplicate docs
   - stale doc
   - unstructured sheet that should become records
   - sensitive content needs owner review
6. Generate Paperclip issues:
   - human tasks assigned to the operator,
   - agent tasks assigned to the correct Paperclip role,
   - blocked tasks when approval or credentials are needed.

Initial required CompanyCore operating tables for `company runs well`:

- `clients`
- `stakeholders`
- `deals`
- `interactions`
- `projects`
- `goals`
- `targets`
- `task_lists`
- `tasks`
- `notes`
- `decisions`
- `company_roles`
- `agents`
- `processes`
- `pipelines`
- `procedures`
- `standards`
- `policies`
- `risks`
- `controls`
- `metrics`
- `knowledge_items`
- `storage_locations`
- `knowledge_roots`
- `automation_definitions`
- `google_drive_files`
- `google_drive_content_snapshots`
- `external_container_mappings`
- `external_field_mappings`

## Phase 4: Agent Model

Create or configure a Paperclip agent:

Name: `CompanyCore Knowledge Steward`

Role:

- reads CompanyCore through MCP/HTTP manifest,
- audits Drive-derived knowledge,
- creates Paperclip issues for missing business data,
- proposes CompanyCore writes,
- writes only through approved scoped tools,
- never reads provider secrets,
- never writes directly to CompanyCore PostgreSQL.

Required skills/instructions:

- discover tools with `GET /v1/connection` or `GET /v1/mcp/manifest`,
- use CompanyCore HTTP/MCP tools, not raw DB access,
- cite source file/table/snapshot for every proposed fact,
- when confidence is low, create a Paperclip question/approval instead of writing,
- distinguish human-owner tasks from agent-executable tasks,
- keep ClickUp as an execution mirror until explicitly promoted.

Suggested work loop:

1. Check assigned Paperclip issue.
2. Read relevant CompanyCore tables and Drive snapshots.
3. Produce a gap list with evidence.
4. Create/update Paperclip child issues.
5. If write scope is enabled, write approved notes/decisions/tasks to CompanyCore.
6. Log agent action to CompanyCore `agent_logs` and Paperclip comments.

## Phase 5: ClickUp Activation Path

Do not turn ClickUp into the source of truth first.

Safe order:

1. Use CompanyCore ClickUp discovery to persist Spaces/Folders/Lists as operating areas/folders/tables.
2. Run ClickUp import in `inspect_only`.
3. Review mapping in Paperclip `Knowledge -> Tables`.
4. Run `merge` mode for selected lists only.
5. Let CompanyCore own ClickUp writeback for mapped tasks.
6. Paperclip creates execution issues when agent work is needed.
7. Use mappings to show which CompanyCore/Paperclip task corresponds to a ClickUp task.

Approval gates:

- creating/updating/deleting ClickUp tasks,
- changing task status externally,
- writing comments to external client-visible surfaces,
- changing custom fields used by business reporting.

## Implementation Slices

### Slice A: Connection And UI Shell

Files likely touched:

- `packages/db/src/schema/*`
- `packages/shared/src/types/*`
- `packages/shared/src/validators/*`
- `server/src/routes/*`
- `server/src/services/*`
- `ui/src/App.tsx`
- `ui/src/components/Sidebar.tsx`
- `ui/src/api/*`
- `ui/src/lib/queryKeys.ts`
- `ui/src/pages/Knowledge.tsx`

Deliverables:

- route exists,
- sidebar entry exists,
- connection status card works,
- invalid config is clear.

### Slice B: Tools Surface

Deliverables:

- show CompanyCore MCP manifest tools,
- show capability and approval requirements,
- configure which Paperclip agents may use which CompanyCore tool profiles,
- keep direct Google Drive and ClickUp integrations unavailable unless added as separate explicit tools.

### Slice C: Tables And Drive Read Model

Deliverables:

- list operating model tables,
- list Drive files/snapshots as exposed by CompanyCore,
- basic filters/search,
- no external writes.

### Slice D: Audit Runs And Findings

Deliverables:

- run audit manually,
- persist findings,
- convert finding to Paperclip issue,
- log activity.

### Slice E: Agent Access

Deliverables:

- create `CompanyCore Knowledge Steward`,
- give it scoped credentials,
- prove it can read and create a Paperclip issue,
- keep CompanyCore writes disabled or approval-gated.

### Slice F: Business Plan Review

Deliverables:

- locate canonical business plan,
- extract structured business map,
- compare against CompanyCore records,
- create proposed business plan patch,
- create connected document proposals,
- create Paperclip issues for missing evidence.

### Slice G: Pipeline Proposals

Deliverables:

- infer pipeline candidates from business plan + Drive + CompanyCore,
- show proposals in `Knowledge -> Pipelines`,
- convert approved proposal into CompanyCore process/pipeline/procedure records,
- keep automation disabled until explicitly enabled.

### Slice H: Controlled Writeback

Deliverables:

- allow notes/decisions/task proposals into CompanyCore,
- require approval for risky writes,
- log both Paperclip activity and CompanyCore event/agent log.

## Verification

Targeted checks per slice:

```sh
pnpm --filter @paperclipai/db build
pnpm --filter @paperclipai/shared typecheck
pnpm --filter @paperclipai/server typecheck
pnpm --filter @paperclipai/ui typecheck
pnpm test -- knowledge
```

Before PR-ready handoff:

```sh
pnpm -r typecheck
pnpm test:run
pnpm build
```

Manual smoke:

1. Start Paperclip.
2. Open `/:companyPrefix/knowledge`.
3. Configure CompanyCore connection.
4. Verify tables and Drive records load.
5. Run audit.
6. Convert one finding to issue.
7. Confirm activity log entry.
8. Confirm no raw CompanyCore key appears in logs/API/UI.

## Risks

- Building a native Paperclip knowledge subsystem would fight the V1 boundary and duplicate CompanyCore.
- Copying business rows into Paperclip creates source-of-truth drift.
- Drive docs can contain sensitive content; first audit should store metadata, summaries, and evidence pointers rather than full secret-bearing text.
- Bidirectional ClickUp sync can create loops; keep it CompanyCore-owned and approval-gated.
- Agent write credentials must be least-privilege and scoped to one CompanyCore workspace.

## Acceptance Criteria

The first stage is done when:

1. Paperclip has a company-scoped `Knowledge` tab.
2. The tab reads CompanyCore connection and operating model state.
3. It shows agent-readable tables and Drive-backed sources.
4. It can run a readiness audit and persist findings.
5. A finding can become a Paperclip issue with source evidence.
6. A dedicated Paperclip agent can read CompanyCore through the approved bridge.
7. No raw external secrets are exposed.
8. All mutating Paperclip actions are activity-logged.
