import { useMemo } from 'react';
import { FilterBar } from '../components/FilterBar';
import { STATUS_COLORS, MONTHS } from '../lib/constants';
import { applyMainFilters, type MainFilters } from '../lib/filters';
import type { Project } from '../lib/types';

interface Props {
  projects: Project[];
  filters: MainFilters;
  setFilters: (upd: MainFilters | ((prev: MainFilters) => MainFilters)) => void;
  filtersSync: boolean;
  toggleFiltersSync: () => void;
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

export function Timeline({ projects, filters, setFilters, filtersSync, toggleFiltersSync }: Props) {
  const filtered = applyMainFilters(projects, filters);
  const pmGroups = usePMGroups(filtered);

  const today = useMemo(() => new Date(), []);
  const year = today.getFullYear();
  const yearStartMs = Date.UTC(year, 0, 1);
  const totalDays = Math.round((Date.UTC(year, 11, 31) - yearStartMs) / 86400000) + 1;
  const numWeeks = Math.ceil(totalDays / 7);
  const yearEndMs = yearStartMs + (totalDays - 1) * 86400000;

  const monthMarks = useMemo(() => {
    let acc = 0;
    return MONTHS.map((m, i) => {
      const pct = (acc / totalDays) * 100;
      acc += new Date(Date.UTC(year, i + 1, 0)).getUTCDate();
      return { label: m, pct };
    });
  }, [year, totalDays]);

  const todayPct = today.getFullYear() === year
    ? ((Date.UTC(year, today.getMonth(), today.getDate()) - yearStartMs) / 86400000 / totalDays) * 100
    : null;

  const barFor = (p: Project) => {
    if (!p.start_date && !p.end_date) return null;
    let s = p.start_date ? Date.parse(`${p.start_date}T00:00:00Z`) : yearStartMs;
    let e = p.end_date ? Date.parse(`${p.end_date}T00:00:00Z`) : yearEndMs;
    if (isNaN(s) || isNaN(e) || e < yearStartMs || s > yearEndMs) return null;
    if (s < yearStartMs) s = yearStartMs;
    if (e > yearEndMs) e = yearEndMs;
    const leftPct = ((s - yearStartMs) / 86400000 / totalDays) * 100;
    const widthPct = Math.max(((e - s) / 86400000 + 1) / totalDays * 100, 0.6);
    return { leftPct, widthPct };
  };

  const usedStatuses = [...new Set(filtered.map((p) => p.project_status).filter(Boolean))].sort();

  return (
    <div className="page">
      <FilterBar
        projects={projects} filters={filters} setFilters={setFilters}
        nFiltered={filtered.length} nTotal={projects.length} showBsoIo
        filtersSync={filtersSync} toggleFiltersSync={toggleFiltersSync}
      />
      <div className="card">
        <div className="timeline-hdr">
          <div className="section-title">Timeline — {year}</div>
          <div className="timeline-legend">
            {usedStatuses.map((s) => (
              <span key={s} className="timeline-legend-item">
                <span className="timeline-legend-dot" style={{ background: STATUS_COLORS[s] || '#94a3b8' }} />
                {s}
              </span>
            ))}
          </div>
        </div>

        <div className="timeline-months-row">
          <div className="timeline-name-col" />
          <div className="timeline-months">
            {monthMarks.map((m) => (
              <div key={m.label} className="timeline-month-mark" style={{ left: `${m.pct}%` }}>{m.label}</div>
            ))}
          </div>
        </div>

        {pmGroups.length === 0 && <div className="progress-note">No projects match the current filters.</div>}

        {pmGroups.map(({ pm, rows }) => (
          <div key={pm} className="timeline-pm-group">
            <div className="timeline-pm-hdr">
              {pm} <span className="timeline-pm-count">({rows.length} project{rows.length !== 1 ? 's' : ''})</span>
            </div>
            {rows.map((p, i) => {
              const bar = barFor(p);
              return (
                <div key={i} className="timeline-row">
                  <div className="timeline-name-col" title={p.project_name}>{p.project_name || '—'}</div>
                  <div
                    className="timeline-track"
                    style={{ background: `repeating-linear-gradient(to right, rgba(0,0,0,.05) 0, rgba(0,0,0,.05) 1px, transparent 1px, transparent ${100 / numWeeks}%)` }}
                  >
                    {todayPct != null && <div className="timeline-today" style={{ left: `${todayPct}%` }} />}
                    {bar ? (
                      <div
                        className="timeline-bar"
                        title={`${p.start_date || '?'} → ${p.end_date || '?'}`}
                        style={{ left: `${bar.leftPct}%`, width: `${bar.widthPct}%`, background: STATUS_COLORS[p.project_status] || '#94a3b8' }}
                      />
                    ) : (
                      <div className="timeline-outside">outside {year}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
