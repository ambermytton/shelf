import { normaliseTmdb } from './rating';
import type { ItemType } from '../store/types';

// ─── Shared result shape ──────────────────────────────────────────────────────

export interface SearchResult {
  // display
  title: string;
  creator: string;
  year: number;
  coverUrl?: string;
  type: ItemType;
  // fit evaluation
  genres: string[];
  themes: string[];
  length: { pages?: number; runtimeMinutes?: number; seasons?: number; episodes?: number };
  sourceRating?: number;
  // source identifiers for detail fetch at add-time
  _openLibraryKey?: string;
  _tmdbId?: number;
  _tmdbMediaType?: 'movie' | 'tv';
}

// ─── Genre normalisation ──────────────────────────────────────────────────────
// TMDB uses title-cased names; profiles use lowercase plain strings.
// This table bridges common cases. Unmapped genres fall through as lowercase.

const TMDB_GENRE_MAP: Record<string, string> = {
  'Science Fiction': 'sci-fi',
  'Science fiction': 'sci-fi',
  'Action & Adventure': 'action',
  'Sci-Fi & Fantasy': 'sci-fi',
  'War & Politics': 'war',
};

function normaliseGenre(raw: string): string {
  return TMDB_GENRE_MAP[raw] ?? raw.toLowerCase();
}

// ─── TMDB genre cache ─────────────────────────────────────────────────────────

let genreCache: Record<number, string> | null = null;

async function getTmdbGenres(apiKey: string): Promise<Record<number, string>> {
  if (genreCache) return genreCache;
  const [movieRes, tvRes] = await Promise.all([
    fetch(`https://api.themoviedb.org/3/genre/movie/list?api_key=${apiKey}`),
    fetch(`https://api.themoviedb.org/3/genre/tv/list?api_key=${apiKey}`),
  ]);
  const [movieData, tvData] = await Promise.all([movieRes.json(), tvRes.json()]);
  const map: Record<number, string> = {};
  for (const g of [...(movieData.genres ?? []), ...(tvData.genres ?? [])]) {
    map[g.id] = normaliseGenre(g.name);
  }
  genreCache = map;
  return map;
}

// ─── Open Library ─────────────────────────────────────────────────────────────

export async function searchBooks(query: string): Promise<SearchResult[]> {
  const res = await fetch(
    `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=12&fields=key,title,author_name,first_publish_year,cover_i,subject,number_of_pages_median`
  );
  if (!res.ok) throw new Error('Open Library search failed');
  const data = await res.json();

  return (data.docs ?? []).slice(0, 12).map((doc: Record<string, unknown>) => {
    const coverId = doc.cover_i as number | undefined;
    const subjects = (doc.subject as string[] | undefined) ?? [];

    // Subjects double as genres — take the first few, lowercased
    const genres = subjects.slice(0, 8).map((s: string) => s.toLowerCase());

    return {
      title: (doc.title as string) ?? 'Unknown',
      creator: ((doc.author_name as string[]) ?? [])[0] ?? 'Unknown',
      year: (doc.first_publish_year as number) ?? 0,
      coverUrl: coverId
        ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
        : undefined,
      type: 'book' as const,
      genres,
      themes: [], // Open Library has no structured theme/content data
      length: { pages: (doc.number_of_pages_median as number) ?? undefined },
      sourceRating: undefined,
      _openLibraryKey: doc.key as string,
    };
  });
}

// ─── TMDB ─────────────────────────────────────────────────────────────────────

function getTmdbKey(): string {
  const key = import.meta.env.VITE_TMDB_API_KEY;
  if (!key) throw new Error('TMDB_KEY_MISSING');
  return key;
}

function tmdbCoverUrl(path: string | null | undefined): string | undefined {
  return path ? `https://image.tmdb.org/t/p/w500${path}` : undefined;
}

function tmdbYear(dateStr: string | undefined): number {
  if (!dateStr) return 0;
  return parseInt(dateStr.slice(0, 4), 10) || 0;
}

export async function searchMovies(query: string): Promise<SearchResult[]> {
  const key = getTmdbKey();
  const genres = await getTmdbGenres(key);

  const res = await fetch(
    `https://api.themoviedb.org/3/search/movie?api_key=${key}&query=${encodeURIComponent(query)}&page=1`
  );
  if (!res.ok) throw new Error('TMDB movie search failed');
  const data = await res.json();

  return (data.results ?? []).slice(0, 12).map((m: Record<string, unknown>) => ({
    title: (m.title as string) ?? 'Unknown',
    creator: '', // director not returned by search — fetched on add
    year: tmdbYear(m.release_date as string),
    coverUrl: tmdbCoverUrl(m.poster_path as string),
    type: 'movie' as const,
    genres: ((m.genre_ids as number[]) ?? []).map(id => genres[id]).filter(Boolean),
    themes: [],
    length: { runtimeMinutes: undefined }, // fetched on add
    sourceRating: m.vote_average ? normaliseTmdb(m.vote_average as number) : undefined,
    _tmdbId: m.id as number,
    _tmdbMediaType: 'movie' as const,
  }));
}

