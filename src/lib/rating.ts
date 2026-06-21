// All source ratings normalised to 0–10 so minRating and userRating are comparable.

// TMDB vote_average is already 0–10
export function normaliseTmdb(vote: number): number {
  return Math.round(vote * 10) / 10;
}

// Open Library doesn't expose a usable aggregate rating — return undefined.
// If they ever do, normalise here.
export function normaliseOpenLibrary(_raw: unknown): number | undefined {
  return undefined;
}
