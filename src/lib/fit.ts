import type { TasteProfile, FitResult } from '../store/types';

// ─── Tunable constants ────────────────────────────────────────────────────────

export const FIT_CONFIG = {
  lengthOverThreshold: 0.15,
} as const;

// ─── Candidate shape ──────────────────────────────────────────────────────────

export interface FitCandidate {
  type: 'book' | 'movie' | 'show';
  genres: string[];
  themes: string[];
  length: {
    pages?: number;
    runtimeMinutes?: number;
  };
  sourceRating?: number;
}

// ─── Genre normalisation & alias map ─────────────────────────────────────────

function normalise(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[-–—]/g, ' ')
    .replace(/[''']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Common equivalents across TMDB genres, Open Library subjects, and
 * user-typed preferences. Keys are post-normalise (lowercase, hyphens→space).
 * Add new pairs here whenever a source/vocabulary mismatch surfaces.
 */
export const GENRE_ALIASES: Record<string, string> = {
  // sci-fi cluster — canonical: 'sci fi' (what "sci-fi" becomes after normalise)
  'science fiction': 'sci fi',
  'scifi':           'sci fi',
  // children
  'children':        'kids',
  'childrens':       'kids',
  // rom-com
  'rom com':         'romance',
  'romantic comedy': 'romance',
  // non-fiction
  'nonfiction':      'non fiction',
};

/** Normalise then resolve through the alias map. Exported for use in Stats. */
export function resolveGenre(s: string): string {
  const n = normalise(s);
  return GENRE_ALIASES[n] ?? n;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function overlap(a: string[], b: string[]): string[] {
  const setB = new Set(b.map(resolveGenre));
  return a.filter(x => setB.has(resolveGenre(x)));
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Reason builder ───────────────────────────────────────────────────────────

function buildReason(
  verdict: FitResult['verdict'],
  candidate: FitCandidate,
  profile: TasteProfile,
  preferredHits: string[],
  avoidedGenreHits: string[],
  contentHits: string[],
): string {
  const neg: string[] = [];
  const pos: string[] = [];

  // Deal-breakers first
  if (avoidedGenreHits.length > 0) {
    const genres = avoidedGenreHits.join(' and ');
    neg.push(`${genres} ${avoidedGenreHits.length > 1 ? 'are' : 'is'} on your avoid list`);
  }
  if (contentHits.length > 0) {
    neg.push(`contains ${contentHits.join(', ')}, which you've marked to avoid`);
  }

  // Genre situation
  if (avoidedGenreHits.length === 0 && contentHits.length === 0) {
    if (preferredHits.length > 0) {
      const g = preferredHits.slice(0, 3).join(', ');
      const verb = preferredHits.length > 1 ? 'match' : 'matches';
      pos.push(`genre${preferredHits.length > 1 ? 's' : ''} (${g}) ${verb} your taste`);
    } else if (profile.preferredGenres.length > 0) {
      const shown = candidate.genres.slice(0, 3);
      const gStr = shown.length > 0 ? shown.join(', ') : 'no tagged genres';
      neg.push(`none of its genres (${gStr}) match your preferred list`);
    }
  }

  // Length
  if (candidate.type === 'book' && candidate.length.pages != null) {
    const pages = candidate.length.pages;
    const limit = profile.maxBookPages;
    if (pages > limit) {
      const over = (pages - limit) / limit;
      neg.push(`at ${pages} pages it's ${over > FIT_CONFIG.lengthOverThreshold ? 'well' : 'slightly'} over your ${limit}-page limit`);
    } else {
      pos.push(`${pages} pages fits your ${limit}-page limit`);
    }
  }
  if ((candidate.type === 'movie' || candidate.type === 'show') && candidate.length.runtimeMinutes != null) {
    const runtime = candidate.length.runtimeMinutes;
    const limit = profile.maxRuntimeMinutes;
    if (runtime > limit) {
      const over = (runtime - limit) / limit;
      neg.push(`${runtime}-min runtime is ${over > FIT_CONFIG.lengthOverThreshold ? 'well' : 'slightly'} over your ${limit}-min limit`);
    } else {
      pos.push(`${runtime}-min runtime fits your ${limit}-min limit`);
    }
  }

  // Rating
  if (candidate.sourceRating != null) {
    const r = candidate.sourceRating;
    const min = profile.minRating;
    if (r < min) {
      neg.push(`${r}/10 community score falls below your ${min}/10 minimum`);
    } else {
      pos.push(`${r}/10 community score clears your ${min}/10 minimum`);
    }
  }

  if (verdict === 'good') {
    if (pos.length === 0) return 'Meets all your criteria.';
    // Natural: "Genres (sci-fi) match your taste, 7.3/10 community score."
    if (pos.length === 1) return cap(pos[0]) + '.';
    const last = pos.pop()!;
    return cap(pos.join(', ') + ', and ' + last) + '.';
  }

  // partial or poor: lead with negatives, acknowledge positives if any
  if (neg.length > 0 && pos.length > 0) {
    const negStr = neg.join('; ');
    const posStr = pos.length === 1 ? pos[0] : pos.slice(0, 2).join(' and ');
    return cap(negStr) + ', though ' + posStr + '.';
  }
  if (neg.length > 0) {
    return cap(neg.join('; ')) + '.';
  }
  if (pos.length > 0) {
    return cap(pos.join(', ')) + '.';
  }
  return 'No clear signal against your criteria.';
}

// ─── Main function ────────────────────────────────────────────────────────────

export function evaluateFit(
  candidate: FitCandidate,
  profile: TasteProfile,
): FitResult {
  const matched: string[] = [];
  const conflicting: string[] = [];
  let forcesPoor = false;

  // ── Rule 1: Preferred genres ─────────────────────────────────────────────
  const preferredHits = profile.preferredGenres.length > 0
    ? overlap(candidate.genres, profile.preferredGenres)
    : [];
  if (profile.preferredGenres.length > 0) {
    if (preferredHits.length > 0) {
      matched.push(`Preferred genre${preferredHits.length > 1 ? 's' : ''}: ${preferredHits.join(', ')}`);
    } else {
      conflicting.push('No preferred genres matched');
    }
  }

  // ── Rule 2: Avoided genres (hard) ────────────────────────────────────────
  const avoidedGenreHits = overlap(candidate.genres, profile.avoidGenres);
  if (avoidedGenreHits.length > 0) {
    conflicting.push(`Avoided genre${avoidedGenreHits.length > 1 ? 's' : ''}: ${avoidedGenreHits.join(', ')}`);
    forcesPoor = true;
  }

  // ── Rule 3: Length ────────────────────────────────────────────────────────
  if (candidate.type === 'book' && candidate.length.pages != null) {
    const pages = candidate.length.pages;
    const limit = profile.maxBookPages;
    if (pages > limit) {
      const over = (pages - limit) / limit;
      conflicting.push(`Over your page limit — ${pages} pages (limit ${limit})`);
      if (over > FIT_CONFIG.lengthOverThreshold) forcesPoor = true;
    } else {
      matched.push(`Within your ${limit}-page limit`);
    }
  }

  if ((candidate.type === 'movie' || candidate.type === 'show') && candidate.length.runtimeMinutes != null) {
    const runtime = candidate.length.runtimeMinutes;
    const limit = profile.maxRuntimeMinutes;
    if (runtime > limit) {
      const over = (runtime - limit) / limit;
      conflicting.push(`Over your runtime limit — ${runtime} min (limit ${limit})`);
      if (over > FIT_CONFIG.lengthOverThreshold) forcesPoor = true;
    } else {
      matched.push(`Within your ${limit}-min runtime limit`);
    }
  }

  // ── Rule 4: Avoided content (hard, best-effort) ───────────────────────────
  let contentHits: string[] = [];
  if (profile.avoidContent.length > 0) {
    contentHits = overlap(candidate.themes, profile.avoidContent);
    if (contentHits.length > 0) {
      conflicting.push(`Avoided content: ${contentHits.join(', ')}`);
      forcesPoor = true;
    } else if (candidate.themes.length === 0) {
      matched.push('No content warnings found (metadata sparse — not a guarantee)');
    }
  }

  // ── Rule 5: Source rating (soft) ─────────────────────────────────────────
  if (candidate.sourceRating != null) {
    const r = candidate.sourceRating;
    const min = profile.minRating;
    if (r < min) {
      conflicting.push(`Rated ${r}/10, below your ${min}/10 minimum`);
    } else {
      matched.push(`Rated ${r}/10`);
    }
  }

  // ── Verdict ───────────────────────────────────────────────────────────────
  const verdict: FitResult['verdict'] = forcesPoor
    ? 'poor'
    : conflicting.length > 0
    ? 'partial'
    : 'good';

  const reason = buildReason(verdict, candidate, profile, preferredHits, avoidedGenreHits, contentHits);

  return { verdict, reason, matched, conflicting };
}
