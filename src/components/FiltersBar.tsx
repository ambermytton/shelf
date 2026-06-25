import styles from './FiltersBar.module.css';
import FilterSelect from './FilterSelect';
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

const STATUS_OPTIONS = [
  { value: 'all',         label: 'All status' },
  { value: 'want',        label: 'Want to' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'finished',    label: 'Finished' },
];

const TYPE_OPTIONS = [
  { value: 'all',   label: 'All types' },
  { value: 'book',  label: 'Books' },
  { value: 'movie', label: 'Films' },
  { value: 'show',  label: 'Shows' },
];

const FIT_OPTIONS = [
  { value: 'all',     label: 'All fit' },
  { value: 'good',    label: 'Good fit' },
  { value: 'partial', label: 'Partial fit' },
  { value: 'poor',    label: 'Poor fit' },
];

const SORT_OPTIONS = [
  { value: 'status', label: 'Status' },
  { value: 'added',  label: 'Recently added' },
  { value: 'title',  label: 'Title A→Z' },
  { value: 'rating', label: 'Rating ↓' },
  { value: 'fit',    label: 'Fit' },
];

export default function FiltersBar({ filters, onChange, totalCount, filteredCount }: FiltersBarProps) {
  function set<K extends keyof Filters>(key: K, value: Filters[K]) {
    onChange({ ...filters, [key]: value });
  }

  const isFiltered =
    filters.status !== 'all' || filters.type !== 'all' || filters.fit !== 'all';

  return (
    <div className={styles.bar}>
      <FilterSelect
        options={STATUS_OPTIONS}
        value={filters.status}
        onChange={v => set('status', v as StatusFilter)}
        ariaLabel="Filter by status"
        active={filters.status !== 'all'}
      />
      <FilterSelect
        options={TYPE_OPTIONS}
        value={filters.type}
        onChange={v => set('type', v as TypeFilter)}
        ariaLabel="Filter by type"
        active={filters.type !== 'all'}
      />
      <FilterSelect
        options={FIT_OPTIONS}
        value={filters.fit}
        onChange={v => set('fit', v as FitFilter)}
        ariaLabel="Filter by fit"
        active={filters.fit !== 'all'}
      />

      <div className={styles.spacer} />

      {isFiltered && (
        <span className={styles.count}>{filteredCount} / {totalCount}</span>
      )}

      <div className={styles.divider} />

      <FilterSelect
        options={SORT_OPTIONS}
        value={filters.sort}
        onChange={v => set('sort', v as SortKey)}
        ariaLabel="Sort by"
      />
    </div>
  );
}
