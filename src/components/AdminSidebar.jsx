'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from '@/styles/AdminSidebar.module.css';

const NAV = [
  { href: '/admin-99x-hsd',           label: 'Dashboard',   icon: '🏠' },
  { href: '/admin-99x-hsd/products',  label: 'Produkty',    icon: '📦' },
  { href: '/admin-99x-hsd/stats',     label: 'Statystyki',  icon: '📈' },
  { href: '/admin-99x-hsd/kakobuy',   label: 'Kakobuy',     icon: '🛒' },
  { href: '/admin-99x-hsd/earnings',  label: 'Zarobki',     icon: '💰' },
  { href: '/admin-99x-hsd/users',     label: 'Użytkownicy', icon: '👥' },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  const isActive = (href) => {
    if (href === '/admin-99x-hsd') return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <nav className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.logoWrap}>
        <img src="/images/rf-logo-removebg-preview.png" alt="RepFinder" className={styles.logoImage} />
        <div className={styles.logoText}>
          <span className={styles.logoMain}>RepFinder</span>
          <span className={styles.logoSub}>Admin Panel</span>
        </div>
      </div>

      {/* Divider */}
      <div className={styles.divider} />

      {/* Nav label */}
      <span className={styles.navLabel}>NAWIGACJA</span>

      {/* Links */}
      <ul className={styles.navList}>
        {NAV.map(({ href, label, icon }) => (
          <li key={href}>
            <Link
              href={href}
              className={`${styles.navLink} ${isActive(href) ? styles.active : ''}`}
            >
              <span className={styles.navIcon}>{icon}</span>
              <span className={styles.navLinkText}>{label}</span>
              {isActive(href) && <span className={styles.activeDot} />}
            </Link>
          </li>
        ))}
      </ul>

      {/* Bottom: logout */}
      <div className={styles.bottomSection}>
        <div className={styles.divider} />
        <form action="/api/auth/signout" method="POST">
          <button type="submit" className={styles.logoutBtn}>
            <span className={styles.navIcon}>🚪</span>
            <span>Wyloguj</span>
          </button>
        </form>
      </div>
    </nav>
  );
}
