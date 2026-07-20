# Company-aware UI system

Date: 2026-07-20  
Status: implemented across core V1 views

## Purpose

Paperclip should remain a dense, professional control plane while allowing each selected company to feel identifiable. Branding must improve orientation without replacing colors that communicate operational meaning.

This document is the maintenance contract for the company-aware visual layer. It keeps the fork's UX improvements small, testable, and straightforward to carry through upstream updates.

## Theme contract

`Company.brandColor` is the single source of truth. The UI reads it from `CompanyContext`; no duplicate branding endpoint or persisted browser theme is introduced.

`CompanyAppearanceProvider` publishes the selected company's appearance at the document root:

- `--company-accent`
- `--company-accent-foreground`
- `--company-accent-soft`
- `--company-accent-subtle`
- `--company-accent-border`
- `--company-accent-strong`

It also maps the accent to the existing interactive tokens `--primary`, `--ring`, and `--sidebar-primary`. Switching company therefore updates buttons, focus states, selection states, shared surfaces, and navigation without component-specific branding reads.

Invalid or missing colors use a neutral slate fallback. Foreground text is selected by comparing black and white contrast against the accent.

Status colors remain semantic and must not be replaced by the company accent. Success, warning, danger, issue status, agent status, and live-run colors continue to communicate state consistently across companies.

## Shared surface language

The reusable classes in `ui/src/index.css` are the base product-surface vocabulary:

- `paperclip-surface`: card border, radius, background, and restrained elevation;
- `paperclip-surface-header`: low-intensity company tint for orientation;
- `paperclip-surface-interactive`: hover treatment for clickable surfaces;
- `paperclip-section-title`: consistent dense section label.

New dashboard panels should compose these classes before introducing one-off gray backgrounds, borders, radii, or shadows. Strong gradients, saturated card fills, and decorative motion are intentionally outside the system.

## Sidebar information architecture

The primary navigation follows these mental models:

- top actions: New Issue, Dashboard, Inbox;
- Work: Issues, Routines, Goals, Artifacts, and optional Workspaces;
- Projects and Agents: dynamic company resources;
- Organization: Org, Teams, Skills, Memory, Evidence & learning;
- Operations: Softwarehouse, Costs, Activity;
- Company settings: separated final destination.

Work, Organization, and Operations are collapsible and remember their state locally. Active items use both a tinted background and a left accent, so selection does not rely on color alone.

Plugin sidebar entries remain in the existing host-provided slot. Plugins may inherit host tokens and shared components, but they do not inject CSS to replace the core application shell.

## Org chart behavior

The initial org-chart view prioritizes readable cards over fitting every node into the viewport. Large organizations start at a minimum readable zoom and support panning. The existing fit control still provides a complete overview on demand.

Agent cards are keyboard-focusable buttons. Root nodes, connections, controls, and card rails use the company accent while status dots keep their semantic colors.

The toolbar provides agent, role, title, and capability search. Choosing a result centers the matching card at a readable zoom. The Agents list remains available as the compact, non-spatial alternative; import, export, project, pan, zoom, and fit flows remain intact.

## Dense work views

Issues, Inbox, Routines, Goals, Activity, Artifacts, Costs, and the local Softwarehouse cockpit share the same restrained surface anatomy. This is an evolutionary layer over existing behavior rather than a new set of page-specific themes.

- Leading bracket prefixes in issue titles render as compact category chips while the complete original title remains the accessible name.
- Issue, inbox, routine, entity, and activity rows share company-tinted hover and selection feedback.
- Activity is grouped by day and uses entity-type cues, making the audit trail scannable without changing event semantics.
- Goals expose total, achieved, and root-outcome context before the existing collapsible tree.
- Empty states explain the next useful action and may include domain examples; artifact loading uses a layout-matched grid skeleton.
- Operational metric tiles use the same surface, icon well, border, and type hierarchy as dashboard metrics.

## Detail and settings hierarchy

Project and agent detail headers are durable identity surfaces. Project status and target context remain visible across tabs. Agent dashboard health is summarized before charts with live runs, blocked work, recent success, and the existing semantic status.

Issue detail keeps its intentionally narrow reading width. Summary cards must not wrap interactive Markdown in another link; nested anchors are invalid HTML and break keyboard/hydration behavior.

Company Settings includes a live branding preview for navigation, active state, metrics, and primary action. The preview is local and does not persist until the existing Save changes action is used.

## Loading and empty-state contract

Skeletons should approximate the final page geometry instead of falling back to seven generic rows. A domain empty state should answer three questions where applicable: what is absent, why it matters, and what the user can do next. Empty states must never remove access to the primary creation flow.

## Upgrade strategy

There is no child-theme override layer. Upgrade safety comes from keeping the change within a few stable seams:

1. company data enters through `CompanyContext`;
2. one provider owns derived appearance variables;
3. shared CSS tokens and surface classes own visual rules;
4. navigation consumes semantic tokens instead of raw company colors;
5. focused tests verify color normalization, company switching, fallback behavior, sidebar grouping, and org interactions.

When merging upstream Paperclip updates, preserve these seams rather than copying complete upstream pages over the fork. A conflict in the provider, tokens, or tests should be resolved explicitly; silent loss of company branding is a regression.

## Accessibility guardrails

- Active navigation must use shape/background plus color.
- All focus rings use the company accent and remain visible in light and dark themes.
- Text placed directly on the company accent uses the computed contrast foreground.
- Reduced-motion preferences suppress nonessential animation and transitions.
- Status meaning must never depend on the company accent.
- Graph cards and controls remain reachable by keyboard and expose accessible labels.
