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
  showBsoIo?: boolean;
  filtersSync: boolean;
  toggleFiltersSync: () => void;
}

const unique = (projects: Project[], key: keyof Project) =>
  [...new Set(projects.map((p) => String(p[key] || '')).filter(Boolean))].sort();

export function FilterBar({
  projects, filters, setFilters, nFiltered, nTotal, showBsoIo = false, filtersSync, toggleFiltersSync,
}: Props) {
  const opts = useMemo(() => ({
    tower: unique(projects, 'tower'),
    pcOwnership: unique(projects, 'pc_ownership'),
    pmName: unique(projects, 'pm_name'),
    projectStatus: unique(projects, 'project_status'),
    bu: unique(projects, 'bu'),
    intExt: unique(projects, 'int_ext'),
    bsoIo: unique(projects, 'bso_io'),
    sy: [...new Set(projects.map((p) => (p.start_date ? p.start_date.slice(0, 4) : '')).filter(Boolean))].sort(),
    ey: [...new Set(projects.map((p) => (p.end_date ? p.end_date.slice(0, 4) : '')).filter(Boolean))].sort(),
  }), [projects]);

  const set = <K extends keyof MainFilters>(k: K, v: MainFilters[K]) =>
    setFilters((f) => ({ ...f, [k]: v }));

  const msFields: [keyof MainFilters, string][] = [
    ['tower', 'Tower'], ['pcOwnership', 'PC Owner'], ['pmName', 'PM Name'],
    ['projectStatus', 'Status'], ['bu', 'BU'], ['intExt', 'Int/Ext'],
  ];
  if (showBsoIo) msFields.push(['bsoIo', 'BSO/IO']);

  return (
    <div className="filter-bar">
      <div className="filter-group" style={{ minWidth: 180 }}>
        <label>Project Name</label>
        <input
          type="text" className="filter-select" placeholder="Search…"
          value={filters.search} onChange={(e) => set('search', e.target.value)}
        />
      </div>
      <div className="filter-group" style={{ minWidth: 180 }}>
        <label>ITS1 Initiative</label>
        <input
          type="text" className="filter-select" placeholder="Search…"
          value={filters.searchITS} onChange={(e) => set('searchITS', e.target.value)}
        />
      </div>
      {msFields.map(([k, l]) => (
        <div key={k} className="filter-group">
          <label>{l}</label>
          <MultiSelect options={opts[k as keyof typeof opts] as string[]} value={filters[k] as string[]} onChange={(v) => set(k, v as MainFilters[typeof k])} />
        </div>
      ))}
      {(['sy', 'ey'] as const).map((k) => (
        <div key={k} className="filter-group">
          <label>{k === 'sy' ? 'Start Year' : 'End Year'}</label>
          <select className="filter-select" value={filters[k]} onChange={(e) => set(k, e.target.value)}>
            <option value="">All</option>
            {opts[k].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
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
