import styles from './Aurora.module.css';

export default function Aurora() {
  return (
    <div className={styles.wrap} aria-hidden>
      <div className={styles.orb1} />
      <div className={styles.orb2} />
      <div className={styles.orb3} />
    </div>
  );
}
