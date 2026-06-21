import { NavLink } from 'react-router-dom';
import styles from './NavBar.module.css';

export default function NavBar() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `${styles.link}${isActive ? ` ${styles.active}` : ''}`;

  return (
    <nav className={styles.nav}>
      <NavLink to="/" className={styles.wordmark}>Shelf</NavLink>
      <div className={styles.links}>
        <NavLink to="/" end className={linkClass}>Library</NavLink>
        <NavLink to="/settings" className={linkClass}>Settings</NavLink>
        <NavLink to="/stats" className={linkClass}>Stats</NavLink>
        <NavLink to="/add" className={styles.addBtn}>+ Add</NavLink>
      </div>
    </nav>
  );
}
