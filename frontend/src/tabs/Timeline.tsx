/**
 * PM Utilization Timeline — option 1a from
 * docs/design_handoff_pm_utilization_timeline. Each PM row is collapsed by
 * default, showing name + project count + a Jan-Dec utilization heat-strip;
 * clicking a row expands it into per-project Gantt bars (month granularity).
 */
import { useMemo, useState } from 'react';
import { FilterBar } from '../components/FilterBar';
import { STATUS_COLORS, STATUS_FALLBACK, MONTHS, UTILIZATION_WEIGHT, UTIL_PALETTE } from '../lib/constants';
import { lerpColor } from '../lib/color';
import { applyMainFilters, usePersistedState, type MainFilters } from '../lib/filters';
import { getProjectFlags } from '../lib/qualityFlags';
import { fmtEur } from '../lib/format';
import type { Project } from '../lib/types';

interface Props {
  projects: Project[];
  filters: MainFilters;
  setFilters: (upd: MainFilters | ((prev: MainFilters) => MainFilters)) => void;
  filtersSync: boolean;
  toggleFiltersSync: () => void;
  hideFilters: boolean;
  onProjectClick: (p: Project) => void;
}

function usePMGroups(data: Project[]) {
  return useMemo(() => {
    const m: Record<string, Project[]> = {};
    data.forEach((p) => {
      const pm = p.pm_name.trim();
      if (!pm) return;
      (m[pm] ??= []).push(p);
    });
    return Object.entries(m)
      .map(([pm, rows]) => ({
        pm,
        rows: [...rows].sort((a, b) => (a.start_date || '9999').localeCompare(b.start_date || '9999')),
      }))
      .sort((a, b) => a.pm.localeCompare(b.pm));
  }, [data]);
}

/** A project's [startMonth, endMonth] (0-11) clipped to `year`, or null if it never touches that year. */
function monthSpanInYear(p: Project, year: number): [number, number] | null {
  const s = p.start_date ? new Date(`${p.start_date}T00:00:00Z`) : null;
  const e = p.end_date ? new Date(`${p.end_date}T00:00:00Z`) : null;
  if (!s && !e) return null;
  const sYear = s ? s.getUTCFullYear() : year;
  const eYear = e ? e.getUTCFullYear() : year;
  if (eYear < year || sYear > year) return null;
  const startM = !s || sYear < year ? 0 : s.getUTCMonth();
  const endM = !e || eYear > year ? 11 : e.getUTCMonth();
  return [startM, endM];
}

