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

## Change discipline

When changing the global Paperclip look:

1. Change the tokens or shared classes in `ui/src/index.css`.
2. Change the primitive in `ui/src/components/ui/` only when its structure changes.
3. Keep domain components focused on layout and content.
4. Add a local override only when it carries interaction or semantic meaning.
5. Check dashboard, agents, issues/inbox, and one settings/detail view in both
   desktop and narrow layouts.
