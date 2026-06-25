import { type CSSProperties } from 'react';
import Card, { type CardProps } from './Card';
import QuoteCard from './QuoteCard';
import styles from './MosaicGrid.module.css';

// Grid span config per media type
const SPAN_CONFIG: Record<string, CSSProperties> = {
  book:  { gridColumn: 'span 1', gridRow: 'span 2' }, // portrait 2:3
  movie: { gridColumn: 'span 2', gridRow: 'span 1' }, // landscape 16:9
  show:  { gridColumn: 'span 1', gridRow: 'span 1' }, // square
  music: { gridColumn: 'span 1', gridRow: 'span 1' }, // square
  quote: { gridColumn: 'span 1', gridRow: 'span 1' }, // decorative filler
};

type CardItem = Omit<CardProps, 'scale'> & { id: string };
type QuoteItem = { id: string; type: 'quote'; text: string; attribution: string };
type MosaicItem = CardItem | QuoteItem;

interface MosaicGridProps {
  items: MosaicItem[];
  onCardClick?: (id: string) => void;
}

export default function MosaicGrid({ items, onCardClick }: MosaicGridProps) {
  return (
    <div className={styles.grid}>
      {items.map((item) => (
        <div
          key={item.id}
          className={styles.cell}
          style={SPAN_CONFIG[item.type] ?? SPAN_CONFIG.show}
        >
          {item.type === 'quote' ? (
            <QuoteCard text={(item as QuoteItem).text} attribution={(item as QuoteItem).attribution} />
          ) : (
            <Card
              {...(item as CardItem)}
              onClick={() => onCardClick?.(item.id)}
            />
          )}
        </div>
      ))}
    </div>
  );
}
