'use client';
import { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { translateStatus as translateStatusFe, translateLocation as translateLocationFe } from '@/utils/trackingTranslations';
import styles from '@/styles/Tracking.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHashtag,
  faTruck,
  faCalendarDay,
  faBox,
  faMapPin,
  faExclamationTriangle,
  faSearch,
  faArrowRight,
  faGlobe,
  faCalendarAlt,
  faUser,
  faInfoCircle,
  faTimes,
  faMap
} from '@fortawesome/free-solid-svg-icons';
import TrackingGlobe from './TrackingGlobe';

const COUNTRY_MAP = {
  'PL': 'POLSKA',
  'DE': 'NIEMCY',
  'CN': 'CHINY',
  'NL': 'HOLANDIA',
  'GB': 'WIELKA BRYTANIA',
  'US': 'USA',
  'FR': 'FRANCJA',
  'ES': 'HISZPANIA',
  'IT': 'WŁOCHY',
  'BE': 'BELGIA',
  'CZ': 'CZECHY',
  'SK': 'SŁOWACJA',
  'HU': 'WĘGRY',
  'AT': 'AUSTRIA'
};

export default function Tracking() {
  const { t, language } = useLanguage();
  const [trackingCode, setTrackingCode] = useState('');
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [showGlobe, setShowGlobe] = useState(false);
  const itemsToShow = 15;
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const lastCode = localStorage.getItem('last_tracking_code');
      if (lastCode && initialLoad) {
        // Just show it as last searched, don't auto-fetch
        setInitialLoad(false);
      }
    }
  }, [initialLoad]);

  const lastSearchedCode = typeof window !== 'undefined' ? localStorage.getItem('last_tracking_code') : null;

  const fetchTrackingData = async (code) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('last_tracking_code', code);
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/tracking/${encodeURIComponent(code)}?lang=en`);
      if (!response.ok) throw new Error(t('tracking.errorServer'));
      const data = await response.json();
      if (!data.success) {
        setError(data.message || t('tracking.errorNotFound'));
        setTrackingData(null);
      } else {
        setTrackingData(data);
      }
    } catch (err) {
      setError(t('tracking.errorGeneral'));
      setTrackingData(null);
    }
    setLoading(false);
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (trackingCode) {
      fetchTrackingData(trackingCode);
    }
  };

  const toggleShowAll = () => {
    setShowAll((prev) => !prev);
  };

  // Logic to group tracking data by country
  const groupedData = useMemo(() => {
    if (!trackingData?.Szczegóły_przesyłki) return [];

    const countryNameDisplay = typeof Intl !== 'undefined' && Intl.DisplayNames 
      ? new Intl.DisplayNames([language || 'pl'], { type: 'region' }) 
      : null;

    const getCountryInfo = (item) => {
      const status = (item.Status || '').toLowerCase();
      const location = (item.Lokalizacja || '').toLowerCase();
      
      // Translate to Polish for reliable keyword matching regardless of API response language
      const translatedStatus = translateStatusFe(item.Status, 'pl').toLowerCase();
      const translatedLoc = translateLocationFe(item.Lokalizacja, 'pl').toLowerCase();
      const fullText = (status + ' ' + location + ' ' + translatedStatus + ' ' + translatedLoc);

      // 1. Detect explicit country codes in parentheses (e.g. (NL), (DE), (US))
      const codeMatch = fullText.match(/\(([A-Z]{2})\)/i);
      if (codeMatch) {
        const code = codeMatch[1].toUpperCase();
        if (COUNTRY_MAP[code]) return { code, name: COUNTRY_MAP[code] };
        
        try {
          if (countryNameDisplay) {
            const name = countryNameDisplay.of(code);
            return { code, name: name.toUpperCase() };
          }
        } catch (e) {}
        return { code, name: code };
      }

      // 2. Explicit location codes/names have priority over status keywords
      if (location === 'pl' || location.includes('polska') || location.includes('poland') || location.includes('warszawa')) return { code: 'PL', name: 'POLSKA' };
      if (location === 'de' || location.includes('niemcy') || location.includes('germany') || location.includes('frankfurt')) return { code: 'DE', name: 'NIEMCY' };
      if (location === 'nl' || location.includes('holandia') || location.includes('netherlands') || location.includes('amsterdam') || location.includes('oirschot')) return { code: 'NL', name: 'HOLANDIA' };
      if (location === 'cn' || location.includes('chiny') || location.includes('china') || location.includes('shenzhen') || location.includes('guangzhou')) return { code: 'CN', name: 'CHINY' };

      // 3. Fallback to specific status keywords if location is empty or generic
      if (
        fullText.includes('holandia') ||
        fullText.includes('schiphol') ||
        fullText.includes('haarlemmermeer') ||
        fullText.includes('lot przyleciał') ||
        fullText.includes('flight has arrived') ||
        fullText.includes('wylądowała') ||
        fullText.includes('demontaż tablicy') ||
        fullText.includes('dismantling the board') ||
        fullText.includes('w oczekiwaniu na skanowanie') ||
        fullText.includes('pending scanning') ||
        fullText.includes('odprawa celna') ||
        fullText.includes('customs clearance') ||
        fullText.includes('cleared customs')
      ) {
        return { code: 'NL', name: 'HOLANDIA' };
      }
      
      if (
        fullText.includes('frankfurt') || 
        fullText.includes('niemcy') || 
        fullText.includes('germany') || 
        (fullText.includes('dhl') && !fullText.includes('pl'))
      ) {
        return { code: 'DE', name: 'NIEMCY' };
      }
      
      if (
        fullText.includes('warszawa') || 
        fullText.includes('polska') || 
        fullText.includes('poland') || 
        fullText.includes('dostarczona') ||
        fullText.includes('doręczono') ||
        fullText.includes('delivered')
      ) {
        return { code: 'PL', name: 'POLSKA' };
      }
      
      // Default to origin
      return { code: 'CN', name: 'CHINY' };
    };

    const rawGroups = [];
    let currentGroup = null;

    const items = showAll ? trackingData.Szczegóły_przesyłki : trackingData.Szczegóły_przesyłki.slice(0, itemsToShow);

    items.forEach((item) => {
      const country = getCountryInfo(item);
      if (!currentGroup || currentGroup.code !== country.code) {
        currentGroup = {
          ...country,
          items: []
        };
        rawGroups.push(currentGroup);
      }
      currentGroup.items.push(item);
    });

    // Merge adjacent groups with the same country code
    // (prevents NL → CN → NL fragmentation when one event is misdetected)
    const groups = [];
    rawGroups.forEach((group) => {
      const prev = groups[groups.length - 1];
      if (prev && prev.code === group.code) {
        prev.items = [...prev.items, ...group.items];
      } else {
        groups.push({ ...group, items: [...group.items] });
      }
    });

    return groups;
  }, [trackingData, showAll, language]);

  const [showSidePanel, setShowSidePanel] = useState(true);

  return (
    <div className={styles.trackingPage}>
      <div className={styles.nebulaGlow} />

      <div className={`${styles.mainContainer} ${styles.animateIn}`}>
        {/* ... existing main container content ... */}
        <div className={styles.header}>
          <h1>{t('tracking.title')}</h1>
          <p>{t('tracking.subtitle')}</p>
        </div>

        <div className={styles.trackingBox}>
          <form onSubmit={handleSubmit} className={styles.inputGroup}>
            <FontAwesomeIcon icon={faSearch} className={styles.inputIcon} />
            <input
              type="text"
              className={styles.input}
              placeholder={t('tracking.placeholder')}
              value={trackingCode}
              onChange={(e) => setTrackingCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
            <button className={styles.trackBtn} type="submit" disabled={loading}>
              {loading ? <div className={styles.spinnerSmall}></div> : <FontAwesomeIcon icon={faArrowRight} />}
            </button>
          </form>

          {lastSearchedCode && (
            <div className={styles.lastSearched} onClick={() => {
              setTrackingCode(lastSearchedCode);
              fetchTrackingData(lastSearchedCode);
            }}>
              <span>OSTATNIO SZUKANE:</span> <strong>{lastSearchedCode}</strong> <FontAwesomeIcon icon={faArrowRight} />
            </div>
          )}

          {error && (
            <div className={styles.statusMsg}>
              <FontAwesomeIcon icon={faExclamationTriangle} /> {error}
            </div>
          )}

          {trackingData && (
            <div className={styles.resultCard}>
              
              <div className={styles.mapBannerWrapper}>
                <span className={styles.betaBadge}>{t('tracking.beta')}</span>
                <div className={styles.mapBanner} onClick={() => setShowGlobe(true)}>
                  <h3>
                    {t('tracking.open3DMap')} <FontAwesomeIcon icon={faArrowRight} />
                  </h3>
                </div>
              </div>

              <div className={styles.mainInfoSection}>
                <h2 className={styles.sectionTitle}>{t('tracking.mainInfo')}</h2>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <FontAwesomeIcon icon={faHashtag} />
                    <span><strong>{t('tracking.reference')}:</strong> {trackingData.Informacje_główne['Numer referencyjny']}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <FontAwesomeIcon icon={faTruck} />
                    <span><strong>{t('tracking.trackingNumber')}:</strong> {trackingData.Informacje_główne['Numer śledzenia']}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <FontAwesomeIcon icon={faGlobe} />
                    <span><strong>{t('tracking.country')}:</strong> {translateLocationFe(trackingData.Informacje_główne.Kraj || 'Polska', language)}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <FontAwesomeIcon icon={faCalendarAlt} />
                    <span><strong>{t('tracking.date')}:</strong> {trackingData.Informacje_główne.Data}</span>
                  </div>
                  {trackingData.Informacje_główne.Odbiorca && (
                    <div className={styles.infoItem}>
                      <FontAwesomeIcon icon={faUser} />
                      <span><strong>{t('tracking.recipient')}:</strong> {trackingData.Informacje_główne.Odbiorca}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.timelineSection}>
                <h2 className={styles.sectionTitle}>{t('tracking.history')}</h2>
                
                {groupedData.map((group, gIndex) => (
                  <div key={gIndex} className={styles.countryGroup}>
                      <div className={styles.countryHeader}>
                        <span className={styles.countryCode}>{group.code}</span>
                        <h3 className={styles.countryName}>{translateLocationFe(group.name, language).toUpperCase()}</h3>
                        <div className={styles.countryDivider} />
                      </div>
                      
                      <div className={styles.timelineWrapper}>
                        {group.items.map((detail, index) => (
                          <div key={index} className={styles.timelineItem}>
                            <div className={styles.timelineDot}></div>
                            <div className={styles.timelineContent}>
                              <p className={styles.timelineDate}>
                                <FontAwesomeIcon icon={faCalendarDay} />
                                {detail.Data}
                              </p>
                              <p className={styles.timelineStatus}>
                                {translateStatusFe(detail.Status, language)}
                              </p>
                              {detail.Lokalizacja && (
                                <p className={styles.timelineLocation}>
                                  <FontAwesomeIcon icon={faMapPin} />
                                  {translateLocationFe(detail.Lokalizacja, language)}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                  </div>
                ))}

                {trackingData.Szczegóły_przesyłki.length > itemsToShow && (
                  <button className={styles.showMoreBtn} onClick={toggleShowAll}>
                    {showAll ? t('tracking.showLess') : t('tracking.showMore')}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showGlobe && (
        <div className={styles.globeModal}>
          <div className={styles.globeHeader}>
            <button className={styles.closeGlobe} onClick={() => setShowGlobe(false)}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>

          <button 
            className={`${styles.mobileInfoToggle} ${showSidePanel ? styles.active : ''}`}
            onClick={() => setShowSidePanel(!showSidePanel)}
          >
            <FontAwesomeIcon icon={showSidePanel ? faTimes : faInfoCircle} />
          </button>
          
          <div className={`${styles.sideInfoBox} ${showSidePanel ? styles.visible : styles.hidden}`}>
            <h2 className={styles.floatingTitle}>{t('tracking.location')}</h2>
            
            <div className={styles.statusSection}>
              <p className={styles.statusLabel}>{t('tracking.status')}:</p>
              <p className={styles.statusValue}>{translateStatusFe(trackingData.Informacje_główne['Ostatni status'], language)}</p>
            </div>

            <div className={styles.locationSection}>
              <p className={styles.statusLabel}>{t('tracking.location')}:</p>
              <p className={styles.locationLabel}>{translateLocationFe(trackingData.Informacje_główne.Kraj || 'Polska', language)}</p>
            </div>

            <div className={styles.deliverySection}>
              <p className={styles.deliveryTimeLabel}>{t('tracking.date')}:</p>
              <p className={styles.deliveryTimeValue}>
                {trackingData.Informacje_główne['Ostatni status'].toLowerCase().includes('deliv') || trackingData.Informacje_główne['Ostatni status'].toLowerCase().includes('dostarczon') 
                  ? (language === 'pl' ? 'DOSTARCZONO' : (language === 'de' ? 'ZUGESTELLT' : 'DELIVERED')) 
                  : (language === 'pl' ? 'W DRODZE' : (language === 'de' ? 'UNTERWEGS' : 'IN TRANSIT'))}
              </p>
            </div>


          </div>

          <TrackingGlobe data={trackingData} />
        </div>
      )}
    </div>
  );
}