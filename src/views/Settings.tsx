import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import type { TasteProfile } from '../store/types';
import TagInput from '../components/TagInput';
import styles from './Settings.module.css';

const GENRE_SUGGESTIONS = [
  'sci-fi', 'fantasy', 'literary fiction', 'mystery', 'thriller',
  'romance', 'historical fiction', 'horror', 'non-fiction', 'biography',
  'comedy', 'drama', 'action', 'documentary', 'crime', 'animation',
];

const CONTENT_SUGGESTIONS = [
  'graphic violence', 'sexual assault', 'child harm', 'torture',
  'animal cruelty', 'suicide', 'war', 'explicit sex',
];

function RangeField({
  label,
  hint,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className={styles.rangeField}>
      <div className={styles.rangeHeader}>
        <label className={styles.fieldLabel}>{label}</label>
        <span className={styles.rangeValue}>{value.toLocaleString()} {unit}</span>
      </div>
      {hint && <p className={styles.fieldHint}>{hint}</p>}
      <input
        type="range"
        className={styles.range}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
      />
      <div className={styles.rangeBounds}>
        <span>{min.toLocaleString()}</span>
        <span>{max.toLocaleString()}</span>
      </div>
    </div>
  );
}

export default function Settings() {
  const { store, setProfile, exportStore, importStore, clearStore } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);

  // Local draft — only written to the store on Save
  const [draft, setDraft] = useState<TasteProfile>(store.tasteProfile);
  const [saved, setSaved] = useState(false);

  // Keep draft in sync if the store changes externally (e.g. import)
  useEffect(() => { setDraft(store.tasteProfile); }, [store.tasteProfile]);

  function patch(partial: Partial<TasteProfile>) {
    setDraft(prev => ({ ...prev, ...partial }));
    setSaved(false);
  }

  function handleSave() {
    setProfile(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    importStore(file).catch(err => alert(`Import failed: ${err.message}`));
    e.target.value = '';
  }

  const isDirty = JSON.stringify(draft) !== JSON.stringify(store.tasteProfile);
  const itemCount = store.items.length;

  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>Settings</h1>

      {/* ─── Taste profile ─────────────────────────────────────────── */}
      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Taste profile</h2>
        <p className={styles.sectionHint}>
          Used to compute a fit verdict whenever you add a title. You can always add a "poor fit" anyway.
        </p>

        <div className={styles.fields}>
          <TagInput
            label="Genres you enjoy"
            values={draft.preferredGenres}
            onChange={v => patch({ preferredGenres: v })}
            suggestions={GENRE_SUGGESTIONS.filter(g => !draft.avoidGenres.includes(g))}
            placeholder="e.g. sci-fi, literary fiction"
          />

          <TagInput
            label="Genres to avoid"
            hint="A match here will mark a title as poor fit."
            values={draft.avoidGenres}
            onChange={v => patch({ avoidGenres: v })}
            suggestions={GENRE_SUGGESTIONS.filter(g => !draft.preferredGenres.includes(g))}
            placeholder="e.g. horror"
          />

          <TagInput
            label="Content to avoid"
            hint="Best-effort check against metadata — absence isn't a guarantee."
            values={draft.avoidContent}
            onChange={v => patch({ avoidContent: v })}
            suggestions={CONTENT_SUGGESTIONS}
            placeholder="e.g. graphic violence"
          />

          <RangeField
            label="Max book length"
            value={draft.maxBookPages}
            min={100}
            max={1200}
            step={50}
            unit="pages"
            onChange={v => patch({ maxBookPages: v })}
          />

          <RangeField
            label="Max runtime"
            hint="Applies to movies and shows (per-episode for shows)."
            value={draft.maxRuntimeMinutes}
            min={30}
            max={300}
            step={10}
            unit="min"
            onChange={v => patch({ maxRuntimeMinutes: v })}
          />

          <RangeField
            label="Minimum source rating"
            hint="Titles rated below this will be flagged as partial fit."
            value={draft.minRating}
            min={0}
            max={10}
            step={0.5}
            unit="/ 10"
            onChange={v => patch({ minRating: v })}
          />
        </div>

        <div className={styles.saveRow}>
          <button
            className={styles.btnPrimary}
            onClick={handleSave}
            disabled={!isDirty}
          >
            {saved ? 'Saved ✓' : 'Save profile'}
          </button>
          {isDirty && (
            <span className={styles.unsavedNote}>Unsaved changes</span>
          )}
        </div>
      </section>

      {/* ─── Data controls ─────────────────────────────────────────── */}
      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Your data</h2>
        <p className={styles.meta}>
          {itemCount} {itemCount === 1 ? 'item' : 'items'} saved
        </p>
        <div className={styles.actions}>
          <button className={styles.btnPrimary} onClick={exportStore}>
            Export JSON
          </button>
          <button className={styles.btnSecondary} onClick={() => fileRef.current?.click()}>
            Import JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImport}
            hidden
          />
          <button
            className={styles.btnDanger}
            onClick={() => {
              if (confirm('Clear all saved data? This cannot be undone.')) clearStore();
            }}
          >
            Clear data
          </button>
        </div>
      </section>
    </main>
  );
}
