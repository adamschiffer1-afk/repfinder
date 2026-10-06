'use client';
import Image from 'next/image';
import styles from '@/styles/Footer.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDiscord, faTiktok, faYoutube } from '@fortawesome/free-brands-svg-icons';

import { useLanguage } from '@/context/LanguageContext';

import { usePathname } from 'next/navigation';

export default function Footer() {
  const { t } = useLanguage();
  const pathname = usePathname();

  if (pathname?.startsWith('/admin-99x-hsd')) return null;
  return (
    <footer className={styles.footer}>
      <div className={styles.divider}>
        <div className={styles.dividerLine}></div>
        <div className={styles.dividerLogo}>
          <img src="/images/nowelogo.png" alt="RepFinder Logo" />
        </div>
        <div className={styles.dividerLine}></div>
      </div>
      <div className={styles.container}>
        <div className={styles.footerContent}>
          {/* Column 1: Logo & About */}
          <div className={styles.footerColumn}>
            <div className={styles.logoWrapper}>
              <Image
                src="/images/nowelogo.png"
                alt="Logo"
                width={48}
                height={40}
                style={{ objectFit: 'contain' }}
              />
            </div>
            <p className={styles.footerDescription}>
              {t('footer.description')}
            </p>
          </div>

          {/* Column 2: Quick Links / Socials */}
          <div className={styles.footerColumn}>
            <h5 className={styles.footerTitle}>{t('footer.community')}</h5>
            <div className={styles.socialIcons}>
              <span className={styles.socialIcon} style={{ cursor: 'default' }}>
                <FontAwesomeIcon icon={faDiscord} />
              </span>
              <span className={styles.socialIcon} style={{ cursor: 'default' }}>
                <FontAwesomeIcon icon={faTiktok} />
              </span>
              <span className={styles.socialIcon} style={{ cursor: 'default' }}>
                <FontAwesomeIcon icon={faYoutube} />
              </span>
            </div>
          </div>

          {/* Column 3: Legal */}
          <div className={styles.footerColumn}>
            <h5 className={styles.footerTitle}>{t('footer.info')}</h5>
            <p className={styles.legalInfo}>{t('footer.copyright')}</p>
            <a href="/privacy-policy" className={styles.legalLink}>Polityka prywatności</a>
            <a href="/terms" className={styles.legalLink}>Regulamin</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
