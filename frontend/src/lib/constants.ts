/** Shared display constants, ported from the original single-file app. */

export const STATUS_COLORS: Record<string, string> = {
  Active: '#22c55e', Ongoing: '#22c55e', 'On Hold': '#f59e0b', Completed: '#3b82f6',
  Cancelled: '#ef4444', Planning: '#8b5cf6', Pipeline: '#06b6d4', Initiation: '#f97316',
  Starting: '#f97316', Won: '#10b981', Lost: '#f43f5e',
};

export const INTEXT_COLORS = ['#1d4ed8', '#f97316', '#8b5cf6', '#10b981', '#ef4444', '#06b6d4'];

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * PM utilization heat-strip weight per status, per docs/design_handoff_pm_utilization_timeline.
 * Drives the heat-strip only -- bar color still uses STATUS_COLORS.
 */
export const UTILIZATION_WEIGHT: Record<string, number> = {
  Ongoing: 1.0, Active: 1.0, Completed: 0.3, Initiation: 0.6, Starting: 0.6,
  'On Hold': 0.6, Cancelled: 0.1, Unknown: 0.4,
};

/** Default utilization heat palette (violet, light -> dark). */
export const UTIL_PALETTE: [string, string] = ['#ede9fe', '#5b21b6'];
