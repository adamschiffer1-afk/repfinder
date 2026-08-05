'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCalculator, 
  faBoxOpen, 
  faPlus, 
  faTrash, 
  faSave, 
  faInfoCircle, 
  faCheckCircle, 
  faExclamationTriangle,
  faTags,
  faWeightHanging,
  faRuler,
  faChevronRight,
  faUndo,
  faTimes
} from '@fortawesome/free-solid-svg-icons';
import styles from '@/styles/Calculator.module.css';
import { useLanguage } from '@/context/LanguageContext';
import { useCurrency } from '@/hooks/useCurrency';

export default function Calculator() {
  const { language, t } = useLanguage();
  const { currency, formatPrice } = useCurrency();
  
  const QUICK_TAGS_DYNAMIC = [
    { label: language === 'pl' ? 'Koszulka' : (t('products.t-shirts') || 'T-shirt'), name: 'T-shirt', weight: 230 },
    { label: language === 'pl' ? 'Klapki' : 'Slides', name: 'Slides', weight: 400 },
    { label: language === 'pl' ? 'Dresy' : (t('products.pants') || 'Tracksuit'), name: 'Tracksuit', weight: 600 },
    { label: language === 'pl' ? 'Zegarek' : 'Watch', name: 'Watch', weight: 150 },
  ];

  const [items, setItems] = useState([]);
  const [isShoeCurrentItem, setIsShoeCurrentItem] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemSize, setItemSize] = useState('');
  const [itemWeight, setItemWeight] = useState('');
  const [itemQty, setItemQty] = useState(1);
  const [includeBox, setIncludeBox] = useState(false);
  const [includeCoupon, setIncludeCoupon] = useState(true);
  const [selectedCoupon, setSelectedCoupon] = useState('frostyy'); // 'frostyy' (-$15 flat) or 'frostyy20' (-20%)
  const [isAiActive, setIsAiActive] = useState(false);
  const [savedPackages, setSavedPackages] = useState([]);
  const [saveFlash, setSaveFlash] = useState(false);

  // Live Shipping Estimation API states
  const [liveShippingLines, setLiveShippingLines] = useState([]);
  const [isLoadingLive, setIsLoadingLive] = useState(false);
  const [liveError, setLiveError] = useState(null);

  // Ref for shipping section (for scroll-to)
  const shippingRef = useRef(null);

  // Currency rates (kept for coupon savings display only)
  const USD_TO_PLN = 3.65;

    // Auto-estimate weight via backend API to protect logic
  useEffect(() => {
    if (!itemName) {
      setIsAiActive(false);
      setIsShoeCurrentItem(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/calculator/estimate-weight', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemName, itemSize, includeBox })
        });
        const data = await res.json();
        
        if (data.weight > 0) {
          setItemWeight(data.weight);
          setIsAiActive(data.isAiActive);
          setIsShoeCurrentItem(data.isShoe);
        } else {
          setIsAiActive(false);
          setIsShoeCurrentItem(data.isShoe);
        }
      } catch (err) {
        setIsAiActive(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [itemName, itemSize, includeBox]);

  const handleAddItem = (e) => {
    if (e) e.preventDefault();
    if (!itemName) return;

    const parsedWeight = parseFloat(itemWeight) || 0;
    const boxW = isShoeCurrentItem ? 350 : 100;
    const baseW = includeBox ? Math.max(0, parsedWeight - boxW) : parsedWeight;

    const newItem = {
      id: Date.now(),
      name: itemName,
      size: itemSize || 'Universal',
      baseWeight: baseW,
      weight: parsedWeight,
      qty: itemQty,
      hasBox: includeBox,
      isShoe: isShoeCurrentItem
    };

    setItems([...items, newItem]);
    setItemName('');
    setItemSize('');
    setItemWeight('');
    setItemQty(1);
    setIncludeBox(false);
  };

  const handleToggleItemBox = (itemId) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const nextHasBox = !item.hasBox;
        const boxW = item.isShoe ? 350 : 100;
        const nextWeight = item.baseWeight + (nextHasBox ? boxW : 0);
        return {
          ...item,
          hasBox: nextHasBox,
          weight: nextWeight
        };
      }
      return item;
    }));
  };

  const handleRemoveItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleClearAll = () => {
    setItems([]);
  };

  // Load saved packages on mount
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('rf_saved_packages') || '[]');
    setSavedPackages(stored);
  }, []);

  const handleRestorePackage = (pkg) => {
    setItems(pkg.items.map(item => ({ ...item, id: Date.now() + Math.random() })));
    setIncludeCoupon(pkg.includeCoupon);
    setSelectedCoupon(pkg.selectedCoupon);
    // scroll back to top of left column
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteSavedPackage = (pkgId) => {
    const updated = savedPackages.filter(p => p.id !== pkgId);
    setSavedPackages(updated);
    localStorage.setItem('rf_saved_packages', JSON.stringify(updated));
  };

  const handleSavePackage = () => {
    if (items.length === 0) return;
    const packageData = {
      id: Date.now(),
      savedAt: new Date().toISOString(),
      items: [...items],
      totalWeight,
      includeCoupon,
      selectedCoupon,
    };
    const existing = JSON.parse(localStorage.getItem('rf_saved_packages') || '[]');
    const updated = [packageData, ...existing].slice(0, 10); // keep last 10
    localStorage.setItem('rf_saved_packages', JSON.stringify(updated));
    setSavedPackages(updated);
    // Flash feedback
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 2000);
    // Scroll to shipping section
    setTimeout(() => {
      if (shippingRef.current) {
        shippingRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150);
  };

  const handleQuickTagClick = (tag) => {
    setItemName(tag.name);
    setItemWeight(tag.weight);
  };

  // Calculations
  const totalItemWeight = items.reduce((sum, item) => sum + (item.weight * item.qty), 0);
  const masterBoxWeight = items.length > 0 ? 350 : 0; // master shipping carton weight
  const itemBoxesWeight = items.reduce((sum, item) => {
    if (item.hasBox) {
      const boxW = item.isShoe ? 350 : 100;
      return sum + (boxW * item.qty);
    }
    return sum;
  }, 0);
  const packagingWeight = masterBoxWeight + itemBoxesWeight;
  const totalWeight = totalItemWeight + masterBoxWeight;

  // Fallback DHL base rules
  const getDhlPrice = (weightInGrams) => {
    if (weightInGrams === 0) return 0;
    const steps = Math.ceil(weightInGrams / 500);
    return 16 + (steps - 1) * 7.5;
  };

  // Fallback EMS base rules
  const getEmsPrice = (weightInGrams) => {
    if (weightInGrams === 0) return 0;
    const steps = Math.ceil(weightInGrams / 500);
    return 12 + (steps - 1) * 5.8;
  };

  const rawDhlUsd = getDhlPrice(totalWeight);
  const rawEmsUsd = getEmsPrice(totalWeight);

  // Helper to extract raw USD cost of a live line
  const getLineRawUsd = (line) => {
    if (line && line.calc_fee_list && line.calc_fee_list.total_fee !== undefined) {
      return parseFloat(line.calc_fee_list.total_fee);
    }
    return 0;
  };

  // Apply Coupon logic
  const calculateDiscountedPrice = (rawUsd, couponType) => {
    if (rawUsd === 0) return 0;
    if (!includeCoupon) return rawUsd;
    
    if (couponType === 'frostyy') {
      // -$15 USD coupon, min cost is $1
      return Math.max(1, rawUsd - 15);
    } else if (couponType === 'frostyy20') {
      // -20% coupon
      return rawUsd * 0.8;
    }
    return rawUsd;
  };

  // Filter out live shipping lines that are active/successful
  const successfulLiveLines = liveShippingLines.filter(line => !line.err_msg_arr || line.err_msg_arr.length === 0);
  
  let cheapestLiveRawUsd = 0;
  if (successfulLiveLines.length > 0) {
    const sortedLive = [...successfulLiveLines].sort((a, b) => getLineRawUsd(a) - getLineRawUsd(b));
    cheapestLiveRawUsd = getLineRawUsd(sortedLive[0]);
  }

  // Use cheapest live line raw price if available, otherwise fallback to simulated DHL
  const activeCheapestRawUsd = cheapestLiveRawUsd > 0 ? cheapestLiveRawUsd : rawDhlUsd;

  // Dynamic calculations based on cheapest carrier (live or fallback)
  const finalDhlUsd = calculateDiscountedPrice(activeCheapestRawUsd, selectedCoupon);
  const finalDhlPln = finalDhlUsd * USD_TO_PLN;
  const rawDhlPln = activeCheapestRawUsd * USD_TO_PLN;

  // EMS fallback calculation
  const finalEmsUsd = calculateDiscountedPrice(rawEmsUsd, selectedCoupon);
  const finalEmsPln = finalEmsUsd * USD_TO_PLN;
  const rawEmsUsdPln = rawEmsUsd * USD_TO_PLN;

  // Coupon performance logic to show "LEPIEJ" (better) badge dynamically
  const zthDhlDiscount = activeCheapestRawUsd - calculateDiscountedPrice(activeCheapestRawUsd, 'frostyy');
  const zth20DhlDiscount = activeCheapestRawUsd - calculateDiscountedPrice(activeCheapestRawUsd, 'frostyy20');
  const betterCoupon = zthDhlDiscount >= zth20DhlDiscount ? 'frostyy' : 'frostyy20';

  const selectedDiscountAmountUsd = activeCheapestRawUsd - finalDhlUsd;
  const selectedDiscountAmountPln = selectedDiscountAmountUsd * USD_TO_PLN;

  // Live estimates fetch with 400ms debounce
  useEffect(() => {
    if (totalWeight === 0) {
      setLiveShippingLines([]);
      setIsLoadingLive(false);
      return;
    }

    setIsLoadingLive(true);
    setLiveError(null);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/shipping/estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ weight: totalWeight })
        });
        const data = await res.json();
        if (data.success && data.data && data.data.list) {
          setLiveShippingLines(data.data.list);
        } else {
          setLiveError(data.msg || (language === 'pl' ? 'Błąd pobierania cen na żywo' : 'Error fetching live rates'));
        }
      } catch (err) {
        setLiveError(language === 'pl' ? 'Błąd połączenia' : 'Connection error');
      } finally {
        setIsLoadingLive(false);
      }
    }, 400);

  }, [totalWeight, language]);

  return (
    <div className={styles.calcPage}>
      <div className={styles.nebulaGlow} />

      <div className={styles.mainContainer}>
        
        {/* ─── NATIVE HEADER WITH OFFICIAL LOGO ─── */}
        <div className={styles.header}>
          <img src="/images/rf-logo-removebg-preview.png" alt="RepFinder Logo" className={styles.headerLogo} />
          <h1>{t('calculator.title')}</h1>
          <p>{t('calculator.subtitle')}</p>
        </div>

        {/* ─── SPLIT WORKSPACE CONTAINER (DWUKOLUMNOWY LAYOUT) ─── */}
        <div className={styles.splitWorkspace}>
          
          {/* ─── LEWA KOLUMNA: KONSOLA, PÓŁKA I PODSUMOWANIE ─── */}
          <div className={styles.calcLeftColumn}>
            
            {/* ─── SEKCJA 1: KONSOLA DODAWANIA PRZEDMIOTÓW (GÓRA) ─── */}
            <div className={styles.addConsoleCard}>
              <div className={styles.cardHeaderClean}>
                <div className={styles.cardTitleBox}>
                  <span className={styles.panelIcon}>⚡</span>
                  <h2>{t('calculator.itemFormTitle')}</h2>
                </div>
                <span className={`${styles.aiPill} ${isAiActive ? styles.aiActiveGlow : ''}`}>
                  <span className={styles.aiDot} /> {language === 'pl' ? 'Inteligentne Szacowanie' : 'Smart Estimate'}
                </span>
              </div>

              <form onSubmit={handleAddItem} className={styles.consoleForm}>
                <div className={styles.consoleInputsRow}>
                  <div className={styles.inputGroupFull}>
                    <input
                      type="text"
                      placeholder={t('calculator.itemNamePlaceholder')}
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      className={styles.formInput}
                      required
                    />
                  </div>
                  <div className={styles.inputWrapperMedium}>
                    <input
                      type="text"
                      placeholder={t('calculator.itemSizePlaceholder')}
                      value={itemSize}
                      onChange={(e) => setItemSize(e.target.value)}
                      className={styles.formInput}
                    />
                  </div>
                  <div className={styles.inputWrapperMedium}>
                    <input
                      type="number"
                      placeholder={t('calculator.itemWeightPlaceholder')}
                      value={itemWeight}
                      onChange={(e) => setItemWeight(e.target.value)}
                      className={styles.formInput}
                      required
                    />
                  </div>
                  
                  {/* Quantity Selector */}
                  <div className={styles.qtySelector}>
                    <button 
                      type="button" 
                      onClick={() => setItemQty(Math.max(1, itemQty - 1))}
                      className={styles.qtyBtn}
                    >
                      -
                    </button>
                    <span className={styles.qtyValue}>{itemQty}</span>
                    <button 
                      type="button" 
                      onClick={() => setItemQty(itemQty + 1)}
                      className={styles.qtyBtn}
                    >
                      +
                    </button>
                  </div>

                  {/* Add Button & Shoe Box Switch inline if applicable */}
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap'}}>
                    {isShoeCurrentItem && (
                      <div style={{display: 'flex', alignItems: 'center', background: 'rgba(139, 92, 246, 0.05)', border: '1px dashed rgba(139, 92, 246, 0.25)', borderRadius: '12px', height: '48px', padding: '0 12px'}}>
                        <span style={{fontSize: '11px', color: '#8a8e9b', fontWeight: 'bold'}}>{language === 'pl' ? 'Pudełko:' : 'Box:'}</span>
                        <label className={styles.switch} style={{marginLeft: '10px'}}>
                          <input 
                            type="checkbox" 
                            checked={includeBox} 
                            onChange={(e) => setIncludeBox(e.target.checked)} 
                          />
                          <span className={`${styles.slider} ${styles.round}`} />
                        </label>
                        <span style={{fontSize: '11px', color: '#a78bfa', fontWeight: 'bold', marginLeft: '8px', whiteSpace: 'nowrap'}}>
                          {includeBox ? t('calculator.boxToggleYes') : t('calculator.boxToggleNo')} (+350g)
                        </span>
                      </div>
                    )}

                    <button type="submit" className={styles.addButtonConsole}>
                      <FontAwesomeIcon icon={faPlus} style={{marginRight: '8px'}} /> {t('calculator.addItemBtn')}
                    </button>
                  </div>
                </div>
              </form>

              <div className={styles.quickChipsCloud}>
                {QUICK_TAGS_DYNAMIC.map((tag, idx) => (
                  <span 
                    key={idx} 
                    className={styles.quickChip}
                    onClick={() => handleQuickTagClick(tag)}
                  >
                    ⚡ {tag.label} ({tag.weight}g)
                  </span>
                ))}
              </div>
            </div>

            {/* ─── SEKCJA 2: WIZUALNA PÓŁKA PAKOWANIA „TWÓJ KARTON” (ŚRODEK) ─── */}
            <div className={styles.packingShelfCard}>
              <div className={styles.shelfHeader}>
                <div className={styles.cardTitleBox}>
                  <span className={styles.panelIcon}>🛒</span>
                  <h2>{t('calculator.itemBasketTitle')}</h2>
                </div>
                {items.length > 0 && (
                  <span className={styles.shelfCountBadge}>
                    {items.length} {items.length === 1 ? (language === 'pl' ? 'przedmiot' : 'item') : (language === 'pl' ? 'przedmioty' : 'items')}
                  </span>
                )}
              </div>

              <div className={styles.shelfContainer}>
                {items.length === 0 ? (
                  <div className={styles.emptyShelfVisual}>
                    <span className={styles.emptyShelfBox}>📦</span>
                    <p className={styles.emptyShelfText}>
                      {t('calculator.emptyBasket')}
                    </p>
                  </div>
                ) : (
                  <div className={styles.horizontalShelfRow}>
                    {items.map(item => (
                      <div key={item.id} className={item.hasBox ? `${styles.shelfItemCard} ${styles.purpleGlowCard}` : styles.shelfItemCard}>
                        <span className={styles.shelfItemBadge}>{item.qty}x</span>
                        <div className={styles.shelfItemInfo}>
                          <h4 className={styles.shelfItemTitle}>{item.name}</h4>
                          <p className={styles.shelfItemMeta}>
                            {language === 'pl' ? 'Rozmiar:' : 'Size:'} {item.size}
                          </p>
                        </div>
                        <div className={styles.shelfItemActions}>
                          <span className={styles.shelfItemWeight}>{item.weight} g</span>
                          {item.isShoe && (
                            <button
                              type="button"
                              className={`${styles.shelfBoxTag} ${item.hasBox ? styles.shelfBoxTagActive : ''}`}
                              onClick={() => handleToggleItemBox(item.id)}
                              title={item.hasBox ? (language === 'pl' ? 'Usuń pudełko' : 'Remove box') : (language === 'pl' ? 'Dodaj pudełko' : 'Add box')}
                            >
                              {item.hasBox ? t('calculator.boxToggleYes') : t('calculator.boxToggleNo')}
                            </button>
                          )}
                          <button 
                            className={styles.shelfDeleteBtn}
                            onClick={() => handleRemoveItem(item.id)}
                            aria-label="Remove item"
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ─── SEKCJA 4: DOLNY PANEL PODSUMOWANIA I KUPONÓW (STOPKA) ─── */}
            <div className={styles.bottomSummaryDashboard}>
              <div className={styles.summaryStatsRow}>
                <div className={styles.summaryStatItem}>
                  <span className={styles.statLabel}>{language === 'pl' ? 'Łączna Waga Paczki:' : 'Total Package Weight:'}</span>
                  <span className={styles.statValue}>{totalWeight} g ({(totalWeight / 1000).toFixed(2)} kg)</span>
                </div>
                {packagingWeight > 0 && (
                  <div className={styles.summaryStatItem}>
                    <span className={styles.statLabel}>{language === 'pl' ? 'Waga Opakowań:' : 'Packaging Weight:'}</span>
                    <span className={styles.statValueSec}>{packagingWeight} g</span>
                  </div>
                )}
              </div>

              <div className={styles.dividerLine} />

              <div className={styles.summaryCouponRow}>
                <div className={styles.couponToggleBlock}>
                  <span className={styles.toggleLabel}>{language === 'pl' ? 'Uwzględnij kupon rabatowy Kakobuy' : 'Include Kakobuy Coupon'}</span>
                  <label className={styles.switch}>
                    <input type="checkbox" checked={includeCoupon} onChange={(e) => setIncludeCoupon(e.target.checked)} />
                    <span className={`${styles.slider} ${styles.round}`}></span>
                  </label>
                </div>

                {includeCoupon && (
                  <div className={styles.summaryCouponTabsContainer}>
                    <div className={styles.couponsTabs}>
                      <button 
                        type="button" 
                        className={`${styles.couponTabBtn} ${selectedCoupon === 'frostyy' ? styles.couponTabActive : ''}`} 
                        onClick={() => setSelectedCoupon('frostyy')}
                      >
                        <span className={styles.tabCode}>frostyy</span>
                        <span className={styles.tabBenefit}>{language === 'pl' ? '-15 USD' : '-$15 USD'}</span>
                      </button>
                      <button 
                        type="button" 
                        className={`${styles.couponTabBtn} ${selectedCoupon === 'frostyy20' ? styles.couponTabActive : ''}`} 
                        onClick={() => setSelectedCoupon('frostyy20')}
                      >
                        <span className={styles.tabCode}>frostyy20</span>
                        <span className={styles.tabBenefit}>-20%</span>
                      </button>
                    </div>

                    <div className={styles.couponAppliedCallout}>
                      <span className={styles.greenSparkle}>✨</span>
                      <span className={styles.calloutText}>
                        {language === 'pl' 
                          ? `Zastosowano kupon ${selectedCoupon} (oszczędzasz ${totalWeight > 0 ? formatPrice(selectedDiscountAmountUsd) : formatPrice(15)})`
                          : `Applied coupon ${selectedCoupon} (saving ${totalWeight > 0 ? formatPrice(selectedDiscountAmountUsd) : formatPrice(15)})`}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Promo & Actions Row */}
              <div className={styles.promoActionsContainer}>
                {/* Referral Promo Card with Purple theme & fioletowy glow */}
                <div className={`${styles.referralInlineCard} ${styles.purpleGlowCard}`}>
                  <span className={styles.giftIcon}>🎁</span>
                  <div className={styles.referralTextGroup}>
                    <h4 className={styles.referralTitleInline}>{t('calculator.referralTitle')}</h4>
                    <p className={styles.referralDescInline}>{t('calculator.referralDesc')}</p>
                  </div>
                  <a href="https://ikako.vip/r/xfrostyy" target="_blank" rel="noopener noreferrer" className={styles.referralLinkInline}>
                    {t('calculator.referralBtn')} →
                  </a>
                </div>

                <div className={styles.dashboardActionButtons}>
                  <button 
                    className={styles.resetBtn} 
                    onClick={handleClearAll} 
                    disabled={items.length === 0}
                    title={language === 'pl' ? 'Wyczyść paczkę' : 'Clear package'}
                  >
                    <FontAwesomeIcon icon={faUndo} style={{marginRight: '8px'}} /> {language === 'pl' ? 'WYCZYŚĆ PACZKĘ' : 'CLEAR PACKAGE'}
                  </button>
                  
                  <button 
                    className={`${styles.saveBtn} ${saveFlash ? styles.saveBtnFlash : ''}`} 
                    onClick={handleSavePackage} 
                    disabled={items.length === 0}
                  >
                    <FontAwesomeIcon icon={faSave} style={{marginRight: '8px'}} />
                    {saveFlash
                      ? (language === 'pl' ? '✓ ZAPISANO!' : '✓ SAVED!')
                      : (language === 'pl' ? 'ZAPISZ PACZKE' : 'SAVE PACKAGE')}
                  </button>
                </div>
              </div>
            </div>

          {/* ─── ZAPISANE PACZKI ─── */}
          {savedPackages.length > 0 && (
            <div className={styles.savedPackagesCard}>
              <div className={styles.shelfHeader}>
                <div className={styles.cardTitleBox}>
                  <span className={styles.panelIcon}>📋</span>
                  <h2>{language === 'pl' ? 'Zapisane Paczki' : 'Saved Packages'}</h2>
                </div>
                <span className={styles.shelfCountBadge}>{savedPackages.length}</span>
              </div>
              <div className={styles.savedPackagesList}>
                {savedPackages.map((pkg) => (
                  <div key={pkg.id} className={styles.savedPackageRow}>
                    <button
                      className={styles.savedPackageRestoreBtn}
                      onClick={() => handleRestorePackage(pkg)}
                      title={language === 'pl' ? 'Wczytaj tę paczkę' : 'Restore this package'}
                    >
                      <div className={styles.savedPkgInfo}>
                        <span className={styles.savedPkgDate}>
                          🕐 {new Date(pkg.savedAt).toLocaleDateString(language === 'pl' ? 'pl-PL' : 'en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className={styles.savedPkgMeta}>
                          {pkg.items.length} {language === 'pl' ? 'przedm.' : 'items'} · {pkg.totalWeight}g
                        </span>
                      </div>
                      <span className={styles.savedPkgItems}>
                        {pkg.items.slice(0, 3).map(i => i.name).join(', ')}{pkg.items.length > 3 ? '...' : ''}
                      </span>
                    </button>
                    <button
                      className={styles.savedPkgDeleteBtn}
                      onClick={() => handleDeleteSavedPackage(pkg.id)}
                      aria-label="Delete saved package"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          </div>

          {/* ─── PRAWA KOLUMNA: PRZYKLEJONA LISTA KURIERÓW ZE SCROLLOWANIEM ─── */}
          <div className={styles.calcRightColumn}>
            
            <div className={styles.shippingSection} ref={shippingRef}>
              <div className={styles.shippingSectionHeader}>
                <div className={styles.cardTitleBox}>
                  <span className={styles.panelIcon}>✈️</span>
                  <h2>{language === 'pl' ? 'Metody Wysyłki' : 'Shipping Methods'}</h2>
                </div>
                {liveShippingLines.length > 0 && (
                  <span className={styles.shelfCountBadge}>
                    {liveShippingLines.length}
                  </span>
                )}
              </div>

              {/* Scrollable Container */}
              <div className={styles.carriersScrollContainer}>
                {isLoadingLive ? (
                  <>
                    <div className={styles.skeletonColumn}>
                      <div className={styles.skeletonHeader} />
                      <div className={styles.skeletonPrice} />
                    </div>
                    <div className={styles.skeletonColumn}>
                      <div className={styles.skeletonHeader} />
                      <div className={styles.skeletonPrice} />
                    </div>
                    <div className={styles.skeletonColumn}>
                      <div className={styles.skeletonHeader} />
                      <div className={styles.skeletonPrice} />
                    </div>
                    <div className={styles.skeletonColumn}>
                      <div className={styles.skeletonHeader} />
                      <div className={styles.skeletonPrice} />
                    </div>
                  </>
                ) : liveShippingLines.length > 0 ? (
                  (() => {
                    const getLinePriority = (name) => {
                      const n = name.toLowerCase();
                      if (n.includes('dpd') || n.includes('dhl') || n.includes('tariffless') || n.includes('duty-free') || n.includes('duty free')) {
                        return 1;
                      }
                      if (n.includes('ems')) {
                        return 2;
                      }
                      return 3;
                    };

                    const successfulLiveLines = liveShippingLines.filter(line => {
                      if (line && line.calc_fee_list && line.calc_fee_list.total_fee !== undefined) {
                        const fee = parseFloat(line.calc_fee_list.total_fee);
                        return fee > 0;
                      }
                      return false;
                    });

                    const filteredLiveLines = successfulLiveLines
                      .filter(line => getLinePriority(line.name) <= 2)
                      .sort((a, b) => {
                        const pA = getLinePriority(a.name);
                        const pB = getLinePriority(b.name);
                        if (pA !== pB) return pA - pB;
                        return getLineRawUsd(a) - getLineRawUsd(b);
                      });

                    return filteredLiveLines.map((line, index) => {
                      const rawLineUsd = getLineRawUsd(line);
                      const finalLineUsd = calculateDiscountedPrice(rawLineUsd, selectedCoupon);
                      const finalLinePln = finalLineUsd * USD_TO_PLN;
                      const nameLower = line.name.toLowerCase();

                      const isDHL = nameLower.includes('dhl');
                      const isEMS = nameLower.includes('ems');
                      const isTariffless = nameLower.includes('tariffless') || nameLower.includes('duty-free') || nameLower.includes('duty free');
                      const isDPD = nameLower.includes('dpd');

                      let safetyBadge = null;
                      let isCheapest = index === 0;
                      let cardClass = styles.carrierGridCard;
                      let logoBoxClass = styles.carrierGridLogoBox;
                      let carrierAbbrev = 'LINE';

                      if (isDHL) {
                        cardClass = `${styles.carrierGridCard} ${styles.cardDhl}`;
                        logoBoxClass = styles.carrierGridLogoBoxYellow;
                        safetyBadge = <span className={styles.badgeSafest}>{language === 'pl' ? 'Bezpieczny 🛡️' : 'Safe 🛡️'}</span>;
                        carrierAbbrev = 'DHL';
                      } else if (isEMS) {
                        cardClass = `${styles.carrierGridCard} ${styles.cardEms}`;
                        logoBoxClass = styles.carrierGridLogoBoxBlue;
                        safetyBadge = <span className={styles.badgeRisk}>{language === 'pl' ? 'Ryzyko ⚠' : 'Delay Risk ⚠'}</span>;
                        carrierAbbrev = 'EMS';
                      } else if (isTariffless) {
                        logoBoxClass = styles.carrierGridLogoBoxPurple;
                        safetyBadge = <span className={styles.badgeSafest}>{language === 'pl' ? 'Bez cła 🛡️' : 'Tax-Free 🛡️'}</span>;
                        carrierAbbrev = 'TARIFF';
                      } else if (isDPD) {
                        logoBoxClass = styles.carrierGridLogoBoxDark;
                        carrierAbbrev = 'DPD';
                      }

                      if (isCheapest) {
                        cardClass += ` ${styles.cheapestGlowCard}`;
                      }

                      return (
                        <div key={line.id} className={cardClass}>
                          {isCheapest && (
                            <div className={styles.cheapestRibbon}>
                              🌟 {language === 'pl' ? 'REKOMENDOWANY' : 'RECOMMENDED'}
                            </div>
                          )}
                          <div className={styles.carrierGridHeader}>
                            <div className={logoBoxClass}>
                              <span className={styles.carrierNameBold}>{carrierAbbrev}</span>
                            </div>
                            {safetyBadge}
                          </div>
                          <div className={styles.carrierGridBody}>
                            <p className={styles.lineFullName}>{line.name}</p>
                            <div className={styles.carrierGridTransit}>
                              <span>⏱️ {language === 'pl' ? 'Dostawa:' : 'Transit:'}</span>
                              <strong>{line.cycle || line.day || 'N/A'}</strong>
                            </div>
                            <div className={styles.carrierGridDivider} />
                            <div className={styles.carrierGridPriceRow}>
                              {/* Baza fee removed */}
                              <div className={styles.carrierGridPriceGroup}>
                                <p className={styles.priceBigUsd}>{formatPrice(finalLineUsd)}</p>
                                {currency === 'USD' && <p className={styles.priceSubPln}>~{finalLinePln.toFixed(2)} PLN</p>}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()
                ) : (
                  <div className={styles.liveErrorWidescreen} style={{borderColor: 'rgba(239, 68, 68, 0.3)', minHeight: '180px'}}>
                    <span>⚠️</span>
                    <p style={{fontSize: '12px'}}>{language === 'pl' ? 'Brak aktywnych metod wysyłki dla tej wagi.' : 'No active shipping lines found for this weight.'}</p>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
