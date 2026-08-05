'use client';

import { useState, useEffect } from 'react';
import styles from '@/styles/Tutorials.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import { 
  faUserPlus, faSearch, faCartPlus, faBox, 
  faCreditCard, faMoneyBillWave, faTruckFast, 
  faCamera, faWeightScale, faPlaneDeparture, 
  faShippingFast, faBoxOpen, faCheckCircle,
  faArrowRight, faArrowLeft, faTimes
} from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '@/context/LanguageContext';

const stepMeta = [
  { icon: faUserPlus, hasImage: true, imagePath: '/images/krok1.png' },
  { icon: faSearch, hasImage: true, imagePath: '/images/krok2.png' },
  { icon: faCartPlus, hasImage: true, imagePath: '/images/krok3.jpg' },
  { icon: faBox, hasImage: true, imagePath: '/images/krok4.png' },
  { icon: faCreditCard, hasImage: true, imagePath: '/images/krok5.png' },
  { icon: faMoneyBillWave, hasImage: true, imagePath: '/images/krok6.png' },
  { icon: faTruckFast, hasImage: false },
  { icon: faCamera, hasImage: true, imagePath: '/images/krok8.png' },
  { icon: faWeightScale, hasImage: true, imagePath: '/images/krok9.png' },
  { icon: faPlaneDeparture, hasImage: false },
  { icon: faShippingFast, hasImage: true, imagePath: '/images/krok11.png' },
  { icon: faBoxOpen, hasImage: false },
  { icon: faCheckCircle, hasImage: false }
];

export default function Tutorials() {
  const { t } = useLanguage();
  const { width, height } = useWindowSize();
  const [activeStep, setActiveStep] = useState(0);
  const [animateKey, setAnimateKey] = useState(0);
  const [zoomedImage, setZoomedImage] = useState(null);

  // Read translated steps from translations.js
  // Ensure we fallback to empty strings if translations are missing temporarily
  const translatedSteps = stepMeta.map((meta, index) => ({
    ...meta,
    title: t(`tutorialSteps.steps.${index}.title`) || '',
    description: t(`tutorialSteps.steps.${index}.description`) || ''
  }));

  const handleStepClick = (index) => {
    if (activeStep !== index) {
      setActiveStep(index);
      setAnimateKey(prev => prev + 1);
      if (window.innerWidth < 992) {
        setTimeout(() => {
          document.getElementById('tutorial-content')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  };

  const nextStep = () => {
    if (activeStep < translatedSteps.length - 1) handleStepClick(activeStep + 1);
  };

  const prevStep = () => {
    if (activeStep > 0) handleStepClick(activeStep - 1);
  };

  const currentStep = translatedSteps[activeStep];

  // Disable scroll when modal is open
  useEffect(() => {
    if (zoomedImage) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [zoomedImage]);

  return (
    <div className={styles.tutorialsContainer}>
      {activeStep === translatedSteps.length - 1 && (
        <Confetti
          width={width}
          height={height}
          colors={['#a78bfa', '#8b5cf6', '#6366f1', '#ec4899', '#facc15', '#2dd4bf']}
          recycle={false}
          numberOfPieces={400}
          gravity={0.4}
          initialVelocityY={15}
          style={{ position: 'fixed', top: 0, left: 0, zIndex: 9999, pointerEvents: 'none' }}
        />
      )}
      <div className={styles.heroSection}>
        <h1 className={styles.title}>{t('tutorials.pageTitle')}</h1>
        <p className={styles.subtitle}>{t('tutorials.pageSubtitle')}</p>
      </div>

      <div className={styles.layoutWrapper}>
        {/* Sidebar Navigation */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <h3>{t('tutorials.tableOfContents')}</h3>
            <span>{translatedSteps.length} {t('tutorials.stepsCount')}</span>
          </div>
          <div className={styles.sidebarList}>
            {translatedSteps.map((step, index) => (
              <button 
                key={index} 
                className={`${styles.sidebarItem} ${activeStep === index ? styles.activeItem : ''}`}
                onClick={() => handleStepClick(index)}
              >
                <div className={styles.itemIconWrapper}>
                  <FontAwesomeIcon icon={step.icon} className={styles.itemIcon} />
                </div>
                <div className={styles.itemText}>
                  <span className={styles.itemStepNum}>{t('tutorials.step')} {index + 1}</span>
                  <span className={styles.itemTitle}>{step.title}</span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Main Content Area */}
        <main id="tutorial-content" className={styles.mainContent}>
          <div key={animateKey} className={styles.contentCard}>
            
            <div className={styles.contentHeader}>
              <div className={styles.headerIconWrapper}>
                <FontAwesomeIcon icon={currentStep.icon} className={styles.headerIcon} />
              </div>
              <div className={styles.headerTitles}>
                <span className={styles.stepBadge}>{t('tutorials.step')} {activeStep + 1} {t('tutorials.of')} {translatedSteps.length}</span>
                <h2 className={styles.contentTitle}>{currentStep.title}</h2>
              </div>
            </div>

            <p className={styles.contentDescription}>{currentStep.description}</p>
            
            {currentStep.hasImage && currentStep.imagePath && (
              <div 
                className={styles.imageContainer} 
                onClick={() => setZoomedImage(currentStep.imagePath)}
              >
                <div className={styles.zoomHint}>{t('tutorials.zoomHint')}</div>
                <img 
                  src={currentStep.imagePath} 
                  alt={`Krok ${activeStep + 1}: ${currentStep.title}`} 
                  className={styles.contentImage} 
                />
              </div>
            )}

            {/* Promo Banner on Step 1 (Moved to bottom) */}
            {activeStep === 0 && (
              <div className={styles.promoBanner}>
                <h3 className={styles.promoTitle}>{t('tutorialSteps.promoTitle')}</h3>
                <p className={styles.promoDesc}>{t('tutorialSteps.promoDesc')}</p>
                <a 
                  href="https://ikako.vip/r/xfrostyy" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className={styles.promoBtn}
                >
                  {t('tutorialSteps.promoBtn')}
                </a>
              </div>
            )}

            {/* Navigation Controls */}
            <div className={styles.navigationControls}>
              <button 
                className={`${styles.navBtn} ${activeStep === 0 ? styles.navBtnDisabled : ''}`}
                onClick={prevStep}
                disabled={activeStep === 0}
              >
                <FontAwesomeIcon icon={faArrowLeft} /> {t('tutorials.prev')}
              </button>
              <button 
                className={`${styles.navBtn} ${styles.navBtnPrimary} ${activeStep === translatedSteps.length - 1 ? styles.navBtnDisabled : ''}`}
                onClick={nextStep}
                disabled={activeStep === translatedSteps.length - 1}
              >
                {t('tutorials.next')} <FontAwesomeIcon icon={faArrowRight} />
              </button>
            </div>

          </div>
        </main>
      </div>

      {/* Zoomed Image Modal */}
      {zoomedImage && (
        <div className={styles.imageZoomOverlay} onClick={() => setZoomedImage(null)}>
          <button className={styles.closeZoomBtn} onClick={() => setZoomedImage(null)}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
          <img src={zoomedImage} alt="Zoomed" className={styles.zoomedImage} onClick={(e) => e.stopPropagation()} />
        </div>
      )}

    </div>
  );
}