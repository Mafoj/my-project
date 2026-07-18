import { useMemo } from 'react';
import { FilterBar } from '../components/FilterBar';
import { SortTh } from '../components/SortTh';
import { fmtEur, fmtPct } from '../lib/format';
import { STATUS_COLORS } from '../lib/constants';
import { applyMainFilters, type MainFilters } from '../lib/filters';
import { useTableSort } from '../lib/useTableSort';
import type { Project } from '../lib/types';

interface Props {
  projects: Project[];
  filters: MainFilters;
  setFilters: (upd: MainFilters | ((prev: MainFilters) => MainFilters)) => void;
  filtersSync: boolean;
  toggleFiltersSync: () => void;
  hideFilters: boolean;
  onRowClick: (p: Project) => void;
}

const COLUMNS: { label: string; key: keyof Project; align?: 'num' | 'nowrap' }[] = [
  { label: 'Project Name', key: 'project_name' },
  { label: 'ITS1 Name', key: 'project_name_its' },
  { label: 'PM Name', key: 'pm_name' },
  { label: 'Status', key: 'project_status' },
  { label: 'Tower', key: 'tower' },
  { label: 'PC Owner', key: 'pc_ownership' },
  { label: 'Int/Ext', key: 'int_ext' },
  { label: 'Start', key: 'start_date', align: 'nowrap' },
  { label: 'End', key: 'end_date', align: 'nowrap' },
  { label: 'BU', key: 'bu' },
  { label: 'Value 2026', key: 'value_2026', align: 'num' },
];

export function ProjectList({ projects, filters, setFilters, filtersSync, toggleFiltersSync, hideFilters, onRowClick }: Props) {
  const filtered = applyMainFilters(projects, filters);
  const { sort, toggle, sortRows } = useTableSort<Record<string, unknown>>('project_name', 'asc');
  const shown = useMemo(() => sortRows(filtered as unknown as Record<string, unknown>[]).slice(0, 300) as unknown as Project[], [filtered, sortRows]);

  return (
    <div className="page">
      {!hideFilters && (
        <FilterBar
          projects={projects} filters={filters} setFilters={setFilters}
          nFiltered={filtered.length} nTotal={projects.length}
          filtersSync={filtersSync} toggleFiltersSync={toggleFiltersSync}
        />
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {COLUMNS.map((c) => (
                <SortTh key={c.key} col={c.key} label={c.label} sort={sort} onSort={toggle} className={c.align || ''} />
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((p, i) => (
              <tr key={`${p.project_name}-${i}`} className="clickable-row" onClick={() => onRowClick(p)}>
                <td>{p.project_name}</td>
                <td>{p.project_name_its}</td>
                <td>{p.pm_name}</td>
                <td><span className="badge" style={{ background: STATUS_COLORS[p.project_status] || '#94a3b8' }}>{p.project_status || '—'}</span></td>
                <td>{p.tower}</td>
                <td>{p.pc_ownership}</td>
                <td>{p.int_ext}</td>
                <td className="nowrap">{p.start_date}</td>
                <td className="nowrap">{p.end_date}</td>
                <td>{p.bu}</td>
                <td className="num"><ValueCell project={p} /></td>
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

function ValueCell({ project }: { project: Project }) {
  if (!project.value_2026) return null;
  if (project.value_2026 === project.value_weighted_2026) return <>{fmtEur(project.value_2026)}</>;
  return (
    <div className="value-cell">
      <div>{fmtEur(project.value_2026)} <span className="value-cell-prob">({fmtPct(project.probability)})</span></div>
      <div className="value-cell-weighted">{fmtEur(project.value_weighted_2026)} weighted</div>
    </div>
  );
}
