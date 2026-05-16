'use client';

import styles from '@/styles/Tutorials.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHammer } from '@fortawesome/free-solid-svg-icons';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';

export default function Tutorials() {
  const { t } = useLanguage();
  const router = useRouter();

  return (
    <div className={styles.comingSoonWrapper}>
      <div className={styles.comingSoonContent}>
        <div className={styles.soonIcon}>
          <FontAwesomeIcon icon={faHammer} />
        </div>
        <h1 className={styles.soonTitle}>{t('tutorials.title')}</h1>
        <p className={styles.soonDescription}>
          {t('tutorials.description')}
        </p>
        <button 
          className={styles.backBtn}
          onClick={() => router.push('/')}
        >
          {t('tutorials.backBtn')}
        </button>
      </div>
    </div>
  );
}