import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import MosaicGrid from '../components/MosaicGrid';
import ItemDetailPanel from '../components/ItemDetailPanel';
import FiltersBar, { type Filters } from '../components/FiltersBar';
import { useStore } from '../store/useStore';
import { filterAndSort } from '../lib/filterSort';
import { EXAMPLE_ITEMS } from '../_fixtures/example-items';
import { SAMPLE_ITEMS, SAMPLE_IDS } from '../_fixtures/sampleItems';
import type { Item } from '../store/types';
import styles from './Library.module.css';

const SAMPLES_KEY = 'shelf_samples_v1';

const QUOTE_FILLERS = [
  { id: 'q1', type: 'quote' as const, text: 'So many books, so little time.', attribution: 'Frank Zappa' },
  { id: 'q2', type: 'quote' as const, text: 'A reader lives a thousand lives before he dies.', attribution: 'George R.R. Martin' },
  { id: 'q3', type: 'quote' as const, text: 'We are all stories, in the end.', attribution: 'The Doctor' },
  { id: 'q4', type: 'quote' as const, text: 'We read to know we are not alone.', attribution: 'C.S. Lewis' },
];

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
  const { store, addItem, deleteItem } = useStore();
  const [searchParams] = useSearchParams();
  const isDemo = searchParams.has('demo');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [sampleIds, setSampleIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(SAMPLES_KEY) ?? '[]'); } catch { return []; }
  });

  const samplesActive = sampleIds.length > 0 && store.items.some(i => sampleIds.includes(i.id));

  function populateSamples() {
    SAMPLE_ITEMS.forEach(item => addItem(item));
    localStorage.setItem(SAMPLES_KEY, JSON.stringify(SAMPLE_IDS));
    setSampleIds(SAMPLE_IDS);
  }

  function clearSamples() {
    sampleIds.forEach(id => deleteItem(id));
    localStorage.removeItem(SAMPLES_KEY);
    setSampleIds([]);
  }
  // Derive live from store so panel reflects updates (e.g. after TMDB refresh)
  const selectedItem = selectedItemId ? (store.items.find(i => i.id === selectedItemId) ?? null) : null;

  const showFirstRun = !isDemo && isProfileEmpty(store.tasteProfile) && store.items.length === 0;

  const filteredItems = filterAndSort(store.items, filters);
  const gridItems = isDemo
    ? (EXAMPLE_ITEMS as ReturnType<typeof itemToGridProps>[])
    : [...filteredItems.map(itemToGridProps), ...(samplesActive ? QUOTE_FILLERS : [])];

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

      {showFilters && (
        <FiltersBar
          filters={filters}
          onChange={setFilters}
          totalCount={store.items.length}
          filteredCount={filteredItems.length}
        />
      )}

      {samplesActive && (
        <div className={styles.samplesBanner}>
          showing sample data
          <button className={styles.clearSamplesBtn} onClick={clearSamples}>
            clear examples
          </button>
        </div>
      )}

      {!isDemo && store.items.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.cornerHints}>
            {showFirstRun && (
              <Link to="/settings" className={styles.cornerHint}>
                Set up taste profile for custom verdicts →
              </Link>
            )}
            <Link to="/add" className={styles.cornerHint}>
              Add your first title →
            </Link>
          </div>
          <div className={styles.spinBorderWrap}>
            <div className={styles.populateSection}>
              <p className={styles.populateHint}>
                A shelf with no books is just furniture.<br />
                <button className={styles.populateInline} onClick={populateSamples}>
                  click here to see examples
                </button>
              </p>
            </div>
          </div>
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
