'use client';
import { useState, useEffect } from 'react';
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
  faUndo
} from '@fortawesome/free-solid-svg-icons';
import styles from '@/styles/Calculator.module.css';
import { useLanguage } from '@/context/LanguageContext';

const ESTIMATED_WEIGHTS = {
  // ── Longest / Most specific first ──
  'stone island hoodie': 750,
  'gallery dept hoodie': 750,
  'denim tears t-shirt': 230,
  'stone island t-shirt': 220,
  'hellstar t-shirt': 280,
  'corteiz t-shirt': 220,
  'stone island hat': 100,
  'cp knitted hat': 110,
  'chrome hearts hat': 110,
  'essentials shorts': 320,
  'eric emanuel shorts': 150,
  'essentials hoodie': 850,
  'essentials pants': 550,
  'yeezy slide': 400,
  'jordan shorts': 280,
  'jordan 13': 1100,
  'jordan 11': 1000,
  'jordan 4': 1250,
  'jordan 1': 950,
  'lv trainer': 1250,
  'asics nyc': 850,
  'acics nyc': 850,
  'yeezy foam': 500,
  'yeezy 350': 750,
  'yeezy 500': 950,
  'yeezy 700': 950,
  'lv skate': 1250,
  'dior b22': 1200,
  'dior b30': 1100,
  'dior b33': 1050,
  'dior b27': 1050,
  'air force 1': 1000,
  'bape hoodie': 780,
  'corteiz hoodie': 760,
  'hellstar hoodie': 800,
  'sp5der hoodie': 750,
  'bape t-shirt': 220,
  'stussy t-shirt': 210,
  'celine hat': 100,
  'prada hat': 100,
  'burberry hat': 100,
  'moncler hat': 120,
  'gucci bag': 800,
  'lv bag': 800,
  'prada bag': 750,
  'dior bag': 800,
  'stussy bag': 400,
  
  // ── Medium specific ──
  'ee shorts': 150,
  'air max': 900,
  'special': 700,
  'samba': 650,
  'gazelle': 650,
  'spezial': 650,
  'campus': 700,
  'lanvin': 1150,
  'goyard': 700,
  't-shirt': 230,
  'koszulka': 230,
  'tee': 230,
  'tshirt': 230,
  'klapki': 400,
  'slides': 450,
  'slide': 450,
  'crocs': 380,
  'jacket': 1000,
  'kurtka': 1000,
  'dresy': 600,
  'dres': 600,
  'spodnie': 500,
  'bluza': 850,
  'hoodie': 850,
  'spodenki': 300,
  'shorts': 300,
  'jordan': 1000, // fallback for other Jordans
  'yeezy': 900,   // fallback for other Yeezys
  'shoes': 950,
  'watch': 150,
  'zegarek': 150,
  'socks': 80,
  'skarpetki': 80,
  'skarpety': 80,
  'airpods': 50,
  'buty': 950,
  'dunk': 900,
  'af1': 1000,
  'tn': 900,
  'nb': 950,
  'pasek': 220,
  'belt': 220,
  'plecak': 800,
  'bag': 750,
  'portfel': 120,
  'wallet': 120
};

