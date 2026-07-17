/**
 * App shell.
 *
 * Wires up the data layer, tabs, and shared cross-tab filter state. Each tab
 * lives in its own file under src/tabs/ so they can be reviewed and deployed
 * independently (see docs/ROADMAP.md, Sprint 2).
 */
import { useMemo, useState } from 'react';
import { usePipeline } from './lib/usePipeline';
import { fmtEur } from './lib/format';
import type { Project } from './lib/types';
import { STATUS_COLORS } from './lib/constants';
import { mkMainFilters, usePersistedState, useTabFilters, applyMainFilters } from './lib/filters';
import { ProjectDetail } from './components/ProjectDetail';
import { ProjectList } from './tabs/ProjectList';
import { Analysis } from './tabs/Analysis';
import { Timeline } from './tabs/Timeline';
import { AllocationTab } from './tabs/Allocation';
import { ProjectQuality } from './tabs/ProjectQuality';
import { Versioning } from './tabs/Versioning';
import { APP_VERSION } from './lib/changelog';

const TABS = [
  { id: 'projectList',    label: 'Project List' },
  { id: 'analysis',       label: 'Analysis' },
  { id: 'timeline',       label: 'Timeline' },
  { id: 'projectQuality', label: 'Project Quality' },
  { id: 'allocation',     label: 'Allocation' },
  { id: 'versioning',     label: 'Versioning' },
] as const;
type TabId = (typeof TABS)[number]['id'];

