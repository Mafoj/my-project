/**
 * Mirror of backend/app/models.py.
 *
 * This is the ONLY shape the UI knows about. It says nothing about Excel or
 * Postgres, which is exactly the point: when the backend swaps its repository,
 * nothing in this file (or anything importing it) changes.
 *
 * Keep in sync with the Pydantic models. Longer term, generate this from
 * /api/openapi.json (see docs/ADR-001) so it cannot drift.
 */

export const MONTH_KEYS = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
] as const;
export type MonthKey = (typeof MONTH_KEYS)[number];

export interface Project {
  project_name: string;
  project_name_its: string;
  tower: string;
  pc_ownership: string;
  pm_name: string;
  int_ext: string;
  sales_force: string;
  bso_io: string;
  project_status: string;
  start_date: string | null; // ISO yyyy-mm-dd
  end_date: string | null;
  bu: string;
  comments: string;
  value_2026: number;
  value_weighted_2026: number;
  probability: number; // always 0-100, normalised server-side
}

export interface Allocation {
  tower: string;
  profit_ownership: string;
  pm_depart: string;
  pm_name: string;
  pm_name_secondary: string;
  project_name: string;
  externality: string;
  order_n: string;
  notes: string;
  project_status: string;
  in_project_list: string;
  value: number;
  probability: number;
  months: Record<MonthKey, number>;
}

export interface DatasetMeta {
  source: 'excel' | 'postgres';
  source_ref: string;
  generated_at: string;
  source_modified_at: string | null;
  project_count: number;
  allocation_count: number;
}

export interface PipelinePayload {
  meta: DatasetMeta;
  projects: Project[];
  allocations: Allocation[];
}

// ── Domain constants, ported from the original single-file app ───────────────
export const CLOSED_STATUSES = new Set(['Completed', 'Cancelled', 'Won', 'Lost']);
export const PIPELINE_STATUSES = ['Initiation', 'Starting'];

export const PROB_BUCKETS = [
  { label: 'Committed (≥75%)',  test: (p: number) => p >= 75,            color: '#10b981' },
  { label: 'Probable (50–74%)', test: (p: number) => p >= 50 && p < 75,  color: '#3b82f6' },
  { label: 'Possible (25–49%)', test: (p: number) => p >= 25 && p < 50,  color: '#f59e0b' },
  { label: 'Unlikely (<25%)',   test: (p: number) => p < 25,             color: '#ef4444' },
];
