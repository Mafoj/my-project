/**
 * Shared project-list filtering, ported from the original single-file app's
 * `mkFilters` / `applyMain`. Allocation rows use their own, simpler filter
 * shape (see tabs/Allocation.tsx) since they don't share the Project schema.
 */
import { useCallback, useState } from 'react';
import type { Project } from './types';

export interface MainFilters {
  search: string;
  tower: string[];
  pcOwnership: string[];
  pmName: string[];
  projectStatus: string[];
  bu: string[];
}

export const mkMainFilters = (): MainFilters => ({
  search: '',
  tower: [], pcOwnership: [], pmName: [],
  projectStatus: ['Initiation', 'On Hold', 'Ongoing'],
  bu: [],
});

// Columns the universal search looks across. Kept in one place so it's
// obvious what "search everything" actually means.
const SEARCHABLE_FIELDS: (keyof Project)[] = [
  'project_name', 'project_name_its', 'pm_name', 'project_status', 'tower', 'bu', 'comments',
];

export function applyMainFilters(projects: Project[], f: MainFilters): Project[] {
  // Multi-word AND: every word must appear somewhere among the row's
  // searchable columns, but not necessarily in the same column -- so
  // "fojtek ongoing" matches a row whose PM name has "Fojtek" and whose
  // status is "Ongoing".
  const words = f.search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return projects.filter((p) => {
    if (words.length) {
      const haystack = SEARCHABLE_FIELDS.map((k) => String(p[k] ?? '')).join(' ␟ ').toLowerCase();
      if (!words.every((w) => haystack.includes(w))) return false;
    }
    if (f.tower.length && !f.tower.includes(p.tower)) return false;
    if (f.pcOwnership.length && !f.pcOwnership.includes(p.pc_ownership)) return false;
    if (f.pmName.length && !f.pmName.includes(p.pm_name)) return false;
    if (f.projectStatus.length && !f.projectStatus.includes(p.project_status)) return false;
    if (f.bu.length && !f.bu.includes(p.bu)) return false;
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
