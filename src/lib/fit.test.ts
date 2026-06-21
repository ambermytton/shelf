import { describe, it, expect } from 'vitest';
import { evaluateFit, FIT_CONFIG } from './fit';
import type { FitCandidate } from './fit';
import type { TasteProfile } from '../store/types';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const BASE_PROFILE: TasteProfile = {
  preferredGenres: ['sci-fi', 'literary fiction'],
  avoidGenres: ['horror'],
  maxBookPages: 450,
  maxRuntimeMinutes: 150,
  avoidContent: ['graphic violence'],
  minRating: 7.0,
};

const BOOK: FitCandidate = {
  type: 'book',
  genres: ['sci-fi'],
  themes: [],
  length: { pages: 320 },
  sourceRating: 8.5,
};

const MOVIE: FitCandidate = {
  type: 'movie',
  genres: ['drama'],
  themes: [],
  length: { runtimeMinutes: 130 },
  sourceRating: 7.5,
};

// ─── Rule 1: Preferred genres ─────────────────────────────────────────────────

describe('Rule 1 — preferred genres', () => {
  it('good: candidate matches a preferred genre', () => {
    const result = evaluateFit(BOOK, BASE_PROFILE);
    expect(result.verdict).toBe('good');
    expect(result.matched.some(m => m.includes('sci-fi'))).toBe(true);
  });

  it('partial: no preferred genre matched (soft conflict)', () => {
    const candidate: FitCandidate = { ...BOOK, genres: ['romance'] };
    const result = evaluateFit(candidate, BASE_PROFILE);
    expect(result.verdict).toBe('partial');
    expect(result.conflicting.some(c => c.includes('No preferred genres'))).toBe(true);
  });

  it('no penalty when preferredGenres list is empty', () => {
    const profile = { ...BASE_PROFILE, preferredGenres: [] };
    const candidate: FitCandidate = { ...BOOK, genres: ['romance'] };
    const result = evaluateFit(candidate, profile);
    // Only rating check remains — sourceRating 8.5 >= 7.0 so should be good
    expect(result.verdict).toBe('good');
  });
});

// ─── Rule 2: Avoided genres (hard) ───────────────────────────────────────────

describe('Rule 2 — avoided genres (hard)', () => {
  it('poor: candidate is in avoidGenres', () => {
    const candidate: FitCandidate = { ...BOOK, genres: ['horror'] };
    const result = evaluateFit(candidate, BASE_PROFILE);
    expect(result.verdict).toBe('poor');
    expect(result.conflicting.some(c => c.includes('horror'))).toBe(true);
  });

  it('poor even if a preferred genre also matches', () => {
    const candidate: FitCandidate = { ...BOOK, genres: ['sci-fi', 'horror'] };
    const result = evaluateFit(candidate, BASE_PROFILE);
    expect(result.verdict).toBe('poor');
  });

  it('good: avoided genre not present', () => {
    const result = evaluateFit(BOOK, BASE_PROFILE); // sci-fi only
    expect(result.verdict).toBe('good');
  });
});

// ─── Rule 3: Length ───────────────────────────────────────────────────────────

describe('Rule 3 — length', () => {
  const threshold = FIT_CONFIG.lengthOverThreshold;

  it('good: book within page limit', () => {
    const result = evaluateFit(BOOK, BASE_PROFILE); // 320 <= 450
    expect(result.matched.some(m => m.includes('page limit'))).toBe(true);
  });

  it(`partial: book ≤${threshold * 100}% over page limit`, () => {
    // 450 * 1.15 = 517.5 → 510 pages = 13.3% over → partial
    const candidate: FitCandidate = { ...BOOK, genres: ['sci-fi'], length: { pages: 510 } };
    const result = evaluateFit(candidate, BASE_PROFILE);
    expect(result.verdict).toBe('partial');
    expect(result.conflicting.some(c => c.includes('page limit'))).toBe(true);
  });

  it(`poor: book >${threshold * 100}% over page limit`, () => {
    // 450 * 1.15 = 517.5 → 600 pages = 33% over → poor
    const candidate: FitCandidate = { ...BOOK, genres: ['sci-fi'], length: { pages: 600 } };
    const result = evaluateFit(candidate, BASE_PROFILE);
    expect(result.verdict).toBe('poor');
  });

  it('good: movie within runtime limit', () => {
    const result = evaluateFit(MOVIE, { ...BASE_PROFILE, preferredGenres: [] }); // 130 <= 150
    expect(result.matched.some(m => m.includes('runtime limit'))).toBe(true);
  });

  it('partial: movie slightly over runtime limit', () => {
    // 150 * 1.15 = 172.5 → 165 min = 10% over → partial
    const candidate: FitCandidate = { ...MOVIE, length: { runtimeMinutes: 165 } };
    const profile = { ...BASE_PROFILE, preferredGenres: [] };
    const result = evaluateFit(candidate, profile);
    expect(result.verdict).toBe('partial');
  });

  it('poor: movie well over runtime limit', () => {
    // 150 * 1.15 = 172.5 → 200 min = 33% over → poor
    const candidate: FitCandidate = { ...MOVIE, length: { runtimeMinutes: 200 } };
    const profile = { ...BASE_PROFILE, preferredGenres: [] };
    const result = evaluateFit(candidate, profile);
    expect(result.verdict).toBe('poor');
  });

  it('no length penalty when length data is absent', () => {
    const candidate: FitCandidate = { ...BOOK, genres: ['sci-fi'], length: {} };
    const result = evaluateFit(candidate, BASE_PROFILE);
    expect(result.verdict).toBe('good');
  });
});

