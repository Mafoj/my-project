# Handoff: PM Utilization Timeline (Option 1a)

## Overview
Redesign of a project-manager timeline/Gantt view. Each PM row shows their name, project count, and a NEW monthly utilization heat-strip (Jan–Dec) indicating how busy they are, without needing to expand. Clicking the row expands/collapses that PM's individual project Gantt bars — replacing the previous always-expanded layout.

## About the Design Files
The bundled file (`PM Utilization Timeline.dc.html`) is a **design reference built in HTML** — a working prototype of the intended look and interaction, not production code to copy directly. Recreate this in the target codebase's existing framework (React, Vue, etc.) using its established components, data-fetching, and styling conventions. If no frontend framework exists yet, pick whichever is best suited to the existing backend/stack.

## Fidelity
**High-fidelity.** Colors, spacing, typography, and interaction behavior below should be treated as final; recreate pixel-accurately unless it conflicts with the existing design system, in which case prefer the design system's tokens for color/type but keep the layout and interaction model.

Note: the prototype contains 3 side-by-side layout variants (labeled 1a/1b/1c) built to compare options with the requester. **Only variant 1a (the "sparkline strip" layout) was approved** — ignore 1b and 1c; they're left in the file only as design-exploration history.

## Screen: Timeline — Option 1a

### Purpose
Let a viewer scan all PMs' names, project counts, and relative workload at a glance, then drill into any PM's individual project schedule on demand.

### Layout
- Card container: fixed width in the prototype (860px), white background, 1px `#e5e7eb` border, 10px border-radius, 20px/24px padding, subtle shadow (`0 1px 2px rgba(0,0,0,0.04)`).
- Header row: label "TIMELINE — 2026", 12px, uppercase, letter-spacing 0.06em, `#6b7280` (or accent color if "colorful headers" mode is on — see Tweaks).
- Month header row: two-column CSS grid — fixed 220px label column + a `repeat(12, minmax(0,1fr))` grid for Jan–Dec column headers (8px gap column-to-column via 2px grid gap). Current month (July, at build time) is bold; others are regular weight. **Important:** grid children need `min-width:0` to prevent the 12-column month grid from overflowing its container — this bit us during implementation.
- One row per PM, top-bordered (`1px solid #f1f2f4`), 10px vertical padding:
  - Left: chevron (▸, rotates 90° to point down when expanded, `transition: transform .15s`), PM name (14px, 600 weight, `#111827`), project count in parens (13px, `#9ca3af`).
  - Right: the **utilization strip** — a 12-cell CSS grid (1px gaps), 12px tall, rounded 3px, one cell per month, each colored along a light→dark scale (see Design Tokens) proportional to that month's weighted project load.
  - Entire row is clickable (`cursor:pointer`) and toggles that PM's expanded state.
- When expanded, each project appears as a sub-row indented 20px:
  - Project name (12px, `#374151`, truncated with ellipsis if it overflows the 220px label column).
  - A single Gantt bar (14px tall, 4px border-radius) placed via `grid-column: {startMonth+1} / {endMonth+2}` on the same 12-column grid, colored by project status (see Design Tokens).
  - Projects outside the year (no start/end month) show a "outside 2026" label (11px, `#c7cad1`) instead of a bar.
- Footer legend: 5 swatches (16×8px) sampling the utilization scale at t = 0, 0.25, 0.5, 0.75, 1, with caption "low → high, weighted by project status & month".

### Components / Content
- Chevron glyph: unicode "▸" (no icon asset needed); rotate via CSS transform, not a swapped glyph.
- All copy (PM names, project names, month labels) is real content from the source infographic — see Assets/data below.

## Interactions & Behavior
- **Click a PM row** → toggles `expanded` state for that PM only (independent per PM; multiple can be open at once). No animation on the expand/collapse itself in the prototype (instant); consider adding a height transition in production.
- No hover states were specced beyond the pointer cursor — add a subtle row hover background if it fits the target design system.
- No loading/error states — this is a static-data prototype; wire up to real PM/project data.

## State Management
- Per-PM boolean `expanded` (default `false`, i.e. **collapsed by default** — matches the requirement that the default view shows only name + count + utilization strip).
- Utilization is **derived**, not stored: for each PM, for each month, sum a status weight across all their projects active that month, then normalize by the single highest month-value across *all* PMs in view (a shared color scale, not per-PM).

## Design Tokens

### Status colors (Gantt bars — unchanged from source design)
- Ongoing: `#22c55e` (green)
- Completed: `#3b82f6` (blue)
- Initiation: `#f59e0b` (amber)
- On Hold: `#eab308` (yellow)
- Cancelled: `#ef4444` (red)
- Unknown: `#94a3b8` (gray)

### Utilization weight per status (drives the heat-strip only, not bar color)
- Ongoing: **1.0**
- Completed: **0.3**
- Initiation: **0.6**
- On Hold: **0.6**
- Cancelled: **0.1**
- Unknown: **0.4**
- Projects outside the year: excluded from load entirely (0).

`monthLoad[m] = Σ weight(status) for every project active in month m` (a project is "active" in month m if `start <= m <= end`).
`t = monthLoad[m] / globalMaxMonthLoad` (0–1), where `globalMaxMonthLoad` is the single largest `monthLoad` value across every PM and month currently shown.

### Utilization color scale (light → dark, linear RGB interpolation on t)
- Default (as shipped): violet/purple, light `#ede9fe` → dark `#5b21b6`.
- Alternative palettes exercised during design: teal (`#e0f2fe → #075985`), amber (`#fef3c7 → #b45309`), magenta (`#fce7f3 → #9d174d`), neutral navy (`#eef2f7 → #1e293b`).
- Formula: `rgb = lightRGB + (darkRGB - lightRGB) * t` per channel, rounded.
- This same palette also drives (optionally) the card background tint, the "1a"-style corner badge, and the section title color — see "colorfulHeaders" below. **For the approved 1a card specifically, the card background was pinned to plain white regardless of that toggle** — only the utilization strip itself uses the palette.

### Typography
- Font stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`.
- Sizes used: 11px (month labels, legend), 12px (project names), 13px (project counts), 14px (PM names).

### Spacing / structure
- Label column: fixed 220px.
- Grid gaps: 8px between label column and month grid; 2px between month columns in header/bars; 1px between utilization-strip cells.
- Row divider: `1px solid #f1f2f4`.

## Tweak Controls (from the prototype's Tweaks panel — reproduce as user-facing or config-level settings if useful)
- **Utilization color** (`heatPalette`): swatch picker with the 5 two-color palettes listed above; drives the heat-strip and (if enabled) card accents.
- **Colorful headers** (`colorfulHeaders`): boolean. When on, card background/badge/title pick up a light tint of the palette's accent color instead of white/gray/near-black. (Not applied to card 1a per the final approved state — that card was fixed to a white background.)

## Assets
No image/icon assets — everything is CSS shapes, color fills, and system-font text. No external fonts loaded.

## Files
- `PM Utilization Timeline.dc.html` — the full prototype (all 3 variants 1a/1b/1c side-by-side; only 1a is approved for build).
