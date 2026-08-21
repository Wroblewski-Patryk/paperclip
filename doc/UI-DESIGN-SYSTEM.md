# Paperclip UI composition rules

This document defines the small set of visual primitives used by the Paperclip UI.
The goal is not to make every bordered object look identical. The goal is to make
structural surfaces and agent identity predictable, while keeping semantic states
and compact controls free to express their purpose.

## Structural surfaces

Use one of these shared classes or the matching UI primitive:

| Need | Use | Notes |
| --- | --- | --- |
| Page section, dashboard module, domain card | `Card` or `.paperclip-surface` | `Card` already includes `.paperclip-surface`; do not repeat raw border/background/shadow classes. |
| Tinted heading inside a surface | `.paperclip-surface-header` | Normally paired with a bottom border and section padding. |
| Clickable structural surface | `.paperclip-surface-interactive` | Add alongside `.paperclip-surface`. |
| Nested information panel | `.paperclip-inset` | For content nested inside a structural surface, not for form controls. |
| Empty collection or missing optional content | `.paperclip-empty-state` | Dashed boundary and low visual weight. |

Domain components ending in `Card` are content compositions, not independent
visual primitives. Their root should normally use `Card` or `.paperclip-surface`.

## Intentional exceptions

Do not force the structural surface styles onto:

- warning, danger, success, approval, and other semantic state panels;
- dialogs, popovers, menus, tooltips, and floating command surfaces;
- inputs, textareas, selectors, buttons, badges, avatars, and compact list rows;
- chat bubbles, transcript events, graph nodes, and media frames;
- decorative stacked artifact layers.

Those components may override border, background, radius, or shadow when the
override communicates state or interaction. The override should be local and
named by its semantic purpose, not introduced as another generic card style.

## Agent identity

`Identity` is the canonical component when an agent name and identity mark appear
together. Pass `agentIcon={agent.icon}` whenever an agent object is available.
Passing `null` deliberately renders the default agent glyph; omitting
`agentIcon` is reserved for a person, the board, the system, or an unknown
generic identity.

Use `AgentIcon` directly only when a compact icon is needed without the agent
name, such as the sidebar, icon picker, organization graph, or assignee selector.
Agent status is separate from identity: render it as a badge or a small overlaid
status dot instead of replacing the assigned icon.

## Owner decision composition

Owner-facing decision queues use a master-detail composition: a compact,
searchable list in the left structural surface and the selected decision in the
right surface. On narrow screens the list precedes the detail.

Do not expose an unprepared internal interaction as an actionable owner item.
The detail begins with a Polish, plain-language snapshot: what happened, why the
owner is being asked, what the owner must decide, and what happens next. It must
clearly distinguish a resolved historical record from a current request. The
expanded AIA briefing then presents recommendation, known facts versus missing
information, scope versus explicit exclusions, safety constraints, compared
options, post-decision actions, and rollback/recovery. The canonical interaction
or approval control follows the briefing so the answer remains auditable without
forcing the owner to discover context in raw issue history. Internal preparation
counts may be shown as one quiet status line; technical tasks and agent
assignments do not belong in the owner decision list.

## Live run waiting state

A queued run is not visually presented as active work. Use a quiet clock state,
the label `Queued`, and one concise `paperclip-inset` explanation derived from
the latest claim-time admission decision. Distinguish project scope conflict,
project/organization/issue capacity, budget, runtime restart, admission OFF,
and an ordinary scheduler wait. Keep raw reason codes available to diagnostics,
but show the human reason in the primary card.

## Change discipline

When changing the global Paperclip look:

1. Change the tokens or shared classes in `ui/src/index.css`.
2. Change the primitive in `ui/src/components/ui/` only when its structure changes.
3. Keep domain components focused on layout and content.
4. Add a local override only when it carries interaction or semantic meaning.
5. Check dashboard, agents, issues/inbox, and one settings/detail view in both
   desktop and narrow layouts.
