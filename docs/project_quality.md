# Project Quality Tab

Source: [`frontend/src/tabs/ProjectQuality.tsx`](../frontend/src/tabs/ProjectQuality.tsx), rule logic shared via [`frontend/src/lib/qualityFlags.ts`](../frontend/src/lib/qualityFlags.ts).

The Project Quality tab runs a fixed set of data-hygiene checks against every project currently in the (filtered) dataset, then visualizes the results as a donut summary, a stacked timing bar, an on-hold heatmap, and a set of detail tables. All checks operate on `today` = the date the dashboard is loaded (client clock), and on whatever subset of projects the shared filter bar has selected (`filtered`).

There is **no overall numeric "quality score" or percentage** computed anywhere in this tab — it surfaces raw counts and shares of the flagged projects, not a blended health metric.

## 1. The checks

Five of the checks are computed by a single shared function, `getProjectFlags(project, today)`, so a project can be flagged by more than one rule at once (the rules are independent, not mutually exclusive):

```ts
export function getProjectFlags(p: Project, today: Date): QualityFlag[] {
  const flags: QualityFlag[] = [];
  if (p.end_date && !CLOSED_STATUSES.has(p.project_status)) {
    const daysOverdue = Math.round((today.getTime() - new Date(p.end_date).getTime()) / DAY_MS);
    if (daysOverdue > 0) flags.push({ key: 'overdue', label: 'Overdue' });
  }
  if (!p.value_2026 && !p.value_weighted_2026) flags.push({ key: 'missingFunding', label: 'Missing Funding' });
  if (!p.probability) flags.push({ key: 'missingProbability', label: 'Missing Probability' });
  if (!p.bu.trim()) flags.push({ key: 'missingBU', label: 'Missing BU' });
  if (!p.bso_io.trim() && !p.sales_force.trim()) flags.push({ key: 'missingOrder', label: 'Missing Order #' });
  return flags;
}
```

`CLOSED_STATUSES = { 'Completed', 'Cancelled', 'Won', 'Lost' }`.

### Overdue
- **Condition:** `end_date` is set, `project_status` is **not** Completed/Cancelled/Won/Lost, and `today − end_date > 0` days (rounded).
- **Fields:** `end_date`, `project_status`.
- A project already closed is never flagged overdue even if its end date is in the past.

### Missing Funding
- **Condition:** both `value_2026` and `value_weighted_2026` are falsy (zero/blank).
- **Fields:** `value_2026`, `value_weighted_2026`.

### Missing Probability
- **Condition:** `probability` is falsy (0 or blank).
- **Field:** `probability` (0–100 scale).
- Impact noted in the UI: projects with no probability are excluded from the Pipeline-by-Probability chart, and the Weighted Value rollup may be inaccurate for them.

### Missing BU
- **Condition:** `bu` is empty/whitespace after trimming.
- **Field:** `bu`.
- Impact noted in the UI: excluded from every "by BU" chart and rollup on the dashboard.

### Missing Order #
- **Condition:** both `bso_io` and `sales_force` are empty/whitespace.
- **Fields:** `bso_io` (BSO/IO number), `sales_force` (SalesForce number).

### On Hold
- Deliberately **not** part of `getProjectFlags` — it's already visually distinct elsewhere (status badge / bar color) — but is still surfaced as its own section in this tab.
- **Condition:** `project_status === 'On Hold'` (exact match).
- **Field:** `project_status`.

## 2. Timing buckets (stacked bar)

These are computed independently of the flags above and feed the "Timing" stacked bar and its five clickable detail sections.

| Bucket | Condition | Field(s) |
|---|---|---|
| Ending ≤ 60d | `end_date` set and `0 ≤ (end_date − today in days) ≤ 60` | `end_date` |
| Started ≤ 60d | `start_date` set and `(today − 60 days) ≤ start_date ≤ today` | `start_date` |
| 1 year ago | year of `start_date` == current year − 1 | `start_date` |
| 2 years ago | year of `start_date` == current year − 2 | `start_date` |
| 3+ years ago | year of `start_date` is valid and ≤ current year − 3 (open-ended) | `start_date` |

