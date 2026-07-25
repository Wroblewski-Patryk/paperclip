# Frontend style audit

Date: 2026-07-25
Application: `http://127.0.0.1:3200/LUC/dashboard`

## Design contract

The production UI now follows one visual contract:

1. Structural surfaces use a near-black background, a visible neutral border, a very subtle shadow, and sharp corners.
2. Surface headers may use the company-accent wash to establish hierarchy without becoming independent colored cards.
3. The company accent identifies active navigation, primary actions, selected tabs, interactive hover states, and neutral operational icons.
4. Success, warning, danger, project identity, and lifecycle state keep their semantic colors. They are not recolored as decoration.
5. Rounded geometry is reserved for compact semantic objects: avatars, badges, status pills, inputs, checkboxes, menus, and conversation bubbles.
6. Popovers remain visually elevated from the workspace. They do not inherit the flat structural-card treatment.

## Shared implementation

- `--card` no longer introduces a gray layer over the dark workspace.
- `.paperclip-surface` is the canonical structural surface.
- `.paperclip-surface-header` provides the restrained company-accent ornament.
- `.paperclip-surface-interactive` provides a consistent accent hover state.
- `.paperclip-inset` provides one shared treatment for nested information panels.
- `.paperclip-empty-state` provides one shared treatment for empty collections.
- Base cards and tabs inherit the same background, border, radius, and company-accent rules.
- `Identity` and `AgentIcon` are the canonical agent-identity path; assigned icons
  no longer compete with initials, fixed bot glyphs, or status-only dots.

## Audited routes

| Route | Scope | Health |
| --- | --- | --- |
| `/LUC/dashboard` | innovation command center, owner queue, agent work, orientation | Passed |
| `/LUC/issues` | list density, filters, status hierarchy | Passed |
| `/LUC/projects/11-innovation-soar/issues` | project identity, issue tree, tabs | Passed |
| `/LUC/agents/00-aia-ai-assistant/dashboard` | agent identity, actions, health and charts | Passed |
| `/LUC/softwarehouse` | operational catalog and control surfaces | Passed |
| `/LUC/costs` | metrics, budget state, provider quota | Passed |
| `/LUC/goals` | metrics, hierarchy and creation action | Passed |
| `/LUC/routines` | routine state, run actions and tables | Passed |
| `/LUC/artifacts` | browse controls and interactive artifact cards | Passed |
| `/LUC/company/settings` | settings navigation, forms and live brand preview | Passed |

## Evidence

- Broad after-state: `report/front-style-after-contact-sheet.png`
- Detail views: `report/front-style-detail-contact-sheet.png`
- Final production sample: `report/front-style-final-contact-sheet.png`
- Final dashboard: `report/front-style-final-dashboard-1440x900.png`
- Stable goals view: `report/front-style-after-goals-stable-1440x900.png`
- Stable routines view: `report/front-style-after-routines-stable-1440x900.png`

## Intentional exceptions

- UX Lab routes retain their experimental visual language and are not production-system references.
- Chat bubbles stay rounded to preserve message grouping.
- Avatar frames, badges, form controls, tooltips, and popovers keep compact radii.
- Project and status colors remain semantic even when they differ from the company accent.

## 2026-07-25 polishing pass

### Scope and evidence

- Twelve production routes: `report/polish-audit-01-contact-sheet.png`
- Dashboard responsive states: `report/polish-audit-responsive-contact.png`
- Issue-detail workflow: `report/polish-audit-01-13-issue-detail.png`
- New-issue dialog: `report/polish-audit-01-14-new-issue-dialog.png`
- Compared shared card, tab, radius, status, and surface rules with the locally available `upstream/master` Paperclip source.

### Findings and changes

1. The core Paperclip identity remains intact: compact typography, sharp structural cards, dense issue rows, semantic status colors, dark workspace, and icon-library assets.
2. Softwarehouse extensions now use the same structural geometry and interaction language as the original application.
3. Dashboard layouts were verified at `1440 x 900`, `1280 x 720`, and `1024 x 768`. No page-level horizontal overflow was found.
4. The Issues hierarchy exposed unnamed expand/collapse icon buttons. They now announce the action and issue identifier.
5. Company Settings exposed unnamed help buttons and form controls. Help actions, toggles, and appearance inputs now have explicit accessible names.
6. Browser verification after the fixes found zero visible unnamed buttons and zero visible unnamed form controls on Issues and Company Settings.

### Rating

`5/6` for the current local V0 production UI.

The remaining point is intentionally reserved for broader keyboard-only testing, measured contrast verification, mobile-device testing, and future consistency checks after upstream Paperclip merges. Screenshot inspection alone cannot prove full accessibility compliance.

## 2026-07-25 identity and composition pass

- The base `Card` primitive now delegates its structural appearance to
  `.paperclip-surface`, so a global style change updates domain cards uniformly.
- Repeated structural panels in instance settings, workspaces, organizational
  memory/learning, join requests, profile settings, outputs, and routine/workspace
  cards now use the shared surface vocabulary.
- Assigned agent icons are carried through live-run API responses and rendered by
  the shared identity component across dashboards, agent lists, issues, inbox,
  comments, approvals, search, skills, and cost attribution.
- Status remains a separate semantic signal (badge or overlaid dot); it no longer
  replaces the agent's assigned identity icon.
- The durable implementation rules live in `doc/UI-DESIGN-SYSTEM.md`.
