import type { SortState } from '../lib/useTableSort';

interface Props {
  col: string;
  label: string;
  sort: SortState;
  onSort: (col: string) => void;
  className?: string;
}

export function SortTh({ col, label, sort, onSort, className = '' }: Props) {
  const active = sort.col === col;
  return (
    <th className={`sortable${className ? ` ${className}` : ''}`} onClick={() => onSort(col)}>
      {label}
      <span className={`sort-caret${active ? ' active' : ''}`}>
        {active ? (sort.dir === 'asc' ? '▲' : '▼') : '⇅'}
      </span>
    </th>
  );
}