Notes:
- "Year of `start_date`" is a plain string-slice of the ISO date (`YYYY`), i.e. a calendar-year comparison, not a day-precise age — a project started Jan 1 and one started Dec 31 of the same year both land in the same bucket.
- Projects with no `start_date`, or one dated in the current calendar year, fall into none of the three "ago" buckets.
- "Ending ≤ 60d" does **not** exclude projects already flagged Overdue or already closed — it's a pure date-window check.
- The five buckets are computed independently and simply summed for the bar's total ("Tracked Projects"); there is no dedup — in principle a project could satisfy more than one bucket.
- Each bar segment's width = `bucket count / sum of all bucket counts × 100%`.

## 3. Portfolio & Quality Check donut

The donut is fed 5 of the flag counts, each with a fixed color:

| Flag | Color |
|---|---|
| Overdue | `#c0392b` |
| Missing Funding | `#e88a3a` |
| On Hold | `#c9832e` |
| Missing Probability | `#c9832e` |
| Missing BU | `#d9a866` |

- It's rendered as a CSS `conic-gradient`: each flag's arc length = `flag count ÷ total filtered projects`, arcs are stacked in the order above, and a final neutral-gray (`#e7e2df`) arc fills the remainder up to 100%.
- **Important caveat:** because the 5 flags are not mutually exclusive (a project can be both Overdue and Missing BU), the arcs are a naive stacked sum of counts-as-fractions, **not** a partition of "healthy vs. flagged" projects. The gray remainder segment means "not accounted for by summing these 5 counts," not "known-healthy projects." Treat the donut as directional, not as an exact healthy/unhealthy split.
- The tab also calls out the **top 2 flags by count** as a legend next to the donut.
- Center of the donut shows the total filtered project count.

### Other Flags row
A separate strip of plain stat tiles (not part of the donut math): On Hold, Missing Probability, Missing BU, Missing Order #. Each is clickable and scrolls to its detail table.

## 4. On-hold heatmap ("On Hold — Start Year × BU")

- Base set: all filtered projects with `project_status === 'On Hold'`.
- Rows = distinct start years present among on-hold projects (blank start dates grouped as `(blank)`).
- Columns = distinct BU values present among on-hold projects (blank BU grouped as `(blank)`).
- Cell value = count of on-hold projects matching that (year, BU) pair.
- Cell shading = amber (`rgba(245,158,11, α)`) where `α = min(0.15 + (cell / max cell in the whole matrix) × 0.75, 0.9)`; empty cells (count 0) are unshaded.
- Each row also shows a "Total" column summing across all BUs for that year.
- Below the heatmap, a full "On Hold Detail" table lists every on-hold project (Status, Project Name, PM Name, Int/Ext, BU, Start Date, End Date, Value 2026, Comments).

## 5. Detail tables

Each check/bucket above has a corresponding scrollable detail table listing the matching projects, with click-to-scroll wired from the donut, the "Other Flags" tiles, and the timing bar segments/columns. Overdue and aging-bucket tables additionally show computed fields such as "days overdue" (`today − end_date`, in days).

## 6. Data fields referenced

| Field | Used by |
|---|---|
| `project_status` | Overdue (via closed-status exclusion), On Hold |
| `end_date` | Overdue, Ending ≤ 60d |
| `start_date` | Started ≤ 60d, aging buckets (1/2/3+ years ago), on-hold heatmap rows |
| `value_2026`, `value_weighted_2026` | Missing Funding |
| `probability` | Missing Probability |
| `bu` | Missing BU, on-hold heatmap columns |
| `bso_io`, `sales_force` | Missing Order # |
| `project_name`, `pm_name`, `tower`, `int_ext`, `comments` | Display-only columns in detail tables |

`CLOSED_STATUSES = { Completed, Cancelled, Won, Lost }` — the only status set treated as "closed" for the Overdue check.
