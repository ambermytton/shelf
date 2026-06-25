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
  { id: 'q1', type: 'quote' as const, text: 'Get busy living, or get busy dying.', attribution: 'The Shawshank Redemption' },
  { id: 'q2', type: 'quote' as const, text: 'So many books, so little time.', attribution: 'Frank Zappa' },
  { id: 'q3', type: 'quote' as const, text: 'I am the one who knocks.', attribution: 'Breaking Bad' },
  { id: 'q4', type: 'quote' as const, text: 'A reader lives a thousand lives before he dies.', attribution: 'George R.R. Martin' },
  { id: 'q5', type: 'quote' as const, text: 'Not today.', attribution: 'Game of Thrones' },
];

type QuoteItem = (typeof QUOTE_FILLERS)[number];

function weaveQuotes<T extends { id: string; type: string }>(items: T[], quotes: QuoteItem[]): (T | QuoteItem)[] {
  if (!quotes.length || !items.length) return items;
  // Spanning items (books 1×2, movies 2×1) go first so the dense algorithm
  // fills their orphan gaps with show cards before reaching any quote card.
  const spanning = items.filter(i => i.type === 'book' || i.type === 'movie');
  const singles  = items.filter(i => i.type !== 'book' && i.type !== 'movie');
  const n = quotes.length;
  const len = singles.length;
  // floor((i+1)*len/(n+1)) gives perfectly even positions in the singles array,
  // guaranteeing at least floor(len/(n+1)) items between every two quotes.
  const positions = quotes.map((_, i) => Math.floor((i + 1) * len / (n + 1)));
  const mixed: (T | QuoteItem)[] = [...singles];
  for (let i = n - 1; i >= 0; i--) {
    mixed.splice(positions[i], 0, quotes[i]);
  }
  return [...spanning, ...mixed];
}

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
  const baseItems = filteredItems.map(itemToGridProps);
  const gridItems = isDemo
    ? (EXAMPLE_ITEMS as ReturnType<typeof itemToGridProps>[])
    : (samplesActive ? weaveQuotes(baseItems, QUOTE_FILLERS) : baseItems);

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
