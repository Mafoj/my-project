import { useMemo } from 'react';
import { MultiSelect } from '../components/MultiSelect';
import { usePersistedState } from '../lib/filters';
import { fmtEur, fmtPct } from '../lib/format';
import { MONTH_KEYS, type Allocation, type MonthKey } from '../lib/types';
import { MONTHS } from '../lib/constants';

interface AllocFilters {
  tower: string[];
  pmName: string[];
  projectStatus: string[];
  externality: string[];
}
const mkAllocFilters = (): AllocFilters => ({ tower: [], pmName: [], projectStatus: [], externality: [] });

interface Props {
  allocations: Allocation[];
}

export function AllocationTab({ allocations }: Props) {
  const [f, setF] = usePersistedState<AllocFilters>('pipeline_filters_allocation', mkAllocFilters);

  const opts = useMemo(() => {
    const u = (k: keyof Allocation) => [...new Set(allocations.map((r) => String(r[k] || '')).filter(Boolean))].sort();
    return { tower: u('tower'), pmName: u('pm_name'), projectStatus: u('project_status'), externality: u('externality') };
  }, [allocations]);

  const filtered = useMemo(() => allocations.filter((r) => {
    if (f.tower.length && !f.tower.includes(r.tower)) return false;
    if (f.pmName.length && !f.pmName.includes(r.pm_name)) return false;
    if (f.projectStatus.length && !f.projectStatus.includes(r.project_status)) return false;
    if (f.externality.length && !f.externality.includes(r.externality)) return false;
    return true;
  }), [allocations, f]);

  const totalValue = filtered.reduce((s, r) => s + r.value, 0);
  const uniquePMs = new Set(filtered.map((r) => r.pm_name).filter(Boolean)).size;
  const avgProb = filtered.length ? filtered.reduce((s, r) => s + r.probability, 0) / filtered.length : 0;
  const monthTotals = MONTH_KEYS.map((mk, i) => ({
    label: MONTHS[i], value: filtered.reduce((s, r) => s + (r.months[mk] || 0), 0),
  }));
  const pmList = [...new Set(filtered.map((r) => r.pm_name).filter(Boolean))].sort();
  const pmMonth = (pm: string, mk: MonthKey) =>
    filtered.filter((r) => r.pm_name === pm).reduce((s, r) => s + (r.months[mk] || 0), 0);
  const maxMonthValue = Math.max(...pmList.flatMap((pm) => MONTH_KEYS.map((mk) => pmMonth(pm, mk))), 1);
  const set = <K extends keyof AllocFilters>(k: K, v: AllocFilters[K]) => setF((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="page">
      <div className="filter-bar">
        {(['tower', 'pmName', 'projectStatus', 'externality'] as const).map((k) => (
          <div key={k} className="filter-group">
            <label>{{ tower: 'Tower', pmName: 'PM Name', projectStatus: 'Status', externality: 'Externality' }[k]}</label>
            <MultiSelect options={opts[k]} value={f[k]} onChange={(v) => set(k, v)} />
          </div>
        ))}
        <div className="filter-actions">
          <span className="count-chip">{filtered.length} / {allocations.length}</span>
          <button type="button" className="clear-btn" onClick={() => setF(mkAllocFilters())}>Clear</button>
        </div>
      </div>

      <section className="kpis">
        <div className="kpi">
          <span className="kpi-label">Total Entries</span>
          <span className="kpi-value">{filtered.length}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Unique PMs</span>
          <span className="kpi-value">{uniquePMs}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Total Value</span>
          <span className="kpi-value">{fmtEur(totalValue)}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Avg Probability</span>
          <span className="kpi-value">{avgProb.toFixed(1)}%</span>
        </div>
      </section>

      <div className="card">
        <div className="section-title">Monthly Totals (Jan – Dec)</div>
        <HBar data={monthTotals} fmt={fmtEur} />
      </div>

      <div className="card">
        <div className="section-title">PM × Month Allocation Heatmap</div>
        <div className="table-wrap">
          <table className="heatmap">
            <thead>
              <tr>
                <th>PM</th>
                {MONTHS.map((m) => <th key={m}>{m}</th>)}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {pmList.map((pm) => {
                const rowTotal = MONTH_KEYS.reduce((s, mk) => s + pmMonth(pm, mk), 0);
                return (
                  <tr key={pm}>
                    <td className="heatmap-pm">{pm}</td>
                    {MONTH_KEYS.map((mk) => {
                      const v = pmMonth(pm, mk);
                      const intensity = v / maxMonthValue;
                      return (
                        <td
                          key={mk} className="num"
                          style={v > 0 ? { background: `rgba(29,78,216,${Math.min(0.08 + intensity * 0.75, 0.88)})` } : undefined}
                        >
                          {v > 0 ? fmtEur(v) : ''}
                        </td>
                      );
                    })}
                    <td className="num" style={{ fontWeight: 600 }}>{fmtEur(rowTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tower</th><th>PM Name</th><th>PM Secondary</th><th>Project Name</th>
              <th>Externality</th><th>Order N.</th><th>Status</th>
              <th className="num">Prob.</th><th className="num">Value</th>
              {MONTHS.map((m) => <th key={m} className="num">{m}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 300).map((r, i) => (
              <tr key={i}>
                <td>{r.tower}</td><td>{r.pm_name}</td><td>{r.pm_name_secondary}</td>
                <td>{r.project_name}</td><td>{r.externality}</td><td>{r.order_n}</td>
                <td>{r.project_status}</td>
                <td className="num">{fmtPct(r.probability)}</td>
                <td className="num">{r.value ? fmtEur(r.value) : ''}</td>
                {MONTH_KEYS.map((mk) => (
                  <td key={mk} className="num">{r.months[mk] ? fmtEur(r.months[mk]) : ''}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length > 300 && (
        <div className="progress-note">Showing first 300 of {filtered.length} rows — narrow the filters to see more.</div>
      )}
    </div>
  );
}

function HBar({ data, fmt }: { data: { label: string; value: number }[]; fmt: (v: number) => string }) {
  const max = Math.max(...data.map((r) => r.value), 1);
  return (
    <div>
      {data.map((r) => (
        <div key={r.label} className="hbar-row">
          <div className="hbar-label" title={r.label}>{r.label}</div>
          <div className="hbar-track"><div className="hbar-fill" style={{ width: `${(r.value / max) * 100}%` }} /></div>
          <div className="hbar-val">{fmt(r.value)}</div>
        </div>
      ))}
    </div>
  );
}
