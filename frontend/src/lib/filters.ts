/**
 * Shared project-list filtering, ported from the original single-file app's
 * `mkFilters` / `applyMain`. Allocation rows use their own, simpler filter
 * shape (see tabs/Allocation.tsx) since they don't share the Project schema.
 */
import { useCallback, useState } from 'react';
import type { Project } from './types';
import { PROB_BUCKETS } from './types';

export interface MainFilters {
  search: string;
  searchITS: string;
  tower: string[];
  pcOwnership: string[];
  pmName: string[];
  projectStatus: string[];
  bu: string[];
  intExt: string[];
  bsoIo: string[];
  sy: string;
  ey: string;
  probBuckets: string[];
}

export const mkMainFilters = (): MainFilters => ({
  search: '', searchITS: '',
  tower: [], pcOwnership: [], pmName: [],
  projectStatus: ['Initiation', 'On Hold', 'Ongoing'],
  bu: [], intExt: [], bsoIo: [],
  sy: '', ey: '', probBuckets: [],
});

const startYear = (p: Project) => (p.start_date ? p.start_date.slice(0, 4) : '');
const endYear = (p: Project) => (p.end_date ? p.end_date.slice(0, 4) : '');

export function applyMainFilters(projects: Project[], f: MainFilters): Project[] {
  const q = f.search.trim().toLowerCase();
  const qITS = f.searchITS.trim().toLowerCase();
  return projects.filter((p) => {
    if (q && !p.project_name.toLowerCase().includes(q)) return false;
    if (qITS && !p.project_name_its.toLowerCase().includes(qITS)) return false;
    if (f.tower.length && !f.tower.includes(p.tower)) return false;
    if (f.pcOwnership.length && !f.pcOwnership.includes(p.pc_ownership)) return false;
    if (f.pmName.length && !f.pmName.includes(p.pm_name)) return false;
    if (f.projectStatus.length && !f.projectStatus.includes(p.project_status)) return false;
    if (f.bu.length && !f.bu.includes(p.bu)) return false;
    if (f.intExt.length && !f.intExt.includes(p.int_ext)) return false;
    if (f.bsoIo.length && !f.bsoIo.includes(p.bso_io)) return false;
    if (f.probBuckets.length) {
      const b = PROB_BUCKETS.find((b) => b.test(p.probability));
      if (!b || !f.probBuckets.includes(b.label)) return false;
    }
    if (f.sy && startYear(p) !== f.sy) return false;
    if (f.ey && endYear(p) !== f.ey) return false;
    return true;
  });
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Persisted state backed by localStorage. Plain-object values (filter sets)
 * are merged over the factory's defaults, so new fields added later still
 * get a default; primitives (numbers, booleans) are used as-is -- spreading
 * a primitive into an object literal silently produces `{}`, which is a
 * NaN/truthy trap once you do math or comparisons on it.
 */
export function usePersistedState<T>(key: string, factory: () => T) {
  const [state, _set] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return factory();
      const parsed = JSON.parse(raw);
      const base = factory();
      if (isPlainObject(base) && isPlainObject(parsed)) return { ...base, ...parsed } as T;
      // Type mismatch (e.g. a stale `{}` written by the old buggy merge logic
      // for a primitive value) -- discard it rather than propagate garbage.
      return typeof parsed === typeof base ? (parsed as T) : factory();
    } catch {
      return factory();
    }
  });

  const set = useCallback(
    (upd: T | ((prev: T) => T)) => {
      _set((prev) => {
        const next = typeof upd === 'function' ? (upd as (prev: T) => T)(prev) : upd;
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {
          /* storage unavailable; state still updates in-memory */
        }
        return next;
      });
    },
    [key],
  );

  return [state, set] as const;
}

/**
 * Per-tab filter state that can be overridden by a shared, cross-tab filter
 * set. The local state is always maintained (fixed hook order, fixed storage
 * key for this tab) — `sync` just decides which one the tab reads/writes.
 */
export function useTabFilters(
  tabId: string,
  sync: boolean,
  shared: MainFilters,
  setShared: (upd: MainFilters | ((prev: MainFilters) => MainFilters)) => void,
) {
  const [local, setLocal] = usePersistedState(`pipeline_filters_${tabId}`, mkMainFilters);
  return sync ? ([shared, setShared] as const) : ([local, setLocal] as const);
}
