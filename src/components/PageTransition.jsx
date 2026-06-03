'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import styles from '@/styles/PageTransition.module.css';

export default function PageTransition({ children }) {
  const pathname = usePathname();
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 300);
    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <div className={`${styles.pageWrapper} ${isTransitioning ? styles.fadeIn : ''}`}>
      {children}
    </div>
  );
}
