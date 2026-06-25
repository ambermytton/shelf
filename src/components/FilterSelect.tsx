import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './FilterSelect.module.css';

interface Option {
  value: string;
  label: string;
}

interface FilterSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  active?: boolean;
}

export default function FilterSelect({ options, value, onChange, ariaLabel, active = false }: FilterSelectProps) {
  const [open, setOpen] = useState(false);
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find(o => o.value === value)?.label ?? value;

  function toggle() {
    if (open) {
      setOpen(false);
    } else {
      setTriggerRect(triggerRef.current?.getBoundingClientRect() ?? null);
      setOpen(true);
    }
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (
        dropdownRef.current?.contains(e.target as Node) ||
        triggerRef.current?.contains(e.target as Node)
      ) return;
      setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`${styles.trigger} ${active ? styles.triggerActive : ''} ${open ? styles.triggerOpen : ''}`}
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span>{selectedLabel}</span>
        <svg className={styles.chevron} width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true">
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && triggerRect && createPortal(
        <div
          ref={dropdownRef}
          className={styles.dropdown}
          style={(() => {
            const approxWidth = Math.max(triggerRect.width, 140);
            const wouldOverflowRight = triggerRect.left + approxWidth > window.innerWidth - 8;
            return {
              top: triggerRect.bottom + 6,
              minWidth: triggerRect.width,
              ...(wouldOverflowRight
                ? { right: window.innerWidth - triggerRect.right }
                : { left: triggerRect.left }),
            };
          })()}
          role="listbox"
          aria-label={ariaLabel}
        >
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={opt.value === value}
              className={`${styles.option} ${opt.value === value ? styles.optionSelected : ''}`}
              onClick={() => { onChange(opt.value); setOpen(false); }}
            >
              <span className={styles.check} aria-hidden="true">{opt.value === value ? '✓' : ''}</span>
              {opt.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
