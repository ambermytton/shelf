import styles from './LoadingScreen.module.css';

export default function LoadingScreen() {
  return (
    <div className={styles.root}>
      <span className={styles.wordmark}>Shelf</span>
    </div>
  );
}