export default function App() {
  const { data, loading, error, refresh } = usePipeline();
  const [tab, setTab] = useState<TabId>('projectList');
  const [selected, setSelected] = useState<Project | null>(null);

  const [filtersSync, setFiltersSync] = usePersistedState('pipeline_filters_sync', () => false);
  const [sharedFilters, setSharedFilters] = usePersistedState('pipeline_filters_shared', mkMainFilters);
  const toggleFiltersSync = () => setFiltersSync((s) => !s);
  const [hideKpis, setHideKpis] = usePersistedState('pipeline_hide_kpis', () => false);

  const [projectListFilters, setProjectListFilters] = useTabFilters('projectList', filtersSync, sharedFilters, setSharedFilters);
  const [analysisFilters, setAnalysisFilters] = useTabFilters('analysis', filtersSync, sharedFilters, setSharedFilters);
  const [timelineFilters, setTimelineFilters] = useTabFilters('timeline', filtersSync, sharedFilters, setSharedFilters);
  const [projectQualityFilters, setProjectQualityFilters] = useTabFilters('projectQuality', filtersSync, sharedFilters, setSharedFilters);

  // The KPI header is shared across tabs. It tracks whichever project-filter
  // tab is active; the Allocation tab doesn't have its own project filters,
  // so it falls back to (and can still filter) the Project List's.
  const kpiFilterableTab = tab !== 'allocation';
  const [kpiFilters, setKpiFilters] = tab === 'analysis'
    ? [analysisFilters, setAnalysisFilters] as const
    : tab === 'timeline'
      ? [timelineFilters, setTimelineFilters] as const
      : tab === 'projectQuality'
        ? [projectQualityFilters, setProjectQualityFilters] as const
        : [projectListFilters, setProjectListFilters] as const;

  const kpis = useMemo(() => {
    if (!data) return null;
    const filtered = applyMainFilters(data.projects, kpiFilters);
    // Each chip panel is built from "all filters except its own dimension" so
    // a chip never disappears when you toggle it off -- only its highlight
    // and count change. (Using `filtered` directly would drop a status/tower
    // out of the list the moment it's deselected, with no way to click it
    // back on.)
    const statusUniverse = applyMainFilters(data.projects, { ...kpiFilters, projectStatus: [] });
    const towerUniverse = applyMainFilters(data.projects, { ...kpiFilters, tower: [] });
    return {
      total: data.projects.length,
      filteredCount: filtered.length,
      value: filtered.reduce((s, p) => s + p.value_2026, 0),
      weighted: filtered.reduce((s, p) => s + p.value_weighted_2026, 0),
      byStatus: groupStats(statusUniverse, (p) => p.project_status),
      byTower: groupStats(towerUniverse, (p) => p.tower),
    };
  }, [data, kpiFilters]);

  const toggleStatusFilter = (status: string) => {
    if (!kpiFilterableTab) return;
    setKpiFilters((f) => ({
      ...f, projectStatus: f.projectStatus.includes(status)
        ? f.projectStatus.filter((s) => s !== status) : [...f.projectStatus, status],
    }));
  };
  const toggleTowerFilter = (tower: string) => {
    if (!kpiFilterableTab) return;
    setKpiFilters((f) => ({
      ...f, tower: f.tower.includes(tower) ? f.tower.filter((t) => t !== tower) : [...f.tower, tower],
    }));
  };

  if (loading) return <div className="state">Loading pipeline…</div>;

  if (error) {
    return (
      <div className="state error">
        <h2>Could not load pipeline</h2>
        <p>{error}</p>
        <button onClick={refresh}>Retry</button>
      </div>
    );
  }
  if (!data || !kpis) return null;

  const { meta } = data;

  return (
    <div className="app">
      <header className="hdr">
        <div>
          <h1>ISQ PMO — PM Pipeline <span className="version-tag">v{APP_VERSION}</span></h1>
          {/* Provenance is shown, always. Users must know how stale the data is
              and which backend served it -- especially during the Phase 2 cutover. */}
          <p className="meta">
            Source: <b>{meta.source}</b> · {meta.source_ref} ·{' '}
            {meta.source_modified_at
              ? `updated ${new Date(meta.source_modified_at).toLocaleString()}`
              : 'no timestamp'}{' '}
            · {meta.project_count} projects
          </p>
        </div>
        <div className="hdr-actions">
          <button
            type="button" className="switch-row"
            role="switch" aria-checked={!hideKpis}
            onClick={() => setHideKpis((v) => !v)}
          >
            <span className="switch-row-label">KPIs</span>
            <span className={`switch${hideKpis ? '' : ' on'}`}>
              <span className="switch-knob" />
            </span>
          </button>
          <button onClick={refresh}>↻ Refresh</button>
        </div>
      </header>

      {!hideKpis && (
        <section className="kpi-row">
          <Kpi label="Filtered projects" value={String(kpis.filteredCount)} sub={`${kpis.total} total`} />
          <Kpi label="Pipeline value 2026" value={fmtEur(kpis.value)} />
          <Kpi label="Weighted value 2026" value={fmtEur(kpis.weighted)} />
          <div className="kpi-group-card">
            <div className="kpi-group-title">By Status</div>
            <div className="kpi-group-chips">
              {kpis.byStatus.map(({ label: status, count, weighted }) => {
                const active = kpiFilters.projectStatus.includes(status);
                const clickable = kpiFilterableTab && status !== '(blank)';
                return (
                  <button
                    key={status} type="button"
                    className={`kpi-group-chip${active ? ' active' : ''}${clickable ? '' : ' static'}`}
                    onClick={clickable ? () => toggleStatusFilter(status) : undefined}
                    disabled={!clickable}
                  >
                    <span className="badge" style={{ background: STATUS_COLORS[status] || '#94a3b8' }}>{status || '—'}</span>
                    <span className="kpi-group-chip-stats">
                      <span className="kpi-group-chip-count">{count}</span>
                      <span className="kpi-group-chip-weighted">{fmtEur(weighted)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="kpi-group-card">
            <div className="kpi-group-title">By Tower</div>
            <div className="kpi-group-chips">
              {kpis.byTower.map(({ label: tower, count, weighted }) => {
                const active = kpiFilters.tower.includes(tower);
                const clickable = kpiFilterableTab && tower !== '(blank)';
                return (
                  <button
                    key={tower} type="button"
                    className={`kpi-group-chip${active ? ' active' : ''}${clickable ? '' : ' static'}`}
                    onClick={clickable ? () => toggleTowerFilter(tower) : undefined}
                    disabled={!clickable}
                  >
                    <span className="kpi-group-chip-label">{tower || '—'}</span>
                    <span className="kpi-group-chip-stats">
                      <span className="kpi-group-chip-count">{count}</span>
                      <span className="kpi-group-chip-weighted">{fmtEur(weighted)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={t.id === tab ? 'active' : ''}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main>
        {tab === 'projectList' && (
          <ProjectList
            projects={data.projects}
            filters={projectListFilters} setFilters={setProjectListFilters}
            filtersSync={filtersSync}
            toggleFiltersSync={toggleFiltersSync}
            onRowClick={setSelected}
          />
        )}
        {tab === 'analysis' && (
          <Analysis
            projects={data.projects}
            filters={analysisFilters} setFilters={setAnalysisFilters}
            filtersSync={filtersSync}
            toggleFiltersSync={toggleFiltersSync}
          />
        )}
        {tab === 'timeline' && (
          <Timeline
            projects={data.projects}
            filters={timelineFilters} setFilters={setTimelineFilters}
            filtersSync={filtersSync}
            toggleFiltersSync={toggleFiltersSync}
          />
        )}
        {tab === 'projectQuality' && (
          <ProjectQuality
            projects={data.projects}
            filters={projectQualityFilters} setFilters={setProjectQualityFilters}
            filtersSync={filtersSync}
            toggleFiltersSync={toggleFiltersSync}
          />
        )}
        {tab === 'allocation' && <AllocationTab allocations={data.allocations} />}
        {tab === 'versioning' && <Versioning />}
      </main>

      {selected && (
        <ProjectDetail project={selected} allProjects={data.projects} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

interface GroupStat { label: string; count: number; weighted: number }

function groupStats(projects: Project[], key: (p: Project) => string): GroupStat[] {
  const m: Record<string, GroupStat> = {};
  projects.forEach((p) => {
    const k = key(p) || '(blank)';
    (m[k] ??= { label: k, count: 0, weighted: 0 });
    m[k].count += 1;
    m[k].weighted += p.value_weighted_2026;
  });
  return Object.values(m).sort((a, b) => b.count - a.count);
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="kpi">
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{value}</span>
      {sub && <span className="kpi-sub">{sub}</span>}
    </div>
  );
}

