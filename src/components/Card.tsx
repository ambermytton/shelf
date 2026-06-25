import { useState } from 'react';
import styles from './Card.module.css';

export type FitVerdict = 'good' | 'partial' | 'poor';
export type ItemType = 'book' | 'movie' | 'show' | 'music';
export type ItemStatus = 'want' | 'in_progress' | 'finished';

export interface CardProps {
  title: string;
  creator: string;
  year: number;
  coverUrl?: string;
  type: ItemType;
  status: ItemStatus;
  fitVerdict?: FitVerdict;
  progress?: number;       // 0–100
  progressLabel?: string;  // "p.189 of 286 · 68%" / "S2 E5 · 34%"
  userRating?: number;     // 0–10
  onClick?: () => void;
}

const TYPE_LABELS: Record<ItemType, string> = {
  book: 'Book',
  movie: 'Film',
  show: 'Show',
  music: 'Music',
};

const TYPE_PLACEHOLDERS: Record<ItemType, string> = {
  book: '📖',
  movie: '🎬',
  show: '📺',
  music: '🎵',
};

function RatingBadge({ rating }: { rating: number }) {
  return (
    <span className={styles.ratingBadge} aria-label={`Rating: ${rating} out of 10`}>
      {rating % 1 === 0 ? rating : rating.toFixed(1)}
    </span>
  );
}

export default function Card({
  title,
  creator,
  year,
  coverUrl,
  type,
  status,
  fitVerdict,
  progress,
  progressLabel,
  userRating,
  onClick,
}: CardProps) {
  const typeClass = styles[type] ?? styles.book;
  const [imgError, setImgError] = useState(false);

  const chipVariant =
    status === 'in_progress' ? 'progress' :
    status === 'finished'    ? 'finished' :
                               'want';

  const chipLabel =
    status === 'want'        ? 'Not started' :
    status === 'in_progress' ? 'In progress' :
                               '✓ Finished';

  return (
    <article
      className={`${styles.card} ${typeClass}`}
      onClick={onClick}
      tabIndex={0}
      role="button"
      onKeyDown={e => e.key === 'Enter' && onClick?.()}
      aria-label={`${title} by ${creator}`}
    >
      {coverUrl && !imgError ? (
        <img src={coverUrl} alt="" className={styles.coverImg} onError={() => setImgError(true)} />
      ) : (
        <div className={styles.placeholder}>{TYPE_PLACEHOLDERS[type]}</div>
      )}

      <div className={styles.scrim} />

      <span className={styles.typeChip}>{TYPE_LABELS[type]}</span>

      {fitVerdict && (
        <span className={styles.fitDot} data-verdict={fitVerdict} aria-label={`Fit: ${fitVerdict}`} />
      )}

      {status === 'finished' && userRating !== undefined && userRating > 0 && (
        <RatingBadge rating={userRating} />
      )}

      {/* Progress bar at card bottom — books and shows in-progress */}
      {status === 'in_progress' && progress !== undefined && (
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
      )}

      {/* Always-visible metadata: title, sub, status chip */}
      <div className={styles.meta}>
        <p className={styles.title}>{title}</p>
        <p className={styles.sub}>
          {status === 'in_progress' && progressLabel
            ? progressLabel
            : `${creator} · ${year}`}
        </p>
        <div
          className={styles.statusChip}
          data-status={chipVariant}
          aria-label={`Status: ${chipLabel}`}
        >
          {chipLabel}
        </div>
      </div>
    </article>
  );
}
