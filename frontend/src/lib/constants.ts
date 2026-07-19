/** Shared display constants, ported from the original single-file app. */

/**
 * App-wide status colors (badges, charts, Gantt bars, KPI chips), per the
 * desaturated palette in docs/design_handoff_pm_utilization_timeline 2/3.
 */
export const STATUS_COLORS: Record<string, string> = {
  Ongoing: '#7fb59d', Active: '#7fb59d', Won: '#7fb59d',
  Completed: '#8ba6c9',
  Initiation: '#d6ac7a', Starting: '#d6ac7a', Planning: '#d6ac7a', Pipeline: '#d6ac7a',
  'On Hold': '#a998c9',
  Cancelled: '#cf9a92', Lost: '#cf9a92',
};

/** Fallback color for any status not covered by STATUS_COLORS. */
export const STATUS_FALLBACK = '#b7bec7';

export const INTEXT_COLORS = ['#1d4ed8', '#f97316', '#8b5cf6', '#10b981', '#ef4444', '#06b6d4'];

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * PM utilization heat-strip weight per status, per docs/design_handoff_pm_utilization_timeline 2.
 * Drives the heat-strip only -- bar color still uses STATUS_COLORS.
 */
export const UTILIZATION_WEIGHT: Record<string, number> = {
  Ongoing: 1.0, Active: 1.0, Completed: 0.3, Initiation: 0.6, Starting: 0.6,
  'On Hold': 0.6, Cancelled: 0.1, Unknown: 0.4,
};

/** Utilization heat palette (mauve, light -> dark), per the user's selected palette in the handoff. */
export const UTIL_PALETTE: [string, string] = ['#e8dfe4', '#6b4458'];
