---
name: pinhere-workspace-design
description: Design, implement, or review Pinhere's authenticated workspace UI, including issue queues, issue details, agent and automation setup, project settings, navigation, and workspace dialogs. Do not use for the public homepage or other brand, marketing, support, legal, or authentication pages.
---

# Pinhere workspace interaction and visual design

Apply this skill only to the authenticated product workspace. Optimize for frequent use, fast scanning, compact information density, and predictable interaction.

## Scope boundary

- In scope: workspace navigation, issue board and rows, issue detail, agent setup, automation settings, project settings, workspace forms, menus, dialogs, drawers, empty states, and feedback states.
- Out of scope: the public homepage, marketing and campaign pages, support and legal pages, sign-in flows, and other brand-display surfaces. Treat those as a separate brand design mode with its own brief and iteration.
- If a component is shared by workspace and public pages, do not change its global appearance to satisfy this skill. Add a workspace variant, a scoped token, or a workspace-owned wrapper instead.

## Design character

The workspace should feel precise, calm, and operational. Prefer clear hierarchy and useful density over decorative containers, oversized spacing, or repeated visual emphasis.

- Keep primary actions easy to find, but avoid making every action large or prominent.
- Reduce redundant wrappers, headings, labels, and padding before shrinking readable text.
- Let alignment, spacing, typography, and subtle borders establish hierarchy. Do not rely on rounded boxes for every grouping.
- Keep repeated rows compact and consistently aligned so titles, status, metadata, and actions can be scanned vertically.

## Corner-radius hierarchy

Use radius to communicate component hierarchy, not as a universal decoration.

- `4px`: very small utility surfaces when a visible corner is still needed.
- `6px`: default buttons, inputs, selects, tabs, menu items, compact list items, and nested controls.
- `8px`: cards, panels, grouped filters, and ordinary workspace surfaces.
- `12px`: dialogs, drawers, large overlays, or a deliberately prominent top-level surface. Treat this as the workspace maximum by default.
- Fully rounded: reserve for semantic pills, status badges, counters, avatars, circular icon targets, progress dots, and toggles whose shape carries meaning.

Do not use `rounded-2xl`, `rounded-3xl`, or arbitrary radii above `12px` as routine workspace styling. A nested surface should not look rounder or visually heavier than its parent without a clear interaction reason.

## Status expression

Do not use a colored vertical rail, inset edge strip, or a border-backed color bar to mark an issue row's state.

- Express state with a concise label, icon, dot, or text treatment located near the relevant content.
- Use color as reinforcement, never as the only state signal.
- Avoid repeating the same state through a rail, tinted background, badge, and text simultaneously.
- Reserve full-row tinting for selection, direct manipulation, or actionable warning/error feedback—not ordinary lifecycle status.

## Spacing and density

Build rhythm from a compact `4 / 8 / 12 / 16 / 24 / 32px` spacing scale.

- Use the smaller values inside controls and repeated rows.
- Use `16–24px` for ordinary panel structure.
- Use `32px` sparingly for major workspace section boundaries.
- Avoid marketing-style whitespace, oversized hero headings, and isolated content islands inside the workspace.
- Preserve readable touch targets and responsive reflow; density must not create cramped or overlapping controls.

## Implementation workflow

1. Confirm the affected route is in the authenticated workspace. If it is a brand or public page, stop applying this skill and use a separate design direction.
2. Check whether edited primitives are shared outside the workspace. Scope changes before modifying shared components or global CSS.
3. Reuse the established radius and spacing hierarchy. Introduce a new token only when an existing level cannot express a real component role.
4. Remove competing status treatments and redundant containers as part of the same change.
5. Scan the affected workspace for regressions, especially oversized radii, fully rounded default controls, colored edge rails, excessive padding, and nested-card accumulation.
6. Run type checks, relevant tests, and the production build. Validate the real flow in a browser at desktop and mobile widths, including dialogs, menus, empty/loading/error states, and horizontal overflow.

When reviewing a proposal, judge it by faster scanning, clearer action priority, stable responsive behavior, and consistent hierarchy—not by whether every surface uses identical styling.
