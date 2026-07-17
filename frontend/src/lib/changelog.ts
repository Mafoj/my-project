export const APP_VERSION = '0.1';

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

/** Newest first. Add one entry per round of work, before committing. */
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.1',
    date: '2026-07-17',
    changes: [
      'Project List tab: full column set (Status, Tower, PC Owner, Int/Ext, Start/End, BU, Value 2026 with an inline probability/weighted breakdown when they differ), sortable columns, click-through to a project detail drawer.',
      'Analysis tab: pipeline funnel by probability bucket, Internal vs External breakdown.',
      'Project Quality tab: "Portfolio & Quality Check" donut summary + stacked timing bar (overdue, missing funding/probability/BU/order #, on-hold heatmap, aging buckets), with click-to-scroll to each detail table.',
      'Timeline tab rebuilt as a PM Utilization Timeline: collapsible per-PM rows with a Jan-Dec workload heat-strip (deduplicated by ITS1 initiative, weighted by status), hover tooltips showing per-status project counts, expand/collapse all, year navigation across every year present in the data, and a "today" indicator line.',
      'Allocation tab: monthly PM allocation grid, heatmap, and project list.',
      'Shared filter bar (multi-select fields, per-tab or synced) and a KPI header — Filtered Projects, Pipeline/Weighted Value, By Status, By Tower — that recomputes from whichever tab is active and whose chips double as click-to-filter controls; KPIs can be hidden via a toggle switch.',
      'Fixed a backend Excel-parsing bug: the allocation sheet has a banner row before its real headers, which was silently zeroing out every allocation record.',
      'Fixed a persisted-state bug where primitive values (selected year, toggle flags) written to localStorage could collapse to an empty object on reload, freezing the Timeline tab on "NaN".',
      'Added scripts/start_c.sh and scripts/stop_c.sh to launch and stop the backend + frontend dev servers.',
      'Retired the original single-file PMO_PM_PipelineF.html prototype.',
    ],
  },
];
