'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import styles from '@/styles/TopLoadingBar.module.css';

export default function TopLoadingBar() {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setIsLoading(true);
    setProgress(30);

    const timer1 = setTimeout(() => setProgress(60), 100);
    const timer2 = setTimeout(() => setProgress(90), 200);
    const timer3 = setTimeout(() => {
      setProgress(100);
      setTimeout(() => {
        setIsLoading(false);
        setProgress(0);
      }, 300);
    }, 400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [pathname]);

  if (!isLoading && progress === 0) return null;

  return (
    <div className={styles.loadingBarContainer}>
      <div 
        className={styles.loadingBar} 
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