// ─── Rule 4: Avoided content (hard, best-effort) ─────────────────────────────

describe('Rule 4 — avoided content', () => {
  it('poor: theme matches avoidContent', () => {
    const candidate: FitCandidate = {
      ...BOOK,
      genres: ['sci-fi'],
      themes: ['graphic violence', 'war'],
    };
    const result = evaluateFit(candidate, BASE_PROFILE);
    expect(result.verdict).toBe('poor');
    expect(result.conflicting.some(c => c.includes('graphic violence'))).toBe(true);
  });

  it('silent when theme list is non-empty but no avoidContent hit', () => {
    const candidate: FitCandidate = {
      ...BOOK,
      genres: ['sci-fi'],
      themes: ['war', 'space travel'],
    };
    const result = evaluateFit(candidate, BASE_PROFILE);
    // No avoided content hit → no conflicting entry about content
    expect(result.conflicting.some(c => c.toLowerCase().includes('content'))).toBe(false);
  });

  it('notes metadata uncertainty when themes list is empty and avoidContent is set', () => {
    const candidate: FitCandidate = { ...BOOK, genres: ['sci-fi'], themes: [] };
    const result = evaluateFit(candidate, BASE_PROFILE);
    expect(result.matched.some(m => m.includes('not a guarantee'))).toBe(true);
  });

  it('no content check performed when avoidContent list is empty', () => {
    const profile = { ...BASE_PROFILE, avoidContent: [] };
    const candidate: FitCandidate = {
      ...BOOK,
      genres: ['sci-fi'],
      themes: ['graphic violence'],
    };
    const result = evaluateFit(candidate, profile);
    expect(result.verdict).toBe('good');
  });
});

// ─── Rule 5: Source rating (soft) ────────────────────────────────────────────

describe('Rule 5 — source rating', () => {
  it('good: rating at or above minimum', () => {
    const result = evaluateFit(BOOK, BASE_PROFILE); // 8.5 >= 7.0
    expect(result.matched.some(m => m.includes('8.5/10'))).toBe(true);
  });

  it('partial: rating below minimum (soft — not poor)', () => {
    const candidate: FitCandidate = { ...BOOK, genres: ['sci-fi'], sourceRating: 5.0 };
    const result = evaluateFit(candidate, BASE_PROFILE);
    expect(result.verdict).toBe('partial');
    expect(result.conflicting.some(c => c.includes('5/10'))).toBe(true);
  });

  it('no rating penalty when sourceRating is absent', () => {
    const candidate: FitCandidate = { ...BOOK, genres: ['sci-fi'], sourceRating: undefined };
    const result = evaluateFit(candidate, BASE_PROFILE);
    expect(result.verdict).toBe('good');
  });

  it('rating alone does not force poor, only partial', () => {
    const candidate: FitCandidate = { ...BOOK, genres: ['sci-fi'], sourceRating: 3.0 };
    const result = evaluateFit(candidate, BASE_PROFILE);
    expect(result.verdict).not.toBe('poor');
    expect(result.verdict).toBe('partial');
  });
});

// ─── Verdict combinations ─────────────────────────────────────────────────────

describe('verdict combinations', () => {
  it('avoided genre overrides a low rating → poor (not just partial)', () => {
    const candidate: FitCandidate = {
      ...BOOK,
      genres: ['horror'],
      sourceRating: 4.0,
    };
    const result = evaluateFit(candidate, BASE_PROFILE);
    expect(result.verdict).toBe('poor');
  });

  it('avoided genre overrides a length-over-partial → poor', () => {
    // 510 pages would be partial for length, but horror forces poor
    const candidate: FitCandidate = {
      type: 'book',
      genres: ['horror'],
      themes: [],
      length: { pages: 510 },
      sourceRating: 8.0,
    };
    const result = evaluateFit(candidate, BASE_PROFILE);
    expect(result.verdict).toBe('poor');
  });

  it('multiple soft conflicts → partial (not poor)', () => {
    // No preferred genre match + rating below minimum
    const candidate: FitCandidate = {
      ...MOVIE,
      genres: ['romance'],
      sourceRating: 5.0,
    };
    const profile = { ...BASE_PROFILE, avoidGenres: [] };
    const result = evaluateFit(candidate, profile);
    expect(result.verdict).toBe('partial');
  });

  it('reason string is non-empty for all verdicts', () => {
    const good = evaluateFit(BOOK, BASE_PROFILE);
    expect(good.reason.length).toBeGreaterThan(0);

    const partial = evaluateFit({ ...BOOK, genres: ['romance'] }, BASE_PROFILE);
    expect(partial.reason.length).toBeGreaterThan(0);

    const poor = evaluateFit({ ...BOOK, genres: ['horror'] }, BASE_PROFILE);
    expect(poor.reason.length).toBeGreaterThan(0);
  });
});

// ─── Empty profile (no opinions) ─────────────────────────────────────────────

describe('empty profile', () => {
  const emptyProfile: TasteProfile = {
    preferredGenres: [],
    avoidGenres: [],
    maxBookPages: 600,
    maxRuntimeMinutes: 180,
    avoidContent: [],
    minRating: 0,
  };

  it('good for any candidate when profile has no restrictions', () => {
    const result = evaluateFit(BOOK, emptyProfile);
    expect(result.verdict).toBe('good');
  });
});
