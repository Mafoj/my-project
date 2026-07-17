import { useCallback, useState } from 'react';

export interface SortState {
  col: string;
  dir: 'asc' | 'desc';
}

/** Generic client-side table sort, ported from the original single-file app. */
export function useTableSort<T>(initCol: string, initDir: SortState['dir'] = 'asc') {
  const [sort, setSort] = useState<SortState>({ col: initCol, dir: initDir });

  const toggle = useCallback((col: string) => {
    setSort((s) => (s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' }));
  }, []);

  const sortRows = useCallback(
    (rows: T[]) => {
      const { col, dir } = sort;
      return [...rows].sort((a, b) => {
        const av = (a as Record<string, unknown>)[col];
        const bv = (b as Record<string, unknown>)[col];
        let cmp: number;
        if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
        else cmp = String(av ?? '').localeCompare(String(bv ?? ''));
        return dir === 'asc' ? cmp : -cmp;
      });
    },
    [sort],
  );

  return { sort, toggle, sortRows };
}
