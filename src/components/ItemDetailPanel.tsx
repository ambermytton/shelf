import { useState, useEffect, useRef, useCallback } from 'react';
import { evaluateFit } from '../lib/fit';
import { normaliseTmdb } from '../lib/rating';
import { useStore } from '../store/useStore';
import { useAccentColor } from '../hooks/useAccentColor';
import type { Item, ItemStatus } from '../store/types';
import styles from './ItemDetailPanel.module.css';

interface Props {
  item: Item;
  onClose: () => void;
}

const STATUS_META: { value: ItemStatus; label: string }[] = [
  { value: 'want',        label: 'Want to'     },
  { value: 'in_progress', label: 'In progress' },
  { value: 'finished',    label: 'Finished'    },
];

const VERDICT_LABEL = { good: 'Good fit', partial: 'Partial fit', poor: 'Poor fit' };

const TMDB_IMG = (path: string) => `https://image.tmdb.org/t/p/w500${path}`;

export default function ItemDetailPanel({ item, onClose }: Props) {
  const { updateItem, deleteItem, store } = useStore();
  const panelRef = useRef<HTMLDivElement>(null);
  const accentColor = useAccentColor(item.coverUrl);

  const [status, setStatus]           = useState<ItemStatus>(item.status);
  const [currentPage, setCurrentPage] = useState(item.progress?.currentPage ?? 0);
  const [season, setSeason]           = useState(item.progress?.season ?? 1);
  const [episode, setEpisode]         = useState(item.progress?.episode ?? 1);
  const [userRating, setUserRating]   = useState(item.userRating ?? 0);
  const [notes, setNotes]             = useState(item.notes ?? '');
  const [fit, setFit]                 = useState(item.fit);
  const [dirty, setDirty]             = useState(false);
  const [refreshing, setRefreshing]   = useState(false);

  // Focus trap + Escape
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const focusable = () => Array.from(
      panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    );
    setTimeout(() => focusable()[0]?.focus(), 50);
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;
      const els = focusable();
      const first = els[0], last = els[els.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function mark<T>(setter: (v: T) => void) {
    return (v: T) => { setter(v); setDirty(true); };
  }

  function handleSave() {
    const patch: Partial<Item> = { status, notes: notes.trim() || undefined, fit };
    if (status === 'in_progress') {
      if (item.type === 'book') {
        patch.progress = { currentPage };
      }
      if (item.type === 'show') {
        // Clamp season to known total; episode can't exceed reasonable limits
        const maxSeason = item.length.seasons ?? Infinity;
        const clampedSeason = Math.max(1, Math.min(season, maxSeason));
        patch.progress = { season: clampedSeason, episode: Math.max(1, episode) };
      }
    } else {
      patch.progress = undefined;
    }
    if (status === 'finished') {
      patch.userRating = userRating || undefined;
      patch.finishedAt = item.finishedAt ?? new Date().toISOString();
    } else {
      patch.userRating = undefined;
      patch.finishedAt = undefined;
    }
    updateItem(item.id, patch);
    setDirty(false);
    onClose();
  }

  async function handleRefresh() {
    if (item.type === 'book') {
      setRefreshing(true);
      try {
        const q = encodeURIComponent(item.title);
        const a = encodeURIComponent(item.creator);
        const data = await fetch(
          `https://openlibrary.org/search.json?title=${q}&author=${a}&limit=1&fields=cover_i,first_publish_year,number_of_pages_median`
        ).then(r => r.json());
        const doc = data.docs?.[0];
        if (!doc) return;
        const patch: Partial<Item> = {};
        if (doc.cover_i) patch.coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
        if (doc.first_publish_year && !item.year) patch.year = doc.first_publish_year;
        if (doc.number_of_pages_median && !item.length.pages) patch.length = { ...item.length, pages: doc.number_of_pages_median };
        if (Object.keys(patch).length) updateItem(item.id, patch);
      } catch { /* silently fail */ }
      finally { setRefreshing(false); }
      return;
    }

    const apiKey = import.meta.env.VITE_TMDB_API_KEY;
    if (!apiKey || (item.type !== 'movie' && item.type !== 'show')) return;
    setRefreshing(true);
    try {
      const mediaType = item.type === 'movie' ? 'movie' : 'tv';

      // Resolve TMDB ID — use stored one if present, otherwise search by title
      let tmdbId = item.tmdbId;
      if (!tmdbId) {
        const searchUrl = `https://api.themoviedb.org/3/search/${mediaType}?api_key=${apiKey}&query=${encodeURIComponent(item.title)}${item.year ? `&year=${item.year}` : ''}`;
        const searchData = await fetch(searchUrl).then(r => r.json());
        const first = searchData.results?.[0];
        if (!first) return;
        tmdbId = first.id as number;
        // Persist for future refreshes
        updateItem(item.id, { tmdbId });
      }

      const [detail, credits, keywords] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${apiKey}`).then(r => r.json()),
        item.type === 'movie'
          ? fetch(`https://api.themoviedb.org/3/movie/${tmdbId}/credits?api_key=${apiKey}`).then(r => r.json())
          : Promise.resolve(null),
        fetch(`https://api.themoviedb.org/3/${mediaType}/${tmdbId}/keywords?api_key=${apiKey}`).then(r => r.json()),
      ]);

      const patch: Partial<Item> = {
        coverUrl: detail.poster_path ? TMDB_IMG(detail.poster_path) : item.coverUrl,
        sourceRating: detail.vote_average ? normaliseTmdb(detail.vote_average) : item.sourceRating,
        genres: (detail.genres ?? []).map((g: { name: string }) => {
          const name = g.name;
          const map: Record<string, string> = { 'Science Fiction': 'sci-fi', 'Sci-Fi & Fantasy': 'sci-fi', 'Action & Adventure': 'action', 'War & Politics': 'war' };
          return (map[name] ?? name.toLowerCase());
        }),
        themes: ((item.type === 'movie' ? keywords.keywords : keywords.results) ?? []).map((k: { name: string }) => k.name.toLowerCase()),
      };

      if (item.type === 'movie') {
        const director = ((credits?.crew ?? []) as { job: string; name: string }[]).find(c => c.job === 'Director');
        patch.creator = director?.name ?? item.creator;
        patch.title = detail.title ?? item.title;
        patch.year = detail.release_date ? parseInt(detail.release_date.slice(0, 4), 10) : item.year;
        patch.length = { runtimeMinutes: detail.runtime ?? item.length.runtimeMinutes };
      } else {
        const creator = (detail.created_by ?? [])[0] as { name: string } | undefined;
        patch.creator = creator?.name ?? item.creator;
        patch.title = detail.name ?? item.title;
        patch.year = detail.first_air_date ? parseInt(detail.first_air_date.slice(0, 4), 10) : item.year;
        patch.length = {
          seasons: detail.number_of_seasons ?? item.length.seasons,
          episodes: detail.number_of_episodes ?? item.length.episodes,
          runtimeMinutes: (detail.episode_run_time as number[] | undefined)?.[0] ?? item.length.runtimeMinutes,
        };
      }

      updateItem(item.id, patch);
    } catch {
      // silently fail — stale data is better than crashing
    } finally {
      setRefreshing(false);
    }
  }

  function handleRecheck() {
    const newFit = evaluateFit(
      { type: item.type, genres: item.genres, themes: item.themes, length: item.length, sourceRating: item.sourceRating },
      store.tasteProfile,
    );
    setFit(newFit);
    setDirty(true);
  }

  function handleDelete() {
    if (confirm(`Remove "${item.title}" from your shelf?`)) {
      deleteItem(item.id);
      onClose();
    }
  }

  const totalPages  = item.length.pages;
  const progressPct = item.type === 'book' && totalPages && currentPage
    ? Math.round((currentPage / totalPages) * 100)
    : null;

  // Show progress percentage (rough estimate via average episodes/season)
  const showProgressPct = (() => {
    if (item.type !== 'show' || !item.length.seasons || !item.length.episodes) return null;
    const avg = item.length.episodes / item.length.seasons;
    const watched = (season - 1) * avg + episode;
    return Math.min(99, Math.round((watched / item.length.episodes) * 100));
  })();

  const thumbClass = styles[item.type as keyof typeof styles] ?? '';
  const canRefresh = item.type === 'book' || !!(import.meta.env.VITE_TMDB_API_KEY && (item.type === 'movie' || item.type === 'show'));

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} aria-hidden />

      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal
        aria-label={item.title}
        style={accentColor ? { '--panel-accent': accentColor } as React.CSSProperties : undefined}
      >
        {/* ── Hero header ── */}
        <div className={styles.hero}>
          {item.coverUrl && (
            <img src={item.coverUrl} alt="" className={styles.heroBg} aria-hidden />
          )}
          <div className={styles.heroOverlay} />

          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
          </button>

          {canRefresh && (
            <button
              className={styles.refreshBtn}
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label={item.type === 'book' ? 'Refresh data from Open Library' : 'Refresh data from TMDB'}
              title={item.type === 'book' ? 'Pull fresh data from Open Library' : 'Pull fresh data from TMDB'}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: refreshing ? 'rotate(360deg)' : 'none', transition: 'transform 0.6s linear' }}>
                <path d="M10 6A4 4 0 1 1 6 2a4 4 0 0 1 2.83 1.17L10 4M10 1v3H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}

          <div className={styles.heroContent}>
            {item.coverUrl && (
              <img src={item.coverUrl} alt="" className={`${styles.thumb} ${thumbClass}`} />
            )}
            <div className={styles.heroInfo}>
              <p className={styles.itemTitle}>{item.title}</p>
              <p className={styles.itemMeta}>
                {item.creator}{item.year ? ` · ${item.year}` : ''}
              </p>
              {item.sourceRating !== undefined && (
                <p className={styles.sourceRating}>
                  <span className={styles.sourceRatingLabel}>
                    {item.type === 'book' ? 'Community' : 'TMDB'}
                  </span>
                  {item.sourceRating.toFixed(1)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className={styles.body}>

          {/* Status segmented control */}
          <section className={styles.section}>
            <p className={styles.label}>Status</p>
            <div className={styles.segmented} role="group" aria-label="Status">
              {STATUS_META.map(s => (
                <button
                  key={s.value}
                  className={`${styles.segBtn} ${status === s.value ? styles.segActive : ''}`}
                  onClick={() => mark(setStatus)(s.value)}
                  aria-pressed={status === s.value}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </section>

          {/* Progress — book */}
          {status === 'in_progress' && item.type === 'book' && totalPages && (
            <section className={styles.section}>
              <p className={styles.label}>Progress</p>
              <div className={styles.progressRow}>
                <span className={styles.progressHint}>Page</span>
                <input
                  type="number"
                  className={styles.numInput}
                  min={0}
                  max={totalPages}
                  value={currentPage || ''}
                  placeholder="0"
                  onChange={e => mark(setCurrentPage)(Number(e.target.value))}
                />
                <span className={styles.progressHint}>of {totalPages}</span>
                {progressPct !== null && (
                  <span className={styles.progressPct}>{progressPct}%</span>
                )}
              </div>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: `${progressPct ?? 0}%` }} />
              </div>
            </section>
          )}

          {/* Progress — show */}
          {status === 'in_progress' && item.type === 'show' && (
            <section className={styles.section}>
              <p className={styles.label}>Progress</p>
              <div className={styles.progressRow}>
                <span className={styles.progressHint}>Season</span>
                <input
                  type="number"
                  className={styles.numInput}
                  min={1}
                  max={item.length.seasons || undefined}
                  value={season || ''}
                  placeholder="1"
                  onChange={e => mark(setSeason)(Number(e.target.value))}
                />
                {item.length.seasons && (
                  <span className={styles.progressHint}>of {item.length.seasons}</span>
                )}
                <span className={styles.progressHint}>Ep.</span>
                <input
                  type="number"
                  className={styles.numInput}
                  min={1}
                  value={episode || ''}
                  placeholder="1"
                  onChange={e => mark(setEpisode)(Number(e.target.value))}
                />
                {showProgressPct !== null && (
                  <span className={styles.progressPct}>{showProgressPct}%</span>
                )}
              </div>
              {showProgressPct !== null && (
                <div className={styles.progressTrack}>
                  <div className={styles.progressFill} style={{ width: `${showProgressPct}%` }} />
                </div>
              )}
            </section>
          )}

          {/* Rating */}
          {status === 'finished' && (
            <section className={styles.section}>
              <p className={styles.label}>Your rating</p>
              <RatingMeter value={userRating} onChange={mark(setUserRating)} />
            </section>
          )}

          {/* Notes */}
          <section className={styles.section}>
            <p className={styles.label}>Notes</p>
            <textarea
              className={styles.textarea}
              rows={3}
              placeholder="Thoughts, quotes, things to remember…"
              value={notes}
              onChange={e => mark(setNotes)(e.target.value)}
            />
          </section>

          {/* Fit block */}
          {fit && (
            <section className={styles.section}>
              <div className={styles.fitBlock} data-verdict={fit.verdict}>
                <div className={styles.fitHeader}>
                  <div className={styles.fitVerdict}>
                    <span className={styles.fitDot} data-verdict={fit.verdict} />
                    {VERDICT_LABEL[fit.verdict]}
                  </div>
                  <button className={styles.recheckBtn} onClick={handleRecheck} type="button">
                    Re-check
                  </button>
                </div>
                <p className={styles.fitReason}>{fit.reason}</p>
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button className={styles.deleteBtn} onClick={handleDelete} type="button">
            Remove
          </button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={!dirty}>
            Save changes
          </button>
        </div>
      </div>
    </>
  );
}

// ── Glowing star rating meter (0–10, one decimal) ────────────────────────────

function scoreToStar(score: number): { size: number; filter: string; opacity: number } {
  if (score <= 0) return { size: 26, filter: 'none', opacity: 0.22 };
  const t  = Math.min(1, score / 10);
  const size  = Math.round(26 + t * 22);               // 26 → 48px
  const r1    = Math.round(2  + t * 12);               // inner glow radius
  const r2    = Math.round(4  + t * 18);               // outer glow radius
  const alpha = (0.45 + t * 0.50).toFixed(2);          // 0.45 → 0.95
  return {
    size,
    filter: `drop-shadow(0 0 ${r1}px rgba(240, 192, 48, ${alpha})) drop-shadow(0 0 ${r2}px rgba(255, 215, 60, 0.40))`,
    opacity: 1,
  };
}

function RatingMeter({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [inputVal, setInputVal] = useState(value > 0 ? String(value) : '');

  useEffect(() => {
    setInputVal(value > 0 ? String(value) : '');
  }, [value]);

  const commit = useCallback((raw: string) => {
    const num = parseFloat(raw);
    if (raw === '' || isNaN(num)) { setInputVal(''); onChange(0); }
    else {
      const clamped = Math.min(10, Math.max(0, Math.round(num * 10) / 10));
      setInputVal(String(clamped));
      onChange(clamped);
    }
  }, [onChange]);

  function step(delta: number) {
    const next = Math.min(10, Math.max(0, Math.round((value + delta) * 10) / 10));
    onChange(next);
    setInputVal(next > 0 ? String(next) : '');
  }

  const star = scoreToStar(value);

  return (
    <div className={styles.ratingMeter}>
      <button
        type="button"
        className={styles.ratingStepBtn}
        onClick={() => step(-1)}
        disabled={value <= 0}
        aria-label="Decrease rating"
      >−</button>

      <input
        type="number"
        className={styles.ratingInput}
        value={inputVal}
        onChange={e => {
          setInputVal(e.target.value);
          const n = parseFloat(e.target.value);
          if (!isNaN(n) && n >= 0 && n <= 10) onChange(Math.round(n * 10) / 10);
        }}
        onBlur={e => commit(e.target.value)}
        min="0"
        max="10"
        step="0.1"
        placeholder="—"
        aria-label="Rating out of 10"
      />

      <button
        type="button"
        className={styles.ratingStepBtn}
        onClick={() => step(1)}
        disabled={value >= 10}
        aria-label="Increase rating"
      >+</button>

      <svg
        className={`${styles.star} ${value > 0 ? styles.starActive : ''}`}
        width={star.size}
        height={star.size}
        viewBox="0 0 24 24"
        style={{ filter: star.filter, opacity: star.opacity } as React.CSSProperties}
        aria-hidden
      >
        <path
          d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          fill="#f0c030"
        />
      </svg>

      <span className={styles.ratingValue}>
        {value > 0 ? `${value} / 10` : '— / 10'}
      </span>
    </div>
  );
}
