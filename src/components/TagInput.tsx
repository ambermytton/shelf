import { useState, useRef, type KeyboardEvent } from 'react';
import styles from './TagInput.module.css';

interface TagInputProps {
  label: string;
  hint?: string;
  values: string[];
  onChange: (values: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
}

export default function TagInput({
  label,
  hint,
  values,
  onChange,
  suggestions = [],
  placeholder = 'Type and press Enter',
}: TagInputProps) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function commit(raw: string) {
    const tag = raw.trim().toLowerCase();
    if (!tag || values.includes(tag)) { setDraft(''); return; }
    onChange([...values, tag]);
    setDraft('');
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(draft); }
    if (e.key === 'Backspace' && draft === '' && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  }

  function remove(tag: string) {
    onChange(values.filter(v => v !== tag));
  }

  const unusedSuggestions = suggestions.filter(s => !values.includes(s));

  return (
    <div className={styles.root}>
      <label className={styles.label}>{label}</label>
      {hint && <p className={styles.hint}>{hint}</p>}

      <div className={styles.field} onClick={() => inputRef.current?.focus()}>
        {values.map(tag => (
          <span key={tag} className={styles.tag}>
            {tag}
            <button
              className={styles.tagRemove}
              onClick={e => { e.stopPropagation(); remove(tag); }}
              aria-label={`Remove ${tag}`}
              type="button"
            >×</button>
          </span>
        ))}
        <input
          ref={inputRef}
          className={styles.input}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKey}
          onBlur={() => { if (draft.trim()) commit(draft); }}
          placeholder={values.length === 0 ? placeholder : ''}
        />
      </div>

      {unusedSuggestions.length > 0 && (
        <div className={styles.suggestions}>
          {unusedSuggestions.map(s => (
            <button
              key={s}
              type="button"
              className={styles.suggestion}
              onClick={() => onChange([...values, s])}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
