import { useRef, useState, useCallback, type CSSProperties } from 'react';
import Card, { type CardProps } from './Card';
import styles from './MosaicGrid.module.css';

// Dock magnification config
const MAX_SCALE = 1.22;
const SIGMA = 110; // gaussian spread in pixels — tighter = more focused bloom

function dockScale(distPx: number): number {
  return 1 + (MAX_SCALE - 1) * Math.exp(-(distPx * distPx) / (2 * SIGMA * SIGMA));
}

// Grid span config per media type
const SPAN_CONFIG: Record<string, CSSProperties> = {
  book:  { gridColumn: 'span 1', gridRow: 'span 2' }, // portrait 2:3
  movie: { gridColumn: 'span 2', gridRow: 'span 1' }, // landscape 16:9
  show:  { gridColumn: 'span 1', gridRow: 'span 1' }, // square
  music: { gridColumn: 'span 1', gridRow: 'span 1' }, // square
};

type MosaicItem = Omit<CardProps, 'scale'> & { id: string };

interface MosaicGridProps {
  items: MosaicItem[];
  onCardClick?: (id: string) => void;
}

export default function MosaicGrid({ items, onCardClick }: MosaicGridProps) {
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [scales, setScales] = useState<number[]>(() => Array(items.length).fill(1));
  const rafRef = useRef<number | null>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    const mx = e.clientX;
    const my = e.clientY;

    rafRef.current = requestAnimationFrame(() => {
      const next = cardRefs.current.map(el => {
        if (!el) return 1;
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dist = Math.sqrt((mx - cx) ** 2 + (my - cy) ** 2);
        return dockScale(dist);
      });
      setScales(next);
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    setScales(Array(items.length).fill(1));
  }, [items.length]);

  return (
    <div
      className={styles.grid}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {items.map((item, i) => (
        <div
          key={item.id}
          ref={el => { cardRefs.current[i] = el; }}
          className={styles.cell}
          style={SPAN_CONFIG[item.type] ?? SPAN_CONFIG.show}
        >
          <Card
            {...item}
            scale={scales[i]}
            onClick={() => onCardClick?.(item.id)}
          />
        </div>
      ))}
    </div>
  );
}
