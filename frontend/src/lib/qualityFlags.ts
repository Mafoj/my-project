import { CLOSED_STATUSES, type Project } from './types';

const DAY_MS = 86400000;

export interface QualityFlag {
  key: string;
  label: string;
}

/**
 * Data-quality issues also surfaced on the Project Quality tab, factored out
 * here so other tabs (e.g. Timeline) can flag the same projects without
 * duplicating the checks. On Hold is deliberately excluded -- it's already
 * visually distinct elsewhere (status badge / bar color).
 */
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
