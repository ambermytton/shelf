import styles from './QuoteCard.module.css';

interface QuoteCardProps {
  text: string;
  attribution: string;
}

export default function QuoteCard({ text, attribution }: QuoteCardProps) {
  return (
    <div className={styles.card} aria-hidden="true">
      <span className={styles.mark}>"</span>
      <p className={styles.text}>{text}</p>
      <p className={styles.attribution}>— {attribution}</p>
    </div>
  );
}
