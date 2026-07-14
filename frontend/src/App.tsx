/**
 * App shell.
 *
 * This is a SKELETON, not a port. It wires up the data layer, tabs, and one
 * working example tab (Summary) so you have a running, deployable app on day 1.
 *
 * Porting the remaining tabs (Timeline, Allocation, Analysis, Project Detail
 * drawer) from PMO_PM_PipelineF.html is Sprint 2 -- see docs/ROADMAP.md. The
 * chart/table logic transfers almost unchanged; what changes is that each tab
 * becomes its own file under src/tabs/, so two people can work without
 * conflicting.
 */
import { useMemo, useState } from 'react';
import { usePipeline } from './lib/usePipeline';
import { fmtEur } from './lib/format';
import { CLOSED_STATUSES } from './lib/types';

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
        {tab === 'summary' ? (
          <ProjectTable projects={data.projects} />
        ) : (
          <p className="todo">
            <b>{TABS.find((t) => t.id === tab)?.label}</b> — to be ported from the
            original single-file app. See docs/ROADMAP.md, Sprint 2.
          </p>
        )}
      </main>
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

function ProjectTable({ projects }: { projects: import('./lib/types').Project[] }) {
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
            <tr key={`${p.project_name}-${i}`}>
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
