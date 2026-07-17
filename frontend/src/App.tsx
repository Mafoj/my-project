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
import { CLOSED_STATUSES, type Project } from './lib/types';
import { mkMainFilters, usePersistedState, applyMainFilters, useTabFilters, type MainFilters } from './lib/filters';
import { FilterBar } from './components/FilterBar';
import { ProjectDetail } from './components/ProjectDetail';
import { Analysis } from './tabs/Analysis';
import { Timeline } from './tabs/Timeline';
import { AllocationTab } from './tabs/Allocation';

const TABS = [
  { id: 'summary',    label: 'Summary' },
  { id: 'analysis',   label: 'Analysis' },
  { id: 'timeline',   label: 'Timeline' },
  { id: 'allocation', label: 'Allocation' },
] as const;
type TabId = (typeof TABS)[number]['id'];

export default function App() {
  const { data, loading, error, refresh } = usePipeline();
  const [tab, setTab] = useState<TabId>('summary');
  const [selected, setSelected] = useState<Project | null>(null);

  const [filtersSync, setFiltersSync] = usePersistedState('pipeline_filters_sync', () => false);
  const [sharedFilters, setSharedFilters] = usePersistedState('pipeline_filters_shared', mkMainFilters);
  const toggleFiltersSync = () => setFiltersSync((s) => !s);

  const [summaryFilters, setSummaryFilters] = useTabFilters('summary', filtersSync, sharedFilters, setSharedFilters);
  const [analysisFilters, setAnalysisFilters] = useTabFilters('analysis', filtersSync, sharedFilters, setSharedFilters);
  const [timelineFilters, setTimelineFilters] = useTabFilters('timeline', filtersSync, sharedFilters, setSharedFilters);

  const kpis = useMemo(() => {
    if (!data) return null;
    const open = data.projects.filter((p) => !CLOSED_STATUSES.has(p.project_status));
    return {
      total: data.projects.length,
      open: open.length,
      value: open.reduce((s, p) => s + p.value_2026, 0),
      weighted: open.reduce((s, p) => s + p.value_weighted_2026, 0),
    };
  }, [data]);

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
          <h1>ISQ PMO — PM Pipeline</h1>
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
        <button onClick={refresh}>↻ Refresh</button>
      </header>

      <section className="kpis">
        <Kpi label="Open projects" value={String(kpis.open)} sub={`${kpis.total} total`} />
        <Kpi label="Pipeline value 2026" value={fmtEur(kpis.value)} />
        <Kpi label="Weighted value 2026" value={fmtEur(kpis.weighted)} />
      </section>

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
        {tab === 'summary' && (
          <SummaryTab
            projects={data.projects}
            filters={summaryFilters} setFilters={setSummaryFilters}
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
        {tab === 'allocation' && <AllocationTab allocations={data.allocations} />}
      </main>

      {selected && (
        <ProjectDetail project={selected} allProjects={data.projects} onClose={() => setSelected(null)} />
      )}
    </div>
  );
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

function SummaryTab({
  projects, filters, setFilters, filtersSync, toggleFiltersSync, onRowClick,
}: {
  projects: Project[];
  filters: MainFilters;
  setFilters: (upd: MainFilters | ((prev: MainFilters) => MainFilters)) => void;
  filtersSync: boolean;
  toggleFiltersSync: () => void;
  onRowClick: (p: Project) => void;
}) {
  const filtered = applyMainFilters(projects, filters);
  return (
    <div className="page">
      <FilterBar
        projects={projects} filters={filters} setFilters={setFilters}
        nFiltered={filtered.length} nTotal={projects.length}
        filtersSync={filtersSync} toggleFiltersSync={toggleFiltersSync}
      />
      <ProjectTable projects={filtered.slice(0, 300)} onRowClick={onRowClick} />
      {filtered.length > 300 && (
        <div className="progress-note">Showing first 300 of {filtered.length} rows — narrow the filters to see more.</div>
      )}
    </div>
  );
}

function ProjectTable({ projects, onRowClick }: { projects: Project[]; onRowClick: (p: Project) => void }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Project</th><th>Tower</th><th>BU</th><th>PM</th>
            <th>Status</th><th className="num">Value 2026</th><th className="num">Prob.</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p, i) => (
            <tr key={`${p.project_name}-${i}`} className="clickable-row" onClick={() => onRowClick(p)}>
              <td>{p.project_name}</td>
              <td>{p.tower}</td>
              <td>{p.bu}</td>
              <td>{p.pm_name}</td>
              <td>{p.project_status}</td>
              <td className="num">{fmtEur(p.value_2026)}</td>
              <td className="num">{Math.round(p.probability)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
