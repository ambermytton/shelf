export type ItemType = 'book' | 'movie' | 'show';
export type ItemStatus = 'want' | 'in_progress' | 'finished';
export type FitVerdict = 'good' | 'partial' | 'poor';

export interface FitResult {
  verdict: FitVerdict;
  reason: string;
  matched: string[];
  conflicting: string[];
}

export interface ItemLength {
  pages?: number;           // books
  runtimeMinutes?: number;  // movies / shows
  seasons?: number;         // shows
  episodes?: number;        // shows
}

export interface ItemProgress {
  currentPage?: number;     // books
  season?: number;          // shows
  episode?: number;         // shows
}

export interface Item {
  id: string;
  type: ItemType;
  title: string;
  creator: string;
  year: number;
  coverUrl?: string;
  genres: string[];
  themes: string[];         // for avoidContent matching
  length: ItemLength;
  sourceRating?: number;    // 0–10 normalized
  status: ItemStatus;
  progress?: ItemProgress;
  fit?: FitResult;
  userRating?: number;      // 0–10 (one decimal), set when finished
  notes?: string;
  addedAt: string;          // ISO date
  finishedAt?: string;      // ISO date
  tmdbId?: number;          // stored at add-time; enables data refresh
  openLibraryKey?: string;  // stored at add-time; enables book refresh
}

export interface TasteProfile {
  preferredGenres: string[];
  avoidGenres: string[];
  maxBookPages: number;
  maxRuntimeMinutes: number;
  avoidContent: string[];
  minRating: number;        // 0–10
}

export interface Store {
  version: number;
  tasteProfile: TasteProfile;
  items: Item[];
}

// ─── Actions ────────────────────────────────────────────────────────────────

export type StoreAction =
  | { type: 'ADD_ITEM'; item: Item }
  | { type: 'UPDATE_ITEM'; id: string; patch: Partial<Item> }
  | { type: 'DELETE_ITEM'; id: string }
  | { type: 'SET_PROFILE'; profile: TasteProfile }
  | { type: 'IMPORT_STORE'; store: Store };
