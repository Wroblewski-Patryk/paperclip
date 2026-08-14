# Dashboard and sidebar final polish audit

Date: 2026-08-14

## Audit scope

Combined UX, visual, responsive, motion, and accessibility-oriented review of the LuckySparrow dashboard and its desktop sidebar. The audit used the live local Paperclip instance at desktop and narrow widths, in dark and light themes, with an active Live Run.

## User goal and accessibility target

The operator should understand company health, active execution, constraints, and the next legal action at a glance. Live execution must be consistent across the dashboard and sidebar, state must not rely on color alone, keyboard focus must remain visible, and narrow layouts must reflow without horizontal overflow.

## Captured steps

1. **Initial narrow dashboard — good, with polish opportunities.** The primary hierarchy was clear, but refresh timing was vague and the `Now` row detail competed with the action value. Evidence: [01-before-mobile.png](01-before-mobile.png) and [05-before-mobile-390.png](05-before-mobile-390.png).
2. **Initial desktop dashboard and sidebar — good.** The workflow strip, operational picture, and constraints were well grouped. The sidebar Live Run used a different blue treatment than the dashboard cyan, idle agents appeared green, and the main CTA did not match the actual next legal action. Evidence: [02-before-desktop.png](02-before-desktop.png) and [04-before-lower-dashboard.png](04-before-lower-dashboard.png).
3. **Final desktop dashboard — excellent.** Dashboard and sidebar share one Live Runs query and five-second fallback interval; Live Run treatments use the same semantic cyan; activity copy no longer ends with dangling prepositions; `Now` scans cleanly; the CTA names the actual next action; idle status uses amber. Evidence: [11-after-desktop-final.png](11-after-desktop-final.png).
4. **Final mobile dashboard — excellent.** The header exposes `Live ≤5s`, the live action is the concise `Open`, the key three workflow states remain visible, and the page has no horizontal overflow at a 390 px viewport. Evidence: [10-after-mobile-final.png](10-after-mobile-final.png).
5. **Light theme — excellent.** Surface hierarchy, semantic status colors, borders, and dense tables remain legible without introducing a separate visual language. Evidence: [08-after-light-theme.png](08-after-light-theme.png).
6. **Sidebar Live Run focus state — excellent.** The running agent has a non-color left-edge cue, semantic cyan badge and pulse, a full accessible label, and a visible keyboard focus ring. Evidence: [09-sidebar-live-focus.png](09-sidebar-live-focus.png).

## Confirmed strengths

- A single control-room hierarchy: company state, workflow, immediate action, operating events, agents, constraints, trend, and capacity.
- Live execution is backed by the same company Live Runs cache in the dashboard, dashboard navigation, and agent sidebar.
- Active execution uses text, count, marker, tint, edge treatment, and restrained motion rather than color alone.
- Motion is disabled by the existing `prefers-reduced-motion` rule.
- Links and filters expose focus styles and semantic state; chart days remain keyboard-addressable buttons.
- The tested narrow viewport has no horizontal overflow.

## Resolved UX and accessibility risks

- Removed the dashboard/sidebar refresh mismatch by introducing one shared query hook.
- Corrected idle agent semantics from green to amber and made the idle filter count exact.
- Removed incomplete activity phrases such as `commented on` when the referenced entity is unavailable.
- Replaced the generic CTA with the actual next legal action.
- Preserved sidebar focus visibility while adding a Live Run edge indicator that does not override the focus ring.
- Added an accessible Live Run label to the active agent row.

## Evidence limits

This is not a formal WCAG conformance claim. Screenshots and DOM inspection confirm visible hierarchy, labels, focus presentation, reduced-motion coverage in source, semantic regions, progress bars, chart controls, and tested responsive reflow. Screen-reader output, browser zoom beyond the tested layouts, and every possible live/empty/error data combination were not exhaustively tested.

## Verification

- Targeted UI tests: 30 passed across dashboard and sidebar suites.
- UI TypeScript build: passed.
- UI production build: passed.
- Existing non-blocking warnings remain for CSS Highlight pseudo-elements, the MarkdownEditor mixed import path, large chunks, and pre-existing React test `act(...)` notices.
