import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import MosaicGrid from '../components/MosaicGrid';
import ItemDetailPanel from '../components/ItemDetailPanel';
import FiltersBar, { type Filters } from '../components/FiltersBar';
import { useStore } from '../store/useStore';
import { filterAndSort } from '../lib/filterSort';
import { EXAMPLE_ITEMS } from '../_fixtures/example-items';
import type { Item } from '../store/types';
import styles from './Library.module.css';

const DEFAULT_FILTERS: Filters = {
  status: 'all',
  type: 'all',
  fit: 'all',
  sort: 'status',
};

function isProfileEmpty(p: { preferredGenres: string[]; avoidGenres: string[]; avoidContent: string[] }) {
  return p.preferredGenres.length === 0 && p.avoidGenres.length === 0 && p.avoidContent.length === 0;
}

function itemToGridProps(item: Item) {
  return {
    id: item.id,
    title: item.title,
    creator: item.creator,
    year: item.year,
    coverUrl: item.coverUrl,
    type: item.type,
    status: item.status,
    fitVerdict: item.fit?.verdict,
    progress: (() => {
      if (item.status !== 'in_progress' || !item.progress) return undefined;
      if (item.type === 'book' && item.length.pages && item.progress.currentPage) {
        return Math.round((item.progress.currentPage / item.length.pages) * 100);
      }
      if (item.type === 'show' && item.progress.season && item.progress.episode &&
          item.length.seasons && item.length.episodes) {
        const avg = item.length.episodes / item.length.seasons;
        const watched = (item.progress.season - 1) * avg + item.progress.episode;
        return Math.min(99, Math.round((watched / item.length.episodes) * 100));
      }
      return undefined;
    })(),
    progressLabel: (() => {
      if (item.type === 'book' && item.progress?.currentPage && item.length.pages) {
        const pct = Math.round((item.progress.currentPage / item.length.pages) * 100);
        return `p.${item.progress.currentPage} of ${item.length.pages} · ${pct}%`;
      }
      if (item.type === 'show' && item.progress?.season && item.progress?.episode) {
        const s = item.progress.season;
        const e = item.progress.episode;
        if (item.length.seasons && item.length.episodes) {
          const avg = item.length.episodes / item.length.seasons;
          const watched = (s - 1) * avg + e;
          const pct = Math.min(99, Math.round((watched / item.length.episodes) * 100));
          return `S${s} E${e} · ${pct}%`;
        }
        return `S${s} E${e}`;
      }
      return undefined;
    })(),
    userRating: item.userRating,
  };
}

export default function Library() {
  const { store } = useStore();
  const [searchParams] = useSearchParams();
  const isDemo = searchParams.has('demo');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  // Derive live from store so panel reflects updates (e.g. after TMDB refresh)
  const selectedItem = selectedItemId ? (store.items.find(i => i.id === selectedItemId) ?? null) : null;

  const showFirstRun = !isDemo && isProfileEmpty(store.tasteProfile) && store.items.length === 0;

  const filteredItems = filterAndSort(store.items, filters);
  const gridItems = isDemo
    ? (EXAMPLE_ITEMS as ReturnType<typeof itemToGridProps>[])
    : filteredItems.map(itemToGridProps);

  const showFilters = !isDemo && store.items.length > 0;

  function handleCardClick(id: string) {
    if (isDemo) return;
    setSelectedItemId(id);
  }

  return (
    <main className={styles.page}>
      {isDemo && (
        <div className={styles.demoBanner}>
          Demo mode —{' '}
          <Link to="/" className={styles.demoExit}>exit</Link>
        </div>
      )}

      {showFirstRun && (
        <div className={styles.firstRun}>
          <p className={styles.firstRunText}>
            Set up your taste profile to get fit verdicts as you add titles.
          </p>
          <Link to="/settings" className={styles.firstRunLink}>
            Set up profile →
          </Link>
        </div>
      )}

      {showFilters && (
        <FiltersBar
          filters={filters}
          onChange={setFilters}
          totalCount={store.items.length}
          filteredCount={filteredItems.length}
        />
      )}

      {!isDemo && store.items.length === 0 && !showFirstRun && (
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>Your shelf is empty.</p>
          <Link to="/add" className={styles.emptyLink}>Add your first title →</Link>
        </div>
      )}

      {!isDemo && store.items.length > 0 && filteredItems.length === 0 && (
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>No titles match these filters.</p>
          <button
            className={styles.emptyLink}
            onClick={() => setFilters(DEFAULT_FILTERS)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            Clear filters
          </button>
        </div>
      )}

      <MosaicGrid items={gridItems} onCardClick={handleCardClick} />

      {selectedItem && (
        <ItemDetailPanel
          item={selectedItem}
          onClose={() => setSelectedItemId(null)}
        />
      )}
    </main>
  );
}
