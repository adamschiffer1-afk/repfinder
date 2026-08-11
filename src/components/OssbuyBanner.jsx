'use client';

import { useState, useEffect } from 'react';
import styles from '@/styles/OssbuyBanner.module.css';

export default function OssbuyBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [showCloseButton, setShowCloseButton] = useState(false);

  useEffect(() => {
    // Check if banner was dismissed today
    const checkBannerStatus = () => {
      try {
        const dismissedDate = localStorage.getItem('ossbuyBannerDismissed');
        if (dismissedDate) {
          const today = new Date().toDateString();
          const dismissed = new Date(dismissedDate).toDateString();
          if (today === dismissed) {
            return; // Don't show banner
          }
        }
        setIsVisible(true);
        
        // Show close button after 3 seconds
        setTimeout(() => {
          setShowCloseButton(true);
        }, 3000);
      } catch (err) {
        setIsVisible(true);
        setTimeout(() => setShowCloseButton(true), 3000);
      }
    };

    checkBannerStatus();
  }, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem('ossbuyBannerDismissed', new Date().toISOString());
    } catch (err) {
      console.error('Failed to save banner dismissal');
    }
    setIsVisible(false);
  };

  const handleCTAClick = () => {
    handleDismiss();
    window.open('https://ossbuy.allapp.link/d9pi65h0b4mnp0ou7sog', '_blank');
  };

  if (!isVisible) return null;

  return (
    <div className={styles.bannerOverlay}>
      <div className={styles.bannerContent}>
        {showCloseButton && (
          <button 
            className={styles.closeButton}
            onClick={handleDismiss}
            aria-label="Zamknij"
          >
            ×
          </button>
        )}
        
        <img 
          src="/logo.png" 
          alt="RepFinder" 
          className={styles.logo}
        />
        
        <div className={styles.promoTag}>
          🔥 SPECJALNA OFERTA 🔥
        </div>
        
        <h2 className={styles.title}>
          Obecnie <span className={styles.discount}>-50%</span> na wysyłkę w OssBuy!
        </h2>
        
        <p className={styles.subtitle}>
          Zarejestruj się teraz i skorzystaj z tej wyjątkowej okazji przed jej wygaśnięciem.
        </p>
        
        <button 
          className={styles.ctaButton}
          onClick={handleCTAClick}
        >
          Zarejestruj się w OssBuy →
        </button>
        
        <img 
          src="/images/ossbuy.png" 
          alt="Ossbuy" 
          className={styles.agentLogo}
        />
      </div>
    </div>
  );
}