export default function Calculator() {
  const { language, t } = useLanguage();
  
  const QUICK_TAGS_DYNAMIC = [
    { label: language === 'pl' ? 'Koszulka' : (t('products.t-shirts') || 'T-shirt'), name: 'T-shirt', weight: 230 },
    { label: language === 'pl' ? 'Klapki' : 'Slides', name: 'Slides', weight: 400 },
    { label: language === 'pl' ? 'Dresy' : (t('products.pants') || 'Tracksuit'), name: 'Tracksuit', weight: 600 },
    { label: language === 'pl' ? 'Zegarek' : 'Watch', name: 'Watch', weight: 150 },
  ];

  const [items, setItems] = useState([]);
  const [itemName, setItemName] = useState('');
  const [itemSize, setItemSize] = useState('');
  const [itemWeight, setItemWeight] = useState('');
  const [itemQty, setItemQty] = useState(1);
  const [includeBox, setIncludeBox] = useState(false);
  const [includeCoupon, setIncludeCoupon] = useState(true);
  const [selectedCoupon, setSelectedCoupon] = useState('frostyy'); // 'frostyy' (-$15 flat) or 'frostyy20' (-20%)
  const [isAiActive, setIsAiActive] = useState(false);

  // Live Shipping Estimation API states
  const [liveShippingLines, setLiveShippingLines] = useState([]);
  const [isLoadingLive, setIsLoadingLive] = useState(false);
  const [liveError, setLiveError] = useState(null);

  // Exchange rate USD -> PLN
  const USD_TO_PLN = 3.65;

  const isShoeType = (name) => {
    const lower = (name || '').toLowerCase();
    return lower.includes('jordan') || lower.includes('dunk') || lower.includes('yeezy') || 
           lower.includes('force') || lower.includes('af1') || lower.includes('trainer') || 
           lower.includes('skate') || lower.includes('b30') || lower.includes('b22') || 
           lower.includes('b33') || lower.includes('b27') || lower.includes('nyc') || 
           lower.includes('gel') || lower.includes('spezial') || lower.includes('gazelle') || 
           lower.includes('samba') || lower.includes('campus') || lower.includes('superstar') || 
           lower.includes('lanvin') || lower.includes('shoes') || lower.includes('buty') || 
           lower.includes('bapesta') || lower.includes('shox') || lower.includes('tn') || 
           lower.includes('air max') || lower.includes('crocs') || lower.includes('slide') || 
           lower.includes('slides') || lower.includes('obuw') || lower.includes('sneaker') || 
           lower.includes('trampki') || lower.includes('klapki') || lower.includes('kicksy');
  };

  // Auto-estimate weight based on item name, size, and box selection
  useEffect(() => {
    if (!itemName) {
      setIsAiActive(false);
      return;
    }
    const nameLower = itemName.toLowerCase();
    let found = false;
    let baseWeight = 0;

    for (const key in ESTIMATED_WEIGHTS) {
      if (nameLower.includes(key)) {
        baseWeight = ESTIMATED_WEIGHTS[key];
        found = true;
        break;
      }
    }

    // Smart Fallback/Logic deduction based on word roots if no exact match is found
    if (!found) {
      if (nameLower.includes('kosz') || nameLower.includes('tshirt') || nameLower.includes('tee') || nameLower.includes('top')) {
        baseWeight = 230;
        found = true;
      } else if (nameLower.includes('bluz') || nameLower.includes('hood') || nameLower.includes('swet') || nameLower.includes('sweat')) {
        baseWeight = 850;
        found = true;
      } else if (nameLower.includes('but') || nameLower.includes('shoes') || nameLower.includes('sneaker') || nameLower.includes('tramp') || nameLower.includes('kick') || nameLower.includes('obuw') || nameLower.includes('adid')) {
        baseWeight = 950;
        found = true;
      } else if (nameLower.includes('spoden') || nameLower.includes('short')) {
        baseWeight = 300;
        found = true;
      } else if (nameLower.includes('spodn') || nameLower.includes('pant') || nameLower.includes('dres') || nameLower.includes('jeans') || nameLower.includes('trousers')) {
        baseWeight = 600;
        found = true;
      } else if (nameLower.includes('kurt') || nameLower.includes('jack') || nameLower.includes('puffer') || nameLower.includes('coat') || nameLower.includes('vest') || nameLower.includes('kamiz')) {
        baseWeight = 1000;
        found = true;
      } else if (nameLower.includes('czap') || nameLower.includes('hat') || nameLower.includes('cap') || nameLower.includes('beanie')) {
        baseWeight = 120;
        found = true;
      } else if (nameLower.includes('skarp') || nameLower.includes('sock')) {
        baseWeight = 80;
        found = true;
      } else if (nameLower.includes('torb') || nameLower.includes('bag') || nameLower.includes('plecak') || nameLower.includes('backpack')) {
        baseWeight = 750;
        found = true;
      } else if (nameLower.includes('klapk') || nameLower.includes('slid') || nameLower.includes('sandal') || nameLower.includes('japonk') || nameLower.includes('croc')) {
        baseWeight = 400;
        found = true;
      } else if (nameLower.includes('zegar') || nameLower.includes('watch')) {
        baseWeight = 150;
        found = true;
      } else if (nameLower.includes('pas') || nameLower.includes('belt')) {
        baseWeight = 220;
        found = true;
      } else if (nameLower.includes('portfel') || nameLower.includes('wallet')) {
        baseWeight = 120;
        found = true;
      } else if (nameLower.includes('perfum')) {
        baseWeight = 250;
        found = true;
      } else if (nameLower.includes('okulary') || nameLower.includes('glass')) {
        baseWeight = 100;
        found = true;
      }
    }

    if (found) {
      let finalWeight = baseWeight;
      
      // Dynamic weight scaling based on size
      const isShoe = isShoeType(itemName);
      if (itemSize) {
        const cleanSize = itemSize.trim().toUpperCase();
        const numSize = parseFloat(cleanSize);
        
        if (!isNaN(numSize) && numSize >= 25 && numSize <= 52) {
          if (isShoe) {
            // Shoe baseline size is 42, offset is +-25g per full size
            finalWeight += Math.round((numSize - 42) * 25);
          } else {
            // Clothing numeric baseline (e.g. jeans size) is 32, offset is +-15g per size
            finalWeight += Math.round((numSize - 32) * 15);
          }
        } else {
          // Clothing alphabetical sizes
          if (cleanSize === 'XS') finalWeight -= 40;
          else if (cleanSize === 'S') finalWeight -= 20;
          else if (cleanSize === 'M') finalWeight += 0;
          else if (cleanSize === 'L') finalWeight += 25;
          else if (cleanSize === 'XL' || cleanSize === '1XL') finalWeight += 50;
          else if (cleanSize === 'XXL' || cleanSize === '2XL') finalWeight += 75;
          else if (cleanSize === 'XXXL' || cleanSize === '3XL') finalWeight += 100;
          else if (cleanSize === 'XXXXL' || cleanSize === '4XL') finalWeight += 125;
        }
      }

      // Dołączamy wagę pudełka tylko i wyłącznie dla obuwia
      if (includeBox && isShoe) {
        finalWeight += 350;
      }

      // Ensure weight is never negative or unreasonably low
      setItemWeight(Math.max(50, finalWeight));
      setIsAiActive(true);
    } else {
      setIsAiActive(false);
    }
  }, [itemName, itemSize, includeBox]);

  const handleAddItem = (e) => {
    if (e) e.preventDefault();
    if (!itemName) return;

    const parsedWeight = parseFloat(itemWeight) || 0;
    const boxW = isShoeType(itemName) ? 350 : 100;
    const baseW = includeBox ? Math.max(0, parsedWeight - boxW) : parsedWeight;

    const newItem = {
      id: Date.now(),
      name: itemName,
      size: itemSize || 'Universal',
      baseWeight: baseW,
      weight: parsedWeight,
      qty: itemQty,
      hasBox: includeBox
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
        const boxW = isShoeType(item.name) ? 350 : 100;
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

  const handleQuickTagClick = (tag) => {
    setItemName(tag.name);
    setItemWeight(tag.weight);
  };

  // Calculations
  const totalItemWeight = items.reduce((sum, item) => sum + (item.weight * item.qty), 0);
  const masterBoxWeight = items.length > 0 ? 350 : 0; // master shipping carton weight
  const itemBoxesWeight = items.reduce((sum, item) => {
    if (item.hasBox) {
      const boxW = isShoeType(item.name) ? 350 : 100;
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
                    {isShoeType(itemName) && (
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
                          {isShoeType(item.name) && (
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
                          ? `Zastosowano kupon ${selectedCoupon} (oszczędzasz ${totalWeight > 0 ? selectedDiscountAmountPln.toFixed(2) : '60.00'} PLN)`
                          : `Applied coupon ${selectedCoupon} (saving ${totalWeight > 0 ? selectedDiscountAmountPln.toFixed(2) : '60.00'} PLN)`}
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
                    className={styles.saveBtn} 
                    onClick={() => alert(language === 'pl' ? 'Zapisano oszacowanie paczki!' : 'Package estimate saved!')} 
                    disabled={items.length === 0}
                  >
                    <FontAwesomeIcon icon={faSave} style={{marginRight: '8px'}} /> {language === 'pl' ? 'ZAPISZ OSZACOWANIE' : 'SAVE ESTIMATE'}
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* ─── PRAWA KOLUMNA: PRZYKLEJONA LISTA KURIERÓW ZE SCROLLOWANIEM ─── */}
          <div className={styles.calcRightColumn}>
            
            <div className={styles.shippingSection}>
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
                              <span className={styles.carrierGridBaseFee}>
                                {language === 'pl' ? 'Baza:' : 'Base:'} ${rawLineUsd.toFixed(2)}
                              </span>
                              <div className={styles.carrierGridPriceGroup}>
                                <p className={styles.priceBigUsd}>${finalLineUsd.toFixed(2)}</p>
                                <p className={styles.priceSubPln}>~{finalLinePln.toFixed(2)} PLN</p>
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
