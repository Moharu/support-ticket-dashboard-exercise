import Link from "next/link";
import styles from "../styles/layout.module.css";

export const Nav = () => (
  <nav className={styles.nav}>
    <Link className={`${styles.link} ${styles.active}`} href="/tickets" aria-current="page">
      Tickets
    </Link>
  </nav>
);
