import { useMemo, useRef } from 'react';
import { FilterBar } from '../components/FilterBar';
import { SortTh } from '../components/SortTh';
import { fmtEur } from '../lib/format';
import { STATUS_COLORS, STATUS_FALLBACK } from '../lib/constants';
import { applyMainFilters, type MainFilters } from '../lib/filters';
import { useTableSort } from '../lib/useTableSort';
import { getProjectFlags } from '../lib/qualityFlags';
import { type Project } from '../lib/types';

interface Props {
  projects: Project[];
  filters: MainFilters;
  setFilters: (upd: MainFilters | ((prev: MainFilters) => MainFilters)) => void;
  filtersSync: boolean;
  toggleFiltersSync: () => void;
  hideFilters: boolean;
}

const DAY_MS = 86400000;
const daysBetween = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / DAY_MS);

export function ProjectQuality({ projects, filters, setFilters, filtersSync, toggleFiltersSync, hideFilters }: Props) {
  const filtered = applyMainFilters(projects, filters);

  const onHoldRef = useRef<HTMLDivElement>(null);
  const overdueRef = useRef<HTMLDivElement>(null);
  const endingSoonRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef<HTMLDivElement>(null);
  const missFundRef = useRef<HTMLDivElement>(null);
  const missOrderRef = useRef<HTMLDivElement>(null);
  const missBURef = useRef<HTMLDivElement>(null);
  const missProbRef = useRef<HTMLDivElement>(null);
  const yr1Ref = useRef<HTMLDivElement>(null);
  const yr2Ref = useRef<HTMLDivElement>(null);
  const yr3Ref = useRef<HTMLDivElement>(null);
  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) => () =>
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const today = useMemo(() => new Date(), []);
  const CY = today.getFullYear();
  const sixtyAgo = useMemo(() => { const d = new Date(today); d.setDate(today.getDate() - 60); return d; }, [today]);

  const hasFlag = (p: Project, key: string) => getProjectFlags(p, today).some((f) => f.key === key);

  const onHold = useMemo(() => filtered.filter((p) => p.project_status === 'On Hold'), [filtered]);
  const overdue = useMemo(() => filtered.filter((p) => hasFlag(p, 'overdue')), [filtered, today]);
  const endingSoon = useMemo(() => filtered.filter((p) => {
    if (!p.end_date) return false;
    const d = daysBetween(new Date(p.end_date), today);
    return d >= 0 && d <= 60;
  }), [filtered, today]);
  const startedRecently = useMemo(() => filtered.filter((p) => {
    if (!p.start_date) return false;
    const d = new Date(p.start_date);
    return d >= sixtyAgo && d <= today;
  }), [filtered, today, sixtyAgo]);
  const missFunding = useMemo(() => filtered.filter((p) => hasFlag(p, 'missingFunding')), [filtered, today]);
  const missOrder = useMemo(() => filtered.filter((p) => hasFlag(p, 'missingOrder')), [filtered, today]);
  const missBU = useMemo(() => filtered.filter((p) => hasFlag(p, 'missingBU')), [filtered, today]);
  const missProb = useMemo(() => filtered.filter((p) => hasFlag(p, 'missingProbability')), [filtered, today]);

  const startYear = (p: Project) => (p.start_date ? p.start_date.slice(0, 4) : '');
  const agoData = useMemo(() => [
    { label: '1 year ago', yearLabel: String(CY - 1), ref: yr1Ref, rows: filtered.filter((p) => Number(startYear(p)) === CY - 1) },
    { label: '2 years ago', yearLabel: String(CY - 2), ref: yr2Ref, rows: filtered.filter((p) => Number(startYear(p)) === CY - 2) },
    { label: '3+ years ago', yearLabel: `≤ ${CY - 3}`, ref: yr3Ref, rows: filtered.filter((p) => { const y = Number(startYear(p)); return y > 0 && y <= CY - 3; }) },
  ], [filtered, CY]);

  const sortOH = useTableSort<Project>('start_date', 'asc');
  const sortOD = useTableSort<Project & { _daysOD: number }>('end_date', 'asc');
  const sortES = useTableSort<Project & { _daysLeft: number }>('end_date', 'asc');
  const sortSR = useTableSort<Project & { _daysAgo: number }>('start_date', 'desc');
  const sortMF = useTableSort<Project>('project_name', 'asc');
  const sortMO = useTableSort<Project>('project_name', 'asc');
  const sortMB = useTableSort<Project>('project_name', 'asc');
  const sortMP = useTableSort<Project>('project_name', 'asc');
  const sortA1 = useTableSort<Project>('pm_name', 'asc');
  const sortA2 = useTableSort<Project>('pm_name', 'asc');
  const sortA3 = useTableSort<Project>('pm_name', 'asc');
  const agoSorts = [sortA1, sortA2, sortA3];

  const buList = useMemo(() => [...new Set(onHold.map((p) => p.bu || '(blank)'))].sort(), [onHold]);
  const yrList = useMemo(() => [...new Set(onHold.map((p) => startYear(p) || '(blank)'))].sort(), [onHold]);
  const holdCount = (yr: string, bu: string) =>
    onHold.filter((p) => (startYear(p) || '(blank)') === yr && (p.bu || '(blank)') === bu).length;
  const maxHold = useMemo(
    () => Math.max(...yrList.flatMap((y) => buList.map((b) => holdCount(y, b))), 1),
    [yrList, buList, onHold],
  );

  return (
    <div className="page pq-page">
      {!hideFilters && (
        <FilterBar
          projects={projects} filters={filters} setFilters={setFilters}
          nFiltered={filtered.length} nTotal={projects.length}
          filtersSync={filtersSync} toggleFiltersSync={toggleFiltersSync}
        />
      )}

      <QualitySummary
        totalProjects={filtered.length}
        flags={[
          { label: 'Overdue', value: overdue.length, color: '#b2584f', onClick: scrollTo(overdueRef) },
          { label: 'Missing Funding', value: missFunding.length, color: '#d6ac7a', onClick: scrollTo(missFundRef) },
          { label: 'On Hold', value: onHold.length, color: '#c9b384', onClick: scrollTo(onHoldRef) },
          { label: 'Missing Probability', value: missProb.length, color: '#8ba6c9', onClick: scrollTo(missProbRef) },
          { label: 'Missing BU', value: missBU.length, color: '#d9c9a8', onClick: scrollTo(missBURef) },
        ]}
        otherFlags={[
          { label: 'On Hold', value: onHold.length, color: '#c9b384', onClick: scrollTo(onHoldRef) },
          { label: 'Missing Probability', value: missProb.length, color: '#8ba6c9', onClick: scrollTo(missProbRef) },
          { label: 'Missing BU', value: missBU.length, color: '#d9c9a8', onClick: scrollTo(missBURef) },
          { label: 'Missing Order #', value: missOrder.length, color: 'var(--pq-strong-text)', onClick: scrollTo(missOrderRef) },
        ]}
        timingBuckets={[
          { label: 'Ending ≤60d', value: endingSoon.length, color: '#d6ac7a', onClick: scrollTo(endingSoonRef) },
          { label: 'Started ≤60d', value: startedRecently.length, color: '#7fb59d', onClick: scrollTo(startedRef) },
          { label: '1 year ago', value: agoData[0].rows.length, color: 'var(--pq-strong)', numberColor: 'var(--pq-strong-text)', onClick: scrollTo(agoData[0].ref) },
          { label: '2 years ago', value: agoData[1].rows.length, color: '#6b7280', numberColor: '#9aa2ad', onClick: scrollTo(agoData[1].ref) },
          { label: '3+ years', value: agoData[2].rows.length, color: '#c7ccd3', onClick: scrollTo(agoData[2].ref) },
        ]}
      />

      {/* On Hold */}
      <div className="card" ref={onHoldRef}>
        <div className="section-title">On Hold — Start Year × BU</div>
        {yrList.length > 0 ? (
          <>
            <div className="table-wrap pq-heatmap-wrap">
              <table className="heatmap">
                <thead>
                  <tr>
                    <th>Year</th>
                    {buList.map((b) => <th key={b}>{b}</th>)}
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {yrList.map((yr) => {
                    const rowTotal = buList.reduce((s, b) => s + holdCount(yr, b), 0);
                    return (
                      <tr key={yr}>
                        <td className="heatmap-pm">{yr}</td>
                        {buList.map((b) => {
                          const v = holdCount(yr, b);
                          const intensity = v / maxHold;
                          return (
                            <td
                              key={b} className="num"
                              style={v > 0 ? { background: `rgba(245,158,11,${Math.min(0.15 + intensity * 0.75, 0.9)})`, color: '#78350f' } : undefined}
                            >
                              {v || ''}
                            </td>
                          );
                        })}
                        <td className="num" style={{ fontWeight: 600 }}>{rowTotal}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="section-title">On Hold Detail</div>
            <QualityTable
              rows={onHold} sort={sortOH}
              columns={[
                { label: 'Status', key: 'project_status', render: statusBadge },
                { label: 'Project Name', key: 'project_name' },
                { label: 'PM Name', key: 'pm_name' },
                { label: 'Int/Ext', key: 'int_ext' },
                { label: 'BU', key: 'bu' },
                { label: 'Start Date', key: 'start_date' },
                { label: 'End Date', key: 'end_date' },
                { label: 'Value 2026', key: 'value_2026', align: 'num', render: (p) => p.value_2026 ? fmtEur(p.value_2026) : '' },
                { label: 'Comments', key: 'comments', className: 'comments-cell' },
              ]}
            />
          </>
        ) : <div className="progress-note">No on-hold projects</div>}
      </div>

      {/* Overdue */}
      <div className="card" ref={overdueRef}>
        <div className="section-title pq-title-danger">Overdue — Past End Date, Still Active ({overdue.length})</div>
        {overdue.length > 0 ? (
          <>
            <div className="alert-red">
              <span>⚠</span>
              <span>These projects have passed their planned end date but are not yet closed. Review with the responsible PM.</span>
            </div>
            <QualityTable
              rows={overdue.map((p) => ({ ...p, _daysOD: p.end_date ? daysBetween(today, new Date(p.end_date)) : 0 }))}
              sort={sortOD}
              columns={[
                { label: 'End Date', key: 'end_date', className: 'pq-danger-cell' },
                { label: 'Days Overdue', key: '_daysOD', className: 'pq-danger-cell', render: (p) => `${p._daysOD}d overdue` },
                { label: 'Project Name', key: 'project_name' },
                { label: 'PM Name', key: 'pm_name' },
                { label: 'BU', key: 'bu' },
                { label: 'Tower', key: 'tower' },
                { label: 'Status', key: 'project_status', render: statusBadge },
                { label: 'Value 2026', key: 'value_2026', align: 'num', render: (p) => p.value_2026 ? fmtEur(p.value_2026) : '' },
              ]}
            />
          </>
        ) : <div className="progress-note">No overdue projects — all active projects are within their planned end date.</div>}
      </div>

      {/* Ending Soon */}
      <div className="card" ref={endingSoonRef}>
        <div className="section-title">Ending in Next 60 Days ({endingSoon.length})</div>
        {endingSoon.length > 0 ? (
          <QualityTable
            rows={endingSoon.map((p) => ({ ...p, _daysLeft: p.end_date ? daysBetween(new Date(p.end_date), today) : 9999 }))}
            sort={sortES}
            columns={[
              { label: 'End Date', key: 'end_date', render: (p) => p.end_date, className: (p) => daysUrgencyClass(p._daysLeft) },
              { label: 'Days Left', key: '_daysLeft', render: (p) => `${p._daysLeft}d${p._daysLeft <= 0 ? ' [OVERDUE]' : ' remaining'}`, className: (p) => daysUrgencyClass(p._daysLeft) },
              { label: 'Project Name', key: 'project_name' },
              { label: 'PM Name', key: 'pm_name' },
              { label: 'BU', key: 'bu' },
              { label: 'Status', key: 'project_status', render: statusBadge },
            ]}
          />
        ) : <div className="progress-note">None</div>}
      </div>

      {/* Started Last 60 Days */}
      <div className="card" ref={startedRef}>
        <div className="section-title">Started in Last 60 Days ({startedRecently.length})</div>
        {startedRecently.length > 0 ? (
          <QualityTable
            rows={startedRecently.map((p) => ({ ...p, _daysAgo: p.start_date ? daysBetween(today, new Date(p.start_date)) : 0 }))}
            sort={sortSR}
            columns={[
              { label: 'Start Date', key: 'start_date', className: 'pq-success-cell' },
              { label: 'Days Ago', key: '_daysAgo', className: 'pq-success-cell', render: (p) => `${p._daysAgo}d ago` },
              { label: 'Project Name', key: 'project_name' },
              { label: 'ITS1 Name', key: 'project_name_its', className: 'comments-cell' },
              { label: 'PM Name', key: 'pm_name' },
              { label: 'BU', key: 'bu' },
              { label: 'Tower', key: 'tower' },
              { label: 'Status', key: 'project_status', render: statusBadge },
              { label: 'Value 2026', key: 'value_2026', align: 'num', render: (p) => p.value_2026 ? fmtEur(p.value_2026) : '' },
            ]}
          />
        ) : <div className="progress-note">None</div>}
      </div>

      {/* Missing Funding */}
      <div className="card" ref={missFundRef}>
        <div className="section-title">Missing Funding ({missFunding.length})</div>
        {missFunding.length > 0 ? (
          <QualityTable
            rows={missFunding} sort={sortMF}
            columns={[
              { label: 'Value 2026', key: 'value_2026', align: 'num', render: () => '—', className: 'pq-muted-cell' },
              { label: 'Weighted Value', key: 'value_weighted_2026', align: 'num', render: () => '—', className: 'pq-muted-cell' },
              { label: 'Project Name', key: 'project_name' },
              { label: 'PM Name', key: 'pm_name' },
              { label: 'BU', key: 'bu' },
              { label: 'Status', key: 'project_status', render: statusBadge },
              { label: 'Start', key: 'start_date' },
              { label: 'End', key: 'end_date' },
            ]}
          />
        ) : <div className="progress-note">None</div>}
      </div>

      {/* Missing Order */}
      <div className="card" ref={missOrderRef}>
        <div className="section-title">Missing Order / SalesForce ({missOrder.length})</div>
        {missOrder.length > 0 ? (
          <QualityTable
            rows={missOrder} sort={sortMO}
            columns={[
              { label: 'BSO/IO #', key: 'bso_io', render: (p) => p.bso_io || '—', className: 'pq-muted-cell' },
              { label: 'SalesForce #', key: 'sales_force', render: (p) => p.sales_force || '—', className: 'pq-muted-cell' },
              { label: 'Project Name', key: 'project_name' },
              { label: 'PM Name', key: 'pm_name' },
              { label: 'BU', key: 'bu' },
              { label: 'Status', key: 'project_status', render: statusBadge },
              { label: 'Start', key: 'start_date' },
              { label: 'End', key: 'end_date' },
            ]}
          />
        ) : <div className="progress-note">None</div>}
      </div>

      {/* Missing BU */}
      <div className="card" ref={missBURef}>
        <div className="section-title">Missing Business Unit ({missBU.length})</div>
        {missBU.length > 0 ? (
          <>
            <div className="alert-warn">
              <span>⚠</span>
              <span>These projects have no BU assigned — their value is excluded from every "by BU" chart and rollup on this dashboard.</span>
            </div>
            <QualityTable
              rows={missBU} sort={sortMB}
              columns={[
                { label: 'BU', key: 'bu', render: () => '—', className: 'pq-muted-cell' },
                { label: 'Project Name', key: 'project_name' },
                { label: 'PM Name', key: 'pm_name' },
                { label: 'Tower', key: 'tower' },
                { label: 'Status', key: 'project_status', render: statusBadge },
                { label: 'Start', key: 'start_date' },
                { label: 'End', key: 'end_date' },
                { label: 'Value 2026', key: 'value_2026', align: 'num', render: (p) => p.value_2026 ? fmtEur(p.value_2026) : '' },
              ]}
            />
          </>
        ) : <div className="progress-note">None</div>}
      </div>

      {/* Missing Probability */}
      <div className="card" ref={missProbRef}>
        <div className="section-title">Missing Probability ({missProb.length})</div>
        {missProb.length > 0 ? (
          <>
            <div className="alert-warn">
              <span>⚠</span>
              <span>These projects have no probability set — they are excluded from the Pipeline by Probability chart and the Weighted Value calculation may be inaccurate.</span>
            </div>
            <QualityTable
              rows={missProb} sort={sortMP}
              columns={[
                { label: 'Probability', key: 'probability', align: 'num', render: () => '—', className: 'pq-muted-cell' },
                { label: 'Project Name', key: 'project_name' },
                { label: 'PM Name', key: 'pm_name' },
                { label: 'BU', key: 'bu' },
                { label: 'Tower', key: 'tower' },
                { label: 'Status', key: 'project_status', render: statusBadge },
                { label: 'Start', key: 'start_date' },
                { label: 'End', key: 'end_date' },
                { label: 'Value 2026', key: 'value_2026', align: 'num', render: (p) => p.value_2026 ? fmtEur(p.value_2026) : '' },
              ]}
            />
          </>
        ) : <div className="progress-note">All projects have a probability set — no action required.</div>}
      </div>

      {/* Started X years ago */}
      {agoData.map(({ label, yearLabel, ref, rows }, idx) => (
        <div key={label} className="card" ref={ref}>
          <div className="section-title">Started {label} — {yearLabel} ({rows.length})</div>
          {rows.length > 0 ? (
            <QualityTable
              rows={rows} sort={agoSorts[idx]}
              columns={[
                { label: 'Start Year', key: '_sy', render: (p) => startYear(p) || '—' },
                { label: 'Project Name', key: 'project_name' },
                { label: 'PM Name', key: 'pm_name' },
                { label: 'BU', key: 'bu' },
                { label: 'Tower', key: 'tower' },
                { label: 'Status', key: 'project_status', render: statusBadge },
                { label: 'End Date', key: 'end_date' },
                { label: 'Value 2026', key: 'value_2026', align: 'num', render: (p) => p.value_2026 ? fmtEur(p.value_2026) : '' },
              ]}
            />
          ) : <div className="progress-note">None</div>}
        </div>
      ))}
    </div>
  );
}

function statusBadge(p: Project) {
  return <span className="badge" style={{ background: STATUS_COLORS[p.project_status] || STATUS_FALLBACK }}>{p.project_status || '—'}</span>;
}

function daysUrgencyClass(d: number) {
  if (d < 0) return 'pq-overdue-cell';
  if (d <= 14) return 'pq-danger-cell';
  if (d <= 60) return 'pq-warn-cell';
  return '';
}

interface Column<T> {
  label: string;
  key: string;
  align?: 'num';
  render?: (row: T) => React.ReactNode;
  className?: string | ((row: T) => string);
}

function QualityTable<T>({
  rows, sort, columns,
}: {
  rows: T[];
  sort: ReturnType<typeof useTableSort<T>>;
  columns: Column<T>[];
}) {
  const shown = sort.sortRows(rows);
  return (
    <div className="table-wrap pq-table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <SortTh key={c.key} col={c.key} label={c.label} sort={sort.sort} onSort={sort.toggle} className={c.align || ''} />
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map((row, i) => (
            <tr key={i}>
              {columns.map((c) => {
                const cls = [c.align, typeof c.className === 'function' ? c.className(row) : c.className].filter(Boolean).join(' ');
                return <td key={c.key} className={cls || undefined}>{c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '')}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface FlagMetric {
  label: string;
  value: number;
  color: string;
  /** Overrides `color` for the number/label text when it should differ from the bar/dot fill. */
  numberColor?: string;
  onClick?: () => void;
}

/**
 * Portfolio & Quality Check summary: a donut of `flags` (share of `totalProjects`,
 * remainder neutral) + the two largest flags called out beside it, a row of
 * `otherFlags` stat numbers, and a `timingBuckets` stacked bar below.
 * Fully data-driven -- adding/removing a metric needs no layout changes.
 */
function QualitySummary({
  totalProjects, flags, otherFlags, timingBuckets,
}: {
  totalProjects: number;
  flags: FlagMetric[];
  otherFlags: FlagMetric[];
  timingBuckets: FlagMetric[];
}) {
  let acc = 0;
  const donutStops = flags.map((f) => {
    const from = totalProjects ? (acc / totalProjects) * 100 : 0;
    acc += f.value;
    const to = totalProjects ? (acc / totalProjects) * 100 : 0;
    return `${f.color} ${from}% ${to}%`;
  });
  const remainderFrom = totalProjects ? (acc / totalProjects) * 100 : 0;
  donutStops.push(`#e3e6ea ${remainderFrom}% 100%`);
  const topFlags = [...flags].sort((a, b) => b.value - a.value).slice(0, 2);

  const trackedTotal = timingBuckets.reduce((s, b) => s + b.value, 0);

  return (
    <div className="pq-summary">
      <div className="pq-qc-row">
        <div className="pq-donut-block">
          <div className="pq-donut" style={{ background: `conic-gradient(${donutStops.join(',')})` }}>
            <div className="pq-donut-hole">
              <div className="pq-donut-total">{totalProjects}</div>
              <div className="pq-donut-total-label">Projects</div>
            </div>
          </div>
          <div>
            <div className="pq-summary-title">Quality Check</div>
            <div className="pq-donut-legend">
              {topFlags.map((f) => (
                <button key={f.label} type="button" className="pq-legend-item" onClick={f.onClick} disabled={!f.onClick}>
                  <span className="pq-legend-dot" style={{ background: f.color }} />
                  <span className="pq-legend-value">{f.value}</span>
                  <span className="pq-legend-label">{f.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="pq-other-flags">
          <div className="pq-summary-title">Other Flags</div>
          <div className="pq-other-flags-row">
            {otherFlags.map((f) => (
              <button key={f.label} type="button" className="pq-stat" onClick={f.onClick} disabled={!f.onClick}>
                <div className="pq-stat-value" style={{ color: f.color }}>{f.value}</div>
                <div className="pq-stat-label">{f.label}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="pq-summary-divider" />

      <div className="pq-timing-row">
        <div className="pq-summary-title">Timing — {trackedTotal} Tracked Projects</div>
        <div className="pq-timing-bar">
          {timingBuckets.map((b) => (
            <div
              key={b.label} className="pq-timing-seg"
              style={{ width: `${trackedTotal ? (b.value / trackedTotal) * 100 : 0}%`, background: b.color }}
              title={`${b.label}: ${b.value}`}
            />
          ))}
        </div>
        <div className="pq-timing-cols">
          {timingBuckets.map((b) => (
            <button
              key={b.label} type="button" className="pq-timing-col"
              style={{ width: `${trackedTotal ? (b.value / trackedTotal) * 100 : 0}%` }}
              onClick={b.onClick} disabled={!b.onClick}
            >
              <div className="pq-stat-value" style={{ color: b.numberColor ?? b.color }}>{b.value}</div>
              <div className="pq-stat-label">{b.label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