export async function searchShows(query: string): Promise<SearchResult[]> {
  const key = getTmdbKey();
  const genres = await getTmdbGenres(key);

  const res = await fetch(
    `https://api.themoviedb.org/3/search/tv?api_key=${key}&query=${encodeURIComponent(query)}&page=1`
  );
  if (!res.ok) throw new Error('TMDB TV search failed');
  const data = await res.json();

  return (data.results ?? []).slice(0, 12).map((s: Record<string, unknown>) => ({
    title: (s.name as string) ?? 'Unknown',
    creator: '', // creator not in search results
    year: tmdbYear(s.first_air_date as string),
    coverUrl: tmdbCoverUrl(s.poster_path as string),
    type: 'show' as const,
    genres: ((s.genre_ids as number[]) ?? []).map(id => genres[id]).filter(Boolean),
    themes: [],
    length: {
      seasons: (s.number_of_seasons as number) ?? undefined,
      episodes: (s.number_of_episodes as number) ?? undefined,
    },
    sourceRating: s.vote_average ? normaliseTmdb(s.vote_average as number) : undefined,
    _tmdbId: s.id as number,
    _tmdbMediaType: 'tv' as const,
  }));
}

export async function searchAll(query: string): Promise<SearchResult[]> {
  const results = await Promise.allSettled([
    searchBooks(query),
    searchMovies(query).catch(e => {
      if ((e as Error).message === 'TMDB_KEY_MISSING') return [];
      throw e;
    }),
    searchShows(query).catch(e => {
      if ((e as Error).message === 'TMDB_KEY_MISSING') return [];
      throw e;
    }),
  ]);

  return results.flatMap(r => (r.status === 'fulfilled' ? r.value : []));
}

export async function search(
  query: string,
  type: ItemType | 'all',
): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  if (type === 'book') return searchBooks(query);
  if (type === 'movie') return searchMovies(query);
  if (type === 'show') return searchShows(query);
  return searchAll(query);
}

// ─── Detail fetch (called at add-time) ───────────────────────────────────────
// Enriches a search result with runtime, keywords, director — things not in
// the search endpoint.

export async function fetchDetail(result: SearchResult): Promise<Partial<SearchResult>> {
  if (result.type === 'book') return {}; // Open Library has no useful detail endpoint for our needs

  const key = getTmdbKey();
  const id = result._tmdbId;
  if (!id) return {};

  if (result.type === 'movie') {
    const [detail, credits, keywords] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${key}`).then(r => r.json()),
      fetch(`https://api.themoviedb.org/3/movie/${id}/credits?api_key=${key}`).then(r => r.json()),
      fetch(`https://api.themoviedb.org/3/movie/${id}/keywords?api_key=${key}`).then(r => r.json()),
    ]);
    const director = (credits.crew ?? []).find((c: Record<string, unknown>) => c.job === 'Director');
    const kwNames: string[] = (keywords.keywords ?? []).map((k: Record<string, unknown>) => (k.name as string).toLowerCase());
    return {
      creator: director ? (director.name as string) : '',
      length: { runtimeMinutes: detail.runtime ?? undefined },
      themes: kwNames,
    };
  }

  if (result.type === 'show') {
    const [detail, keywords] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${key}`).then(r => r.json()),
      fetch(`https://api.themoviedb.org/3/tv/${id}/keywords?api_key=${key}`).then(r => r.json()),
    ]);
    const creator = ((detail.created_by ?? []) as Record<string, unknown>[])[0];
    const kwNames: string[] = (keywords.results ?? []).map((k: Record<string, unknown>) => (k.name as string).toLowerCase());
    const epRuntime = (detail.episode_run_time as number[] | undefined)?.[0];
    return {
      creator: creator ? (creator.name as string) : '',
      length: {
        seasons: detail.number_of_seasons ?? undefined,
        episodes: detail.number_of_episodes ?? undefined,
        runtimeMinutes: epRuntime,
      },
      themes: kwNames,
    };
  }

  return {};
}
