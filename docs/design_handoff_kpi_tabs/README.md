# Handoff: KPI Tabs Redesign (Option 1c — Donut Summary + Stacked-Bar Timeline)

## Prompt to paste into Claude Code

```
Implement a redesigned KPI summary bar for [PROJECT SCREEN NAME], replacing the
existing flat KPI cell strip. Use the existing codebase's component library,
styling approach (CSS-in-JS / Tailwind / SCSS — match whatever is already used),
and design tokens (colors, spacing, type scale) wherever they exist instead of
the raw hex/px values below — treat the values here as the fallback spec, not
literal requirements, if the codebase already has equivalent tokens.

Reference file: kpi-tab-1c-reference.html (static HTML/CSS mockup, not
production code — recreate the layout and visuals in our component system).

## Layout
Two horizontal rows in one card-like container, white background, 14px border
radius, 1px border rgba(0,0,0,.06), box-shadow 0 1px 3px rgba(0,0,0,.05),
padding 22px 26px. Rows are separated by a 1px divider (rgba(0,0,0,.07)) with
20px vertical margin.

### Row 1 — "Quality Check"
Flex row, 32px gap, vertically centered, split into three zones:
1. **Donut summary** (left, fixed width, 26px right padding, 1px right border
   rgba(0,0,0,.08)):
   - 88×88px donut ring built as a conic-gradient circle (or an SVG ring chart
     in a real component library — prefer a real charting lib like Recharts/
     visx/Chart.js if the codebase has one, otherwise CSS conic-gradient is
     fine): segments sized by each flagged metric's share of the "flagged"
     total (74 = overdue + missing funding + on hold + missing probability +
     missing BU), remainder in neutral gray #e7e2df.
   - Center cutout: white circle, 12px inset, showing total project count
     (e.g. "155", bold 22px) and label "PROJECTS" (7.5px, letter-spacing .03em,
     color #9aa1ac).
   - To the right of the donut: label "QUALITY CHECK" (10.5px, bold,
     letter-spacing .08em, color #9aa1ac) above a small legend: colored dot +
     bold number + label for the two largest flags (Overdue, Missing Funding).
2. **Other flags** (flex:1): label "OTHER FLAGS" above a row of stat groups
   (On Hold, Missing Probability, Missing BU, Missing Order #), each a bold
   number (20px) over a small uppercase label (9px, color #9aa1ac).

### Row 2 — "Timing"
Label "TIMING — N TRACKED PROJECTS" (10.5px bold, letter-spacing .08em, gray).
Below it: a single horizontal stacked bar, 14px tall, 7px border radius,
background #f0f0f1, divided into colored segments whose widths are each
timing bucket's percentage of the tracked total. Below the bar: one column
per bucket (same widths as the bar segments) showing a bold number (16px) and
an uppercase label (8.5px, gray), colored to match its bar segment.

## Colors
- Text (primary): #111827
- Text (muted/labels): #9aa1ac
- Overdue / critical red: #c0392b
- Missing funding / amber: #e88a3a
- Warning tones (on hold, missing probability, missing BU): #c9832e, #d9a866
- Started-last-60-days green: #2f7a52
- 2-years-ago slate: #5b6472
- Neutral gray (3+ years, missing order #, donut remainder): #9aa1ac / #e7e2df
- Card background: #fff; page/section background: #eef0f3

## Typography
System font stack (-apple-system, "Segoe UI", system-ui). Big numbers use
font-weight 800 with `font-variant-numeric: tabular-nums`. All small labels
are uppercase with letter-spacing .03em–.08em, weight 600–700, color #9aa1ac.

## Data model
Each metric is `{ label, value }`. Group into:
- `qualityCheck: { totalProjects, flags: [{label, value, color}] }` — donut +
  legend computed from `flags` as a share of their own sum.
- `timing: { trackedTotal, buckets: [{label, value, color}] }` — stacked bar
  computed from `buckets` as a share of `trackedTotal`.

Make both rows data-driven (map over arrays), not hardcoded per metric, so
new KPIs/buckets can be added without layout changes.

## Behavior
Static display only in the mockup — no interactions specified. Add hover
tooltips on donut/bar segments and stat groups if the codebase's existing KPI
components already support them; otherwise ship without.

Recreate this pixel-faithfully for spacing/type/color, but swap in the
codebase's real components, tokens, and (ideally) a proper charting library
for the donut and stacked bar instead of hand-rolled CSS gradients.
```

## Files
- `kpi-tab-1c-reference.html` — static HTML/CSS reference mockup of option 1c, open directly in a browser.

## Fidelity
High-fidelity: exact colors, spacing, and type sizes are given above; treat them as the target unless the codebase's design tokens already define equivalents.
