import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import { search, fetchDetail } from '../lib/api';
import type { SearchResult } from '../lib/api';
import { evaluateFit } from '../lib/fit';
import { useStore } from '../store/useStore';
import type { ItemStatus, Item, FitResult } from '../store/types';
import SearchResultCard from '../components/SearchResultCard';
import styles from './AddSearch.module.css';

type FilterType = 'all' | 'book' | 'movie' | 'show';

const FILTER_LABELS: Record<FilterType, string> = {
  all: 'All',
  book: 'Books',
  movie: 'Films',
  show: 'Shows',
};

const TMDB_MISSING =
  'TMDB API key not set — movie and show results are unavailable. Add VITE_TMDB_API_KEY to your .env file.';

export default function AddSearch() {
  const { store, addItem } = useStore();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [fits, setFits] = useState<Record<string, FitResult>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the input on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  const runSearch = useCallback(
    async (q: string, f: FilterType) => {
      if (!q.trim()) { setResults([]); setFits({}); setError(null); return; }
      setLoading(true);
      setError(null);
      try {
        const res = await search(q, f === 'all' ? 'all' : f);
        setResults(res);

        // Compute fit for each result immediately using search-level data
        const fitMap: Record<string, FitResult> = {};
        res.forEach((r, i) => {
          const key = resultKey(r, i);
          fitMap[key] = evaluateFit(
            { type: r.type, genres: r.genres, themes: r.themes, length: r.length, sourceRating: r.sourceRating },
            store.tasteProfile,
          );
        });
        setFits(fitMap);
      } catch (e) {
        const msg = (e as Error).message;
        if (msg === 'TMDB_KEY_MISSING') setError(TMDB_MISSING);
        else setError(`Search failed: ${msg}`);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [store.tasteProfile],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query, filter), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, filter, runSearch]);

  async function handleAdd(result: SearchResult, index: number, status: ItemStatus) {
    const key = resultKey(result, index);
    setAddingId(key);
    try {
      // Fetch richer detail (runtime, director, keywords) at add-time
      const detail = await fetchDetail(result).catch(() => ({}));
      const enriched: SearchResult = { ...result, ...detail };

      // Re-run fit with enriched themes
      const fit = evaluateFit(
        { type: enriched.type, genres: enriched.genres, themes: enriched.themes, length: enriched.length, sourceRating: enriched.sourceRating },
        store.tasteProfile,
      );

      const now = new Date().toISOString();
      const item: Item = {
        id: uuid(),
        type: enriched.type,
        title: enriched.title,
        creator: enriched.creator,
        year: enriched.year,
        coverUrl: enriched.coverUrl,
        genres: enriched.genres,
        themes: enriched.themes,
        length: enriched.length,
        sourceRating: enriched.sourceRating,
        status,
        fit,
        addedAt: now,
        finishedAt: status === 'finished' ? now : undefined,
        tmdbId: enriched._tmdbId,
        openLibraryKey: enriched._openLibraryKey,
      };

      addItem(item);
      setAddedIds(prev => new Set(prev).add(key));

      // After a short delay, navigate home
      setTimeout(() => navigate('/'), 800);
    } catch (e) {
      alert(`Failed to add item: ${(e as Error).message}`);
    } finally {
      setAddingId(null);
    }
  }

  const hasTmdbKey = !!import.meta.env.VITE_TMDB_API_KEY;

  return (
    <main className={styles.page}>
      {/* Search bar */}
      <div className={styles.searchBar}>
        <input
          ref={inputRef}
          className={styles.input}
          type="search"
          placeholder="Search books, films, shows…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          aria-label="Search"
        />
      </div>

      {/* Type filter tabs */}
      <div className={styles.tabs} role="tablist">
        {(Object.keys(FILTER_LABELS) as FilterType[]).map(f => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            className={`${styles.tab} ${filter === f ? styles.tabActive : ''}`}
            onClick={() => setFilter(f)}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      {/* TMDB key missing warning */}
      {!hasTmdbKey && (filter === 'all' || filter === 'movie' || filter === 'show') && (
        <p className={styles.warning}>{TMDB_MISSING}</p>
      )}

      {/* States */}
      {loading && <p className={styles.status}>Searching…</p>}

      {error && !loading && (
        <p className={styles.errorMsg}>{error}</p>
      )}

      {!loading && !error && query.trim() && results.length === 0 && (
        <p className={styles.status}>No results for "{query}"</p>
      )}

      {!loading && results.length > 0 && (
        <ul className={styles.results} role="list">
          {results.map((result, i) => {
            const key = resultKey(result, i);
            return (
              <li key={key}>
                <SearchResultCard
                  result={result}
                  fit={fits[key]}
                  onAdd={status => handleAdd(result, i, status)}
                  adding={addingId === key}
                  added={addedIds.has(key)}
                />
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

function resultKey(r: SearchResult, i: number): string {
  // Stable key from source identifiers or fallback to index
  if (r._tmdbId) return `tmdb-${r._tmdbId}`;
  if (r._openLibraryKey) return `ol-${r._openLibraryKey}`;
  return `idx-${i}`;
}
