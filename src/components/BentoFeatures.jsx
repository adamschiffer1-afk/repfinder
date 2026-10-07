'use client';
import styles from '@/styles/BentoFeatures.module.css';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalculator, faExchangeAlt, faBox, faTruck, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '@/context/LanguageContext';
import useScrollAnimation from '@/hooks/useScrollAnimation';

const FEATURES = [
  {
    href: '/link-converter',
    icon: faExchangeAlt,
    titleKey: 'features.converter',
    descKey: 'features.converterDesc',
  },
  {
    href: '/tracking',
    icon: faTruck,
    titleKey: 'tracking.title',
    descKey: 'tracking.subtitle',
  },
  {
    href: '/qc',
    icon: faBox,
    titleKey: 'features.qc',
    descKey: 'features.qcDesc',
  },
];

export default function BentoFeatures() {
  const { t } = useLanguage();
  const [sectionRef, isVisible] = useScrollAnimation({ threshold: 0.15 });

  return (
    <section ref={sectionRef} className={`${styles.section} ${isVisible ? styles.visible : ''}`}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>Narzędzia</p>
          <h2 className={styles.title}>
            {t('features.title')}{' '}
            <span className={styles.titleMuted}>{t('features.titleHighlight')}</span>
          </h2>
        </div>

        <div className={styles.grid}>
          {FEATURES.map((f, index) => (
            <Link 
              key={f.href} 
              href={f.href} 
              className={styles.card}
              style={{ '--delay': `${index * 0.1}s` }}
            >
              <div className={styles.cardTop}>
                <div className={styles.iconBox}>
                  <FontAwesomeIcon icon={f.icon} />
                </div>
                <FontAwesomeIcon icon={faArrowRight} className={styles.arrow} />
              </div>
              <div className={styles.cardBottom}>
                <h3 className={styles.cardTitle}>{t(f.titleKey)}</h3>
                <p className={styles.cardDesc}>{t(f.descKey)}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
