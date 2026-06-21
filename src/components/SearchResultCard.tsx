import { useState } from 'react';
import type { SearchResult } from '../lib/api';
import type { FitResult } from '../store/types';
import type { ItemStatus } from '../store/types';
import styles from './SearchResultCard.module.css';

const STATUS_LABELS: Record<ItemStatus, string> = {
  want: 'Want to',
  in_progress: 'In progress',
  finished: 'Finished',
};

const TYPE_LABELS = { book: 'Book', movie: 'Film', show: 'Show' };
const PLACEHOLDERS = { book: '📖', movie: '🎬', show: '📺' };

const VERDICT_LABEL: Record<string, string> = {
  good: 'Good fit',
  partial: 'Partial fit',
  poor: 'Poor fit',
};

interface SearchResultCardProps {
  result: SearchResult;
  fit?: FitResult;
  onAdd: (status: ItemStatus) => void;
  adding?: boolean; // true while detail fetch is in-flight
  added?: boolean;
}

export default function SearchResultCard({
  result,
  fit,
  onAdd,
  adding = false,
  added = false,
}: SearchResultCardProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  function handleAdd(status: ItemStatus) {
    setPickerOpen(false);
    onAdd(status);
  }

  return (
    <article className={styles.card}>
      {/* Cover */}
      <div className={`${styles.cover} ${styles[result.type]}`}>
        {result.coverUrl ? (
          <img src={result.coverUrl} alt="" className={styles.coverImg} />
        ) : (
          <span className={styles.placeholder}>{PLACEHOLDERS[result.type]}</span>
        )}
      </div>

      {/* Details */}
      <div className={styles.body}>
        <div className={styles.topRow}>
          <span className={styles.typeChip}>{TYPE_LABELS[result.type]}</span>
          {fit && (
            <span className={styles.fitPill} data-verdict={fit.verdict}>
              {VERDICT_LABEL[fit.verdict]}
            </span>
          )}
        </div>

        <p className={styles.title}>{result.title}</p>
        <p className={styles.meta}>
          {result.creator && <>{result.creator} · </>}{result.year || '—'}
        </p>

        {fit && (
          <p className={styles.fitReason}>{fit.reason}</p>
        )}

        {/* Add control */}
        <div className={styles.addRow}>
          {added ? (
            <span className={styles.addedLabel}>Added ✓</span>
          ) : pickerOpen ? (
            <div className={styles.statusPicker}>
              {(Object.keys(STATUS_LABELS) as ItemStatus[]).map(s => (
                <button
                  key={s}
                  className={styles.statusBtn}
                  onClick={() => handleAdd(s)}
                  disabled={adding}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
              <button
                className={styles.cancelBtn}
                onClick={() => setPickerOpen(false)}
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              className={styles.addBtn}
              onClick={() => setPickerOpen(true)}
              disabled={adding}
            >
              {adding ? 'Adding…' : '+ Add'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
