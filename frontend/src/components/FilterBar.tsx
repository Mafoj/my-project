import { useMemo } from 'react';
import { MultiSelect } from './MultiSelect';
import { mkMainFilters, type MainFilters } from '../lib/filters';
import type { Project } from '../lib/types';

interface Props {
  projects: Project[];
  filters: MainFilters;
  setFilters: (upd: MainFilters | ((prev: MainFilters) => MainFilters)) => void;
  nFiltered: number;
  nTotal: number;
  filtersSync: boolean;
  toggleFiltersSync: () => void;
}

const unique = (projects: Project[], key: keyof Project) =>
  [...new Set(projects.map((p) => String(p[key] || '')).filter(Boolean))].sort();

const MS_FIELDS: [keyof MainFilters, string][] = [
  ['tower', 'Tower'], ['pcOwnership', 'PC Owner'], ['pmName', 'PM Name'],
  ['projectStatus', 'Status'], ['bu', 'BU'],
];

export function FilterBar({
  projects, filters, setFilters, nFiltered, nTotal, filtersSync, toggleFiltersSync,
}: Props) {
  const opts = useMemo(() => ({
    tower: unique(projects, 'tower'),
    pcOwnership: unique(projects, 'pc_ownership'),
    pmName: unique(projects, 'pm_name'),
    projectStatus: unique(projects, 'project_status'),
    bu: unique(projects, 'bu'),
  }), [projects]);

  const set = <K extends keyof MainFilters>(k: K, v: MainFilters[K]) =>
    setFilters((f) => ({ ...f, [k]: v }));

  return (
    <div className="filter-bar">
      <div className="filter-group filter-group-search">
        <label>Search everything</label>
        <input
          type="text" className="filter-select" placeholder="Search project name, ITS1 name, PM, status, tower, BU, comments…"
          value={filters.search} onChange={(e) => set('search', e.target.value)}
        />
      </div>
      {MS_FIELDS.map(([k, l]) => (
        <div key={k} className="filter-group">
          <label>{l}</label>
          <MultiSelect options={opts[k as keyof typeof opts]} value={filters[k] as string[]} onChange={(v) => set(k, v as MainFilters[typeof k])} />
        </div>
      ))}
      <div className="filter-actions">
        <span className="count-chip">{nFiltered} / {nTotal}</span>
        <button type="button" className="clear-btn" onClick={() => setFilters(mkMainFilters())}>Clear</button>
        <button
          type="button" onClick={toggleFiltersSync}
          className={`clear-btn sync-btn${filtersSync ? ' active' : ''}`}
          title={filtersSync ? 'Filters are synced across tabs — click to use independent filters' : 'Click to sync these filters across tabs'}
        >
          {filtersSync ? 'Synced' : 'Sync tabs'}
        </button>
      </div>
    </div>
  );
}
