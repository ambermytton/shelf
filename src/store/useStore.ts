import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
  createElement,
} from 'react';
import type { Store, StoreAction, Item, TasteProfile } from './types';

// ─── Defaults ────────────────────────────────────────────────────────────────

export const DEFAULT_PROFILE: TasteProfile = {
  preferredGenres: [],
  avoidGenres: [],
  maxBookPages: 600,
  maxRuntimeMinutes: 180,
  avoidContent: [],
  minRating: 6.0,
};

const EMPTY_STORE: Store = {
  version: 2,
  tasteProfile: DEFAULT_PROFILE,
  items: [],
};

const LS_KEY = 'shelf_store_v1';

// ─── Reducer ─────────────────────────────────────────────────────────────────

function reducer(state: Store, action: StoreAction): Store {
  switch (action.type) {
    case 'ADD_ITEM':
      return { ...state, items: [action.item, ...state.items] };

    case 'UPDATE_ITEM':
      return {
        ...state,
        items: state.items.map(it =>
          it.id === action.id ? { ...it, ...action.patch } : it
        ),
      };

    case 'DELETE_ITEM':
      return { ...state, items: state.items.filter(it => it.id !== action.id) };

    case 'SET_PROFILE':
      return { ...state, tasteProfile: action.profile };

    case 'IMPORT_STORE':
      return migrateStore(action.store);

    default:
      return state;
  }
}

// ─── Seed hydration ───────────────────────────────────────────────────────────

// Fills in missing profile fields; migrates ratings from the 0–5 era (version <2) back to 0–10.
function migrateStore(raw: Store): Store {
  const needsRatingScale = (raw.version ?? 1) < 2;
  return {
    ...EMPTY_STORE,
    ...raw,
    version: 2,
    tasteProfile: { ...DEFAULT_PROFILE, ...raw.tasteProfile },
    items: (raw.items ?? []).map(item => ({
      ...item,
      userRating: needsRatingScale && item.userRating !== undefined
        ? item.userRating * 2
        : item.userRating,
    })),
  };
}

async function loadInitialStore(): Promise<Store> {
  const raw = localStorage.getItem(LS_KEY);
  if (raw) {
    try {
      return migrateStore(JSON.parse(raw) as Store);
    } catch {
      // corrupted — fall through to seed
    }
  }
  try {
    const res = await fetch('/seed-data.json');
    const seed = migrateStore((await res.json()) as Store);
    localStorage.setItem(LS_KEY, JSON.stringify(seed));
    return seed;
  } catch {
    localStorage.setItem(LS_KEY, JSON.stringify(EMPTY_STORE));
    return EMPTY_STORE;
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface StoreContextValue {
  store: Store;
  dispatch: React.Dispatch<StoreAction>;
  // convenience helpers
  addItem: (item: Item) => void;
  updateItem: (id: string, patch: Partial<Item>) => void;
  deleteItem: (id: string) => void;
  setProfile: (profile: TasteProfile) => void;
  exportStore: () => void;
  importStore: (file: File) => Promise<void>;
  clearStore: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

interface StoreProviderProps {
  children: ReactNode;
  initialStore?: Store; // injected by the provider after async load
}

function StoreProviderInner({ children, initialStore }: StoreProviderProps) {
  const [store, dispatch] = useReducer(reducer, initialStore ?? EMPTY_STORE);

  // Write-through on every change
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(store));
  }, [store]);

  const addItem    = useCallback((item: Item) => dispatch({ type: 'ADD_ITEM', item }), []);
  const updateItem = useCallback((id: string, patch: Partial<Item>) => dispatch({ type: 'UPDATE_ITEM', id, patch }), []);
  const deleteItem = useCallback((id: string) => dispatch({ type: 'DELETE_ITEM', id }), []);
  const setProfile = useCallback((profile: TasteProfile) => dispatch({ type: 'SET_PROFILE', profile }), []);

  const exportStore = useCallback(() => {
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shelf-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [store]);

  const importStore = useCallback(async (file: File) => {
    const text = await file.text();
    const parsed = JSON.parse(text) as Store;
    dispatch({ type: 'IMPORT_STORE', store: parsed });
  }, []);

  const clearStore = useCallback(() => {
    localStorage.removeItem(LS_KEY);
    dispatch({ type: 'IMPORT_STORE', store: EMPTY_STORE });
  }, []);

  return createElement(
    StoreContext.Provider,
    { value: { store, dispatch, addItem, updateItem, deleteItem, setProfile, exportStore, importStore, clearStore } },
    children
  );
}

// ─── Async bootstrap wrapper ──────────────────────────────────────────────────

import { useState } from 'react';
import LoadingScreen from '../components/LoadingScreen';

export function StoreProvider({ children }: { children: ReactNode }) {
  const [initialStore, setInitialStore] = useState<Store | null>(null);

  useEffect(() => {
    loadInitialStore().then(setInitialStore);
  }, []);

  if (!initialStore) return createElement(LoadingScreen, null);

  return createElement(StoreProviderInner, { initialStore, children });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
