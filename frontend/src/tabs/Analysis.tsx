import { FilterBar } from '../components/FilterBar';
import { fmtEur } from '../lib/format';
import { INTEXT_COLORS } from '../lib/constants';
import { applyMainFilters, type MainFilters } from '../lib/filters';
import { PIPELINE_STATUSES, PROB_BUCKETS, type Project } from '../lib/types';

interface Props {
  projects: Project[];
  filters: MainFilters;
  setFilters: (upd: MainFilters | ((prev: MainFilters) => MainFilters)) => void;
  filtersSync: boolean;
  toggleFiltersSync: () => void;
  hideFilters: boolean;
}

export function Analysis({ projects, filters, setFilters, filtersSync, toggleFiltersSync, hideFilters }: Props) {
  const filtered = applyMainFilters(projects, filters);
  const pipelineData = filtered.filter((p) => PIPELINE_STATUSES.includes(p.project_status));

  return (
    <div className="page">
      {!hideFilters && (
        <FilterBar
          projects={projects} filters={filters} setFilters={setFilters}
          nFiltered={filtered.length} nTotal={projects.length}
          filtersSync={filtersSync} toggleFiltersSync={toggleFiltersSync}
        />
      )}
      <div className="grid-2">
        <div className="card">
          <div className="section-title-row">
            <div className="section-title">Pipeline by Probability</div>
            <span className="section-hint">Initiation · Starting</span>
          </div>
          <PipelineFunnel data={pipelineData} />
        </div>
        <div className="card">
          <div className="section-title">Internal vs External</div>
          <IntExtChart data={filtered} />
        </div>
      </div>
    </div>
  );
}

function PipelineFunnel({ data }: { data: Project[] }) {
  const total = data.length || 1;
  const totalV = data.reduce((s, p) => s + p.value_2026, 0) || 1;
  const buckets = PROB_BUCKETS.map((b) => {
    const rows = data.filter((p) => b.test(p.probability));
    return { ...b, count: rows.length, value: rows.reduce((s, p) => s + p.value_2026, 0) };
  });
  const noProb = data.filter((p) => !p.probability).length;

  return (
    <div>
      {buckets.map((b) => (
        <div key={b.label} className="progress-row">
          <div className="progress-row-hdr">
            <span style={{ fontWeight: 600, color: b.color }}>{b.label}</span>
            <span className="progress-row-sub">
              {b.count} ({Math.round((b.count / total) * 100)}%) · {fmtEur(b.value)}
            </span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${(b.value / totalV) * 100}%`, background: b.color }} />
          </div>
        </div>
      ))}
      {noProb > 0 && (
        <div className="progress-note">{noProb} project{noProb !== 1 ? 's' : ''} have no probability set</div>
      )}
    </div>
  );
}

function IntExtChart({ data }: { data: Project[] }) {
  const groups = groupWithValue(data, 'int_ext');
  const totalV = data.reduce((s, p) => s + p.value_2026, 0) || 1;
  const totalC = data.length || 1;

  if (groups.length === 0) return <div className="progress-note">No Int/Ext data</div>;

  return (
    <div>
      {groups.map(({ label, count, value }, i) => (
        <div key={label} className="progress-row">
          <div className="progress-row-hdr">
            <span style={{ fontWeight: 600 }}>{label === '(blank)' ? 'Not specified' : label}</span>
            <span className="progress-row-sub">
              {count} ({Math.round((count / totalC) * 100)}%) · {fmtEur(value)}
            </span>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${(value / totalV) * 100}%`, background: INTEXT_COLORS[i % INTEXT_COLORS.length] }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function groupWithValue(data: Project[], key: keyof Project) {
  const m: Record<string, { label: string; count: number; value: number }> = {};
  data.forEach((p) => {
    const k = String(p[key] || '').trim() || '(blank)';
    if (!m[k]) m[k] = { label: k, count: 0, value: 0 };
    m[k].count += 1;
    m[k].value += p.value_2026;
  });
  return Object.values(m).sort((a, b) => b.value - a.value);
}
