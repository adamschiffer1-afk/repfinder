import styles from '@/styles/BentoFeatures.module.css';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalculator, faExchangeAlt, faBox, faTags, faTruck } from '@fortawesome/free-solid-svg-icons';

import { useLanguage } from '@/context/LanguageContext';

export default function BentoFeatures() {
  const { t } = useLanguage();

  const trackClick = async (featureName) => {
    try {
      await fetch('/api/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'product_click', // Reusing product_click or using a generic one
          agent: featureName,    // Reusing agent field for feature name
          userAgent: navigator.userAgent,
          path: window.location.pathname
        })
      });
    } catch (err) {
      console.error('Tracking error:', err);
    }
  };

  return (
    <section className={styles.bentoSection}>
      <div className={styles.container}>
        <h2 className={styles.sectionTitle}>
          {t('features.title')} <span className={styles.highlight}>{t('features.titleHighlight')}</span>
        </h2>
        
        <div className={styles.bentoGrid}>
          {/* Wiersz 1 */}
          <Link 
            href="/link-converter" 
            className={`${styles.bentoCard} ${styles.wide}`}
            onClick={() => trackClick('link_converter')}
          >
            <div className={styles.iconWrapper}>
              <FontAwesomeIcon icon={faExchangeAlt} />
            </div>
            <h3>{t('features.converter')}</h3>
            <p>{t('features.converterDesc')}</p>
          </Link>
          
          <div 
            className={`${styles.bentoCard} ${styles.disabled}`}
            onClick={() => trackClick('shipping_calc')}
          >
            <div className={styles.iconWrapper}>
              <FontAwesomeIcon icon={faCalculator} />
            </div>
            <h3>{t('features.calculator')} <span className={styles.comingSoon}>{t('features.soon')}</span></h3>
            <p>{t('features.calcDesc')}</p>
          </div>
          
          {/* Wiersz 2 */}
          <Link 
            href="/tracking" 
            className={`${styles.bentoCard} ${styles.wide}`}
            onClick={() => trackClick('package_tracking')}
          >
            <div className={styles.iconWrapper}>
              <FontAwesomeIcon icon={faTruck} />
            </div>
            <h3>{t('tracking.title')}</h3>
            <p>{t('tracking.subtitle')}</p>
          </Link>

          <div 
            className={`${styles.bentoCard} ${styles.disabled}`}
            onClick={() => trackClick('quality_check')}
          >
            <div className={styles.iconWrapper}>
              <FontAwesomeIcon icon={faBox} />
            </div>
            <h3>{t('features.qc')} <span className={styles.comingSoon}>{t('features.soon')}</span></h3>
            <p>{t('features.qcDesc')}</p>
          </div>
          

        </div>
      </div>
    </section>
  );
}