export function Timeline({ projects, filters, setFilters, filtersSync, toggleFiltersSync, hideFilters, onProjectClick }: Props) {
  const filtered = applyMainFilters(projects, filters);
  const pmGroups = usePMGroups(filtered);
  const thisYear = useMemo(() => new Date().getFullYear(), []);
  const currentMonth = useMemo(() => new Date().getMonth(), []);
  const today = useMemo(() => new Date(), []);

  // Years that actually have project data (start or end date), across the
  // whole dataset -- not just the current filters -- so switching years
  // isn't blocked by an unrelated status/tower filter narrowing things out.
  const yearBounds = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    projects.forEach((p) => {
      if (p.start_date) {
        const y = Number(p.start_date.slice(0, 4));
        if (y < min) min = y;
        if (y > max) max = y;
      }
      if (p.end_date) {
        const y = Number(p.end_date.slice(0, 4));
        if (y < min) min = y;
        if (y > max) max = y;
      }
    });
    if (!isFinite(min)) return { min: thisYear, max: thisYear };
    return { min, max };
  }, [projects, thisYear]);

  const [yearPref, setYearPref] = usePersistedState('pipeline_timeline_year', () => thisYear);
  const year = Math.min(Math.max(yearPref, yearBounds.min), yearBounds.max);
  const canGoPrev = year > yearBounds.min;
  const canGoNext = year < yearBounds.max;

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (pm: string) => setExpanded((e) => ({ ...e, [pm]: !e[pm] }));

  // Today's fractional position within the year (0-1), day-precision -- only
  // meaningful when the selected year is the real current year.
  const todayFraction = useMemo(() => {
    if (year !== thisYear) return null;
    const today = new Date();
    const yearStartMs = Date.UTC(thisYear, 0, 1);
    const totalDays = Math.round((Date.UTC(thisYear, 11, 31) - yearStartMs) / 86400000) + 1;
    return (Date.UTC(thisYear, today.getMonth(), today.getDate()) - yearStartMs) / 86400000 / totalDays;
  }, [year, thisYear]);

  const { pmData, globalMax } = useMemo(() => {
    let max = 0;
    const data = pmGroups.map(({ pm, rows }) => {
      // Group by ITS1 initiative (falling back to project name when blank)
      // before computing load: a PM often carries several rows that are really
      // the same initiative split into per-region/per-site sub-projects (e.g.
      // "ExpAM-17020-WIN 2016 OS Refresh <site>" repeated many times), which
      // would otherwise stack their weights and make the strip look busier
      // than the PM's actual distinct workload. Each initiative contributes
      // its single highest-weight status per month, not a sum of its rows.
      const its1Groups = new Map<string, Project[]>();
      rows.forEach((p) => {
        const key = p.project_name_its.trim() || p.project_name.trim() || p.project_name;
        const group = its1Groups.get(key);
        if (group) group.push(p); else its1Groups.set(key, [p]);
      });

      const monthLoad = new Array(12).fill(0);
      its1Groups.forEach((groupRows) => {
        for (let m = 0; m < 12; m++) {
          let weight = 0;
          groupRows.forEach((p) => {
            const span = monthSpanInYear(p, year);
            if (span && m >= span[0] && m <= span[1]) {
              weight = Math.max(weight, UTILIZATION_WEIGHT[p.project_status] ?? 0.4);
            }
          });
          monthLoad[m] += weight;
        }
      });
      monthLoad.forEach((v) => { if (v > max) max = v; });

      // Per-month status breakdown for the hover tooltip -- counts raw
      // projects (not ITS1-deduped) since "how many projects" is literal here.
      const monthStatusCounts: Record<string, number>[] = Array.from({ length: 12 }, () => ({}));
      rows.forEach((p) => {
        const span = monthSpanInYear(p, year);
        if (!span) return;
        for (let m = span[0]; m <= span[1]; m++) {
          monthStatusCounts[m][p.project_status] = (monthStatusCounts[m][p.project_status] || 0) + 1;
        }
      });

      // Data-quality flags (Overdue, Missing Funding/Probability/BU/Order),
      // same checks as the Project Quality tab -- surfaced here so an issue
      // is visible without switching tabs. On Hold is excluded; it's already
      // visually distinct via bar/strip color.
      const rowFlags = rows.map((p) => ({ p, flags: getProjectFlags(p, today) }));
      const flaggedCount = rowFlags.filter((r) => r.flags.length > 0).length;
      const flagLabelCounts = new Map<string, number>();
      rowFlags.forEach((r) => r.flags.forEach((f) => flagLabelCounts.set(f.label, (flagLabelCounts.get(f.label) ?? 0) + 1)));
      const flagTooltip = [...flagLabelCounts.entries()].map(([label, n]) => `${n} ${label}`).join(', ');

      return { pm, rows, monthLoad, monthStatusCounts, flaggedCount, flagTooltip };
    });
    // Hide PMs with nothing touching the selected year -- browsing to a year
    // where a PM has no work would otherwise leave an empty, misleading row.
    const visible = data.filter((d) => d.monthLoad.some((v) => v > 0));
    return { pmData: visible, globalMax: max };
  }, [pmGroups, year, today]);

  const usedStatuses = [...new Set(filtered.map((p) => p.project_status).filter(Boolean))].sort();
  const allExpanded = pmData.length > 0 && pmData.every((d) => expanded[d.pm]);
  const expandAll = () => setExpanded(Object.fromEntries(pmData.map((d) => [d.pm, true])));
  const collapseAll = () => setExpanded({});

  return (
    <div className="page">
      {!hideFilters && (
        <FilterBar
          projects={projects} filters={filters} setFilters={setFilters}
          nFiltered={filtered.length} nTotal={projects.length}
          filtersSync={filtersSync} toggleFiltersSync={toggleFiltersSync}
        />
      )}
      <div className="card pmu-card">
        <div className="timeline-hdr">
          <div className="pmu-year-nav">
            <button
              type="button" className="pmu-year-btn" onClick={() => setYearPref(year - 1)}
              disabled={!canGoPrev} title="Previous year"
            >‹</button>
            <div className="section-title pmu-year-title">Timeline — {year}</div>
            <button
              type="button" className="pmu-year-btn" onClick={() => setYearPref(year + 1)}
              disabled={!canGoNext} title="Next year"
            >›</button>
          </div>
          <div className="timeline-legend">
            {usedStatuses.map((s) => (
              <span key={s} className="timeline-legend-item">
                <span className="timeline-legend-dot" style={{ background: STATUS_COLORS[s] || STATUS_FALLBACK }} />
                {s}
              </span>
            ))}
            <span className="pmu-expand-controls">
              <button type="button" className="clear-btn" onClick={expandAll} disabled={pmData.length === 0 || allExpanded}>Expand all</button>
              <button type="button" className="clear-btn" onClick={collapseAll} disabled={!Object.values(expanded).some(Boolean)}>Collapse all</button>
            </span>
          </div>
        </div>

        <div className="pmu-body">
          {todayFraction != null && (
            <div className="pmu-today-line" style={{ left: `calc(228px + (100% - 228px) * ${todayFraction})` }} title="Today">
              <span className="pmu-today-label">Today</span>
            </div>
          )}

          <div className="pmu-row">
            <div className="pmu-label-col" />
            <div className="pmu-month-grid">
              {MONTHS.map((m, i) => (
                <div key={m} className="pmu-month-label" style={{ fontWeight: year === thisYear && i === currentMonth ? 700 : 400 }}>{m}</div>
              ))}
            </div>
          </div>

          {pmData.length === 0 && (
            <div className="progress-note">No projects active in {year} match the current filters.</div>
          )}

          {pmData.map(({ pm, rows, monthLoad, monthStatusCounts, flaggedCount, flagTooltip }) => {
            const isOpen = !!expanded[pm];
            return (
              <div key={pm} className="pmu-pm-block">
                <div className="pmu-row pmu-pm-row" onClick={() => toggle(pm)}>
                  <div className="pmu-label-col pmu-pm-label">
                    <span className={`pmu-chevron${isOpen ? ' open' : ''}`}>▸</span>
                    <span className="pmu-pm-name">{pm}</span>
                    <span className="pmu-pm-count">({rows.length})</span>
                    {flaggedCount > 0 && (
                      <span className="pmu-flag-badge" title={`${flaggedCount} project${flaggedCount !== 1 ? 's' : ''} with data-quality issues: ${flagTooltip}`}>
                        ⚠ {flaggedCount}
                      </span>
                    )}
                  </div>
                  <div className="pmu-strip">
                    {monthLoad.map((v, i) => {
                      const counts = Object.entries(monthStatusCounts[i]).sort((a, b) => b[1] - a[1]);
                      return (
                        <div key={i} className="pmu-strip-cell-wrap">
                          <div
                            className="pmu-strip-cell"
                            style={{ background: lerpColor(UTIL_PALETTE[0], UTIL_PALETTE[1], globalMax ? v / globalMax : 0) }}
                          />
                          {counts.length > 0 && (
                            <div className="pmu-cell-tooltip">
                              <div className="pmu-cell-tooltip-month">{MONTHS[i]}</div>
                              {counts.map(([status, count]) => (
                                <div key={status} className="pmu-cell-tooltip-row">
                                  <span className="pmu-cell-tooltip-dot" style={{ background: STATUS_COLORS[status] || STATUS_FALLBACK }} />
                                  <span>{count} {status}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {isOpen && rows.map((p, i) => {
                  const span = monthSpanInYear(p, year);
                  const flags = getProjectFlags(p, today);
                  return (
                    <div key={i} className="pmu-row pmu-proj-row">
                      <div
                        className="pmu-label-col pmu-proj-name pmu-proj-name-clickable"
                        title={p.project_name} onClick={() => onProjectClick(p)}
                      >
                        {flags.length > 0 && (
                          <span
                            className="pmu-flag-badge pmu-flag-badge-inline"
                            title={`Data-quality issues: ${flags.map((f) => f.label).join(', ')}`}
                            onClick={(e) => e.stopPropagation()}
                          >⚠</span>
                        )}
                        {p.project_name || '—'}
                      </div>
                      {span ? (
                        <div className="pmu-bar-grid">
                          <div className="pmu-bar-wrap" style={{ gridColumn: `${span[0] + 1} / ${span[1] + 2}` }}>
                            <div
                              className="pmu-bar"
                              style={{ background: STATUS_COLORS[p.project_status] || STATUS_FALLBACK }}
                            />
                            <div className="pmu-cell-tooltip pmu-bar-tooltip">
                              <div className="pmu-cell-tooltip-month">{p.project_name || 'Untitled project'}</div>
                              <div className="pmu-cell-tooltip-row">Start: {p.start_date || '—'}</div>
                              <div className="pmu-cell-tooltip-row">End: {p.end_date || '—'}</div>
                              <div className="pmu-cell-tooltip-row">Value: {fmtEur(p.value_2026)}</div>
                              <div className="pmu-cell-tooltip-row">Status: {p.project_status || '—'}</div>
                              <div className="pmu-cell-tooltip-row">BU: {p.bu || '—'}</div>
                              {flags.length > 0 && (
                                <div className="pmu-cell-tooltip-row pmu-bar-tooltip-flags">
                                  ⚠ {flags.map((f) => f.label).join(', ')}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="pmu-outside">outside {year}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className="pmu-scale-legend">
          <span>Utilization</span>
          <div className="pmu-scale-swatches">
            {[0, 0.25, 0.5, 0.75, 1].map((t) => (
              <div key={t} className="pmu-scale-swatch" style={{ background: lerpColor(UTIL_PALETTE[0], UTIL_PALETTE[1], t) }} />
            ))}
          </div>
          <span>low → high, weighted by project status &amp; month</span>
        </div>
      </div>
    </div>
  );
}
