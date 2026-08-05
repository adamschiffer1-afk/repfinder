import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/styles/HeroSection.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faArrowRight, faPlay, faBoxOpen, faShieldAlt } from '@fortawesome/free-solid-svg-icons';

import { useLanguage } from '@/context/LanguageContext';

export default function HeroSection() {
  const { t, language } = useLanguage();
  const [query, setQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);

    // If it is the first visit, the setup modal is open.
    // We listen to the 'storage' event which is dispatched when the setup modal is saved.
    const hasSeen = localStorage.getItem('hasSeenSettings');
    const handleStorageChange = () => {
      setAnimationKey(prev => prev + 1);
    };

    if (!hasSeen) {
      window.addEventListener('storage', handleStorageChange);
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <section className={styles.heroWrapper}>
      {/* BACKGROUND ELEMENTS */}
      <div className={styles.ambientGlow1} />
      <div className={styles.ambientGlow2} />
      <div className={styles.gridOverlay} />
      <div className={styles.bottomFade} />

      <div className={styles.contentContainer} key={animationKey}>
        <div className={`${styles.badge} ${styles.animateEntry} ${styles.delay1}`}>
          <span className={styles.badgeText}>{t('hero.badge')}</span>
          <div className={styles.badgeDot} />
        </div>

        <h1 className={`${styles.mainTitle} ${styles.animateEntry} ${styles.delay2}`}>
          {t('hero.title')} <br />
          <span className={styles.gradientText}>{t('hero.titleSpan')}</span> {t('hero.titleSuffix')}
        </h1>

        <p className={`${styles.description} ${styles.animateEntry} ${styles.delay3}`}>
          {t('hero.description')}
        </p>

        <div className={`${styles.actionGroup} ${styles.animateEntry} ${styles.delay4}`}>
          <button 
            className={styles.primaryBtn}
            onClick={() => router.push('/products')}
          >
            {t('hero.browseBtn')} <FontAwesomeIcon icon={faArrowRight} />
          </button>
          
          <button 
            className={styles.secondaryBtn}
            onClick={() => router.push('/tutorials')}
          >
            <div className={styles.playIcon}><FontAwesomeIcon icon={faPlay} /></div>
            {t('hero.howToBuy')}
          </button>
        </div>

        {/* STATS / TRUST */}
        <div className={`${styles.trustRow} ${styles.animateEntry} ${styles.delay5}`}>
          <div className={styles.trustItem}>
            <FontAwesomeIcon icon={faBoxOpen} />
            <span>{t('hero.statsLinks')}</span>
          </div>
          <div className={styles.trustItem}>
            <FontAwesomeIcon icon={faShieldAlt} />
            <span>{t('hero.statsQC')}</span>
          </div>
        </div>
      </div>

      {/* FLOATING DECORATIONS */}
      <div className={styles.floatingCardWrapper1}>
        <div className={styles.floatingCard1}>
          <div className={styles.cardIcon}><FontAwesomeIcon icon={faSearch} /></div>
          <div className={styles.cardContent}>
            <div className={styles.cardTitle}>{t('hero.floatingSearch')}</div>
            <div className={styles.cardBar} />
          </div>
        </div>
      </div>
    </section>
  );
}