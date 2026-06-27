import { forwardRef, useImperativeHandle, useRef } from 'react';
import styles from './BookMascot.module.css';

export type BookMode = 'idle' | 'active' | 'searching' | 'static';

export interface BookMascotHandle {
  root:      HTMLDivElement;
  pageLeft:  HTMLDivElement;
  pageRight: HTMLDivElement;
}

interface BookMascotProps {
  mode?:      BookMode;
  className?: string;
  /** Render the cover-base depth shadow beneath the pages. Off for the
   *  bird's-eye flying books, where it reads as an odd flat smear. */
  showBase?:  boolean;
}

const BookMascot = forwardRef<BookMascotHandle, BookMascotProps>(function BookMascot(
  { mode = 'idle', className = '', showBase = true },
  ref,
) {
  const rootRef  = useRef<HTMLDivElement>(null);
  const leftRef  = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    get root()      { return rootRef.current!; },
    get pageLeft()  { return leftRef.current!; },
    get pageRight() { return rightRef.current!; },
  }));

  const modeClass =
    mode === 'idle'        ? styles.idle
    : mode === 'active'    ? styles.active
    : mode === 'searching' ? styles.searching
    : '';

  return (
    <div
      ref={rootRef}
      className={[styles.mascot, modeClass, className].filter(Boolean).join(' ')}
    >
      {/* Ambient glow aura */}
      <div className={styles.glowHalo} />

      {/* 3D book */}
      <div className={styles.bookPerspective}>
        <div className={styles.book}>
          {/* Left page */}
          <div ref={leftRef} className={styles.pageLeft}>
            <div className={styles.pageLines} />
            <div className={styles.pageSheen} />
          </div>

          {/* Glowing spine */}
          <div className={styles.spine} />

          {/* Right page */}
          <div ref={rightRef} className={styles.pageRight}>
            <div className={styles.pageLines} />
            <div className={styles.pageSheen} />
          </div>
        </div>

        {/* Cover base — depth illusion beneath pages */}
        {showBase && <div className={styles.coverBase} />}
      </div>
    </div>
  );
});

export default BookMascot;
