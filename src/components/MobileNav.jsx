'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faBoxOpen, faTruck, faLink } from '@fortawesome/free-solid-svg-icons';
import styles from '@/styles/MobileNav.module.css';
import { useSession } from 'next-auth/react';

const NAV_ITEMS = [
  { href: '/',               icon: faHome,    label: 'Home' },
  { href: '/products',       icon: faBoxOpen, label: 'Produkty' },
  { href: '/tracking',       icon: faTruck,   label: 'Tracking' },
  { href: '/link-converter', icon: faLink,    label: 'Converter' },
];

export default function MobileNav() {
  const pathname = usePathname();

  // Hide on admin pages
  if (pathname?.startsWith('/admin-99x-hsd')) return null;

  const activeItem = NAV_ITEMS.find(item =>
    item.href === '/' ? pathname === '/' : pathname?.startsWith(item.href)
  );

  return (
    <nav className={styles.mobileNav}>
      <div className={styles.track}>
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
            >
              {isActive ? (
                <span className={styles.activePill}>
                  <FontAwesomeIcon icon={item.icon} className={styles.icon} />
                  <span className={styles.activeLabel}>{item.label}</span>
                </span>
              ) : (
                <FontAwesomeIcon icon={item.icon} className={styles.icon} />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
