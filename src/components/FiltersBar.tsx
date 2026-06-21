import styles from './FiltersBar.module.css';
import type { ItemStatus, ItemType, FitVerdict } from '../store/types';

export type StatusFilter = 'all' | ItemStatus;
export type TypeFilter = 'all' | ItemType;
export type FitFilter = 'all' | FitVerdict;
export type SortKey = 'status' | 'added' | 'title' | 'rating' | 'fit';

export interface Filters {
  status: StatusFilter;
  type: TypeFilter;
  fit: FitFilter;
  sort: SortKey;
}

interface FiltersBarProps {
  filters: Filters;
  onChange: (f: Filters) => void;
  totalCount: number;
  filteredCount: number;
}

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All status' },
  { value: 'want', label: 'Want to' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'finished', label: 'Finished' },
];

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'All types' },
  { value: 'book', label: 'Books' },
  { value: 'movie', label: 'Films' },
  { value: 'show', label: 'Shows' },
];

const FIT_OPTIONS: { value: FitFilter; label: string }[] = [
  { value: 'all', label: 'All fit' },
  { value: 'good', label: 'Good fit' },
  { value: 'partial', label: 'Partial fit' },
  { value: 'poor', label: 'Poor fit' },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'status', label: 'Status' },
  { value: 'added', label: 'Recently added' },
  { value: 'title', label: 'Title A→Z' },
  { value: 'rating', label: 'Rating ↓' },
  { value: 'fit', label: 'Fit' },
];

export default function FiltersBar({ filters, onChange, totalCount, filteredCount }: FiltersBarProps) {
  function set<K extends keyof Filters>(key: K, value: Filters[K]) {
    onChange({ ...filters, [key]: value });
  }

  const isFiltered =
    filters.status !== 'all' || filters.type !== 'all' || filters.fit !== 'all';

  return (
    <div className={styles.bar}>
      <select
        className={`${styles.select} ${filters.status !== 'all' ? styles.selectActive : ''}`}
        value={filters.status}
        onChange={e => set('status', e.target.value as StatusFilter)}
        aria-label="Filter by status"
      >
        {STATUS_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <select
        className={`${styles.select} ${filters.type !== 'all' ? styles.selectActive : ''}`}
        value={filters.type}
        onChange={e => set('type', e.target.value as TypeFilter)}
        aria-label="Filter by type"
      >
        {TYPE_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <select
        className={`${styles.select} ${filters.fit !== 'all' ? styles.selectActive : ''}`}
        value={filters.fit}
        onChange={e => set('fit', e.target.value as FitFilter)}
        aria-label="Filter by fit"
      >
        {FIT_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <div className={styles.spacer} />

      {isFiltered && (
        <span className={styles.count}>{filteredCount} / {totalCount}</span>
      )}

      <div className={styles.divider} />

      <select
        className={styles.select}
        value={filters.sort}
        onChange={e => set('sort', e.target.value as SortKey)}
        aria-label="Sort by"
      >
        {SORT_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
