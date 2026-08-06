'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from '@/styles/PopupModal.module.css';

import { useLanguage } from '@/context/LanguageContext';

export default function PopupModal() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const [showModal, setShowModal] = useState(false);
  const [showCloseButton, setShowCloseButton] = useState(false);

  useEffect(() => {
    // Only show on /products page
    if (pathname !== '/products') return;

    // Check if banner was dismissed today
    const dismissedDate = localStorage.getItem('ossbuyBannerDismissed');
    const today = new Date().toDateString();
    
    if (dismissedDate === today) {
      return; // Don't show banner if dismissed today
    }

    // Show modal after 5 seconds
    const modalTimer = setTimeout(() => {
      setShowModal(true);
      
      // Show close button after additional 3 seconds
      const closeButtonTimer = setTimeout(() => {
        setShowCloseButton(true);
      }, 3000);

      return () => clearTimeout(closeButtonTimer);
    }, 5000);

    return () => clearTimeout(modalTimer);
  }, [pathname]);

  const handleClose = () => {
    setShowModal(false);
    // Save today's date to localStorage
    const today = new Date().toDateString();
    localStorage.setItem('ossbuyBannerDismissed', today);
  };

  const renderTitle = (title) => {
    if (!title) return null;
    const regex = /(-50%)/gi;
    const parts = title.split(regex);
    return parts.map((part, index) => {
      if (regex.test(part)) {
        return (
          <span key={index} className={styles.highlight}>
            {part}
          </span>
        );
      }
      return part;
    });
  };

  if (!showModal) return null;

  return (
    <div className={`${styles.popup} ${showModal ? styles.popupActive : ''}`}>
      <div className={styles.popupContent}>
        {showCloseButton && (
          <button
            className={styles.popupClose}
            onClick={handleClose}
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        )}

        <div className={styles.header}>
          <div className={styles.brandWrapper}>
            <img src="/images/rf-logo-removebg-preview.png" alt="Logo" className={styles.modalLogo} />
            <h2 className={styles.brandTitle}>RepFinder</h2>
          </div>
          <div className={styles.badge}>
            <span className={styles.badgeDot}></span>
            {t('promo.badge')}
          </div>
        </div>

        <div className={styles.body}>
          <p className={styles.mainOffer}>
            {renderTitle(t('promo.title'))}
          </p>
          <p className={styles.subText}>
            {t('promo.description')}
          </p>
        </div>

        <Link 
          href="https://ossbuy.allapp.link/d9pi65h0b4mnp0ou7sog" 
          className={styles.primaryBtn} 
          target="_blank" 
          rel="noopener noreferrer"
        >
          <span>{t('promo.button')}</span>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={styles.btnIcon}>
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </Link>
      </div>
    </div>
  );
}