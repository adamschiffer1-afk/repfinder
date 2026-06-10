'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faCheck,
  faChevronRight,
  faCopy,
  faHeart,
  faArrowLeft,
  faShare
} from '@fortawesome/free-solid-svg-icons';
import styles from '@/styles/Products.module.css';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from '@/hooks/useCurrency';
import { useLanguage } from '@/context/LanguageContext';
import { convertLink, SUPPORTED_AGENTS } from '@/utils/converter';

const CLICK_TRACK_COOLDOWN_MS = 60 * 1000;
const ANALYTICS_VISITOR_KEY = '__vf_visitor_id';

const generateAnalyticsVisitorId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.random() * 16 | 0;
    const value = char === 'x' ? random : (random & 0x3 | 0x8);
    return value.toString(16);
  });
};

const getAnalyticsVisitorId = () => {
  if (typeof window === 'undefined') return null;
  try {
    let visitorId = localStorage.getItem(ANALYTICS_VISITOR_KEY);
    if (!visitorId) {
      visitorId = generateAnalyticsVisitorId();
      localStorage.setItem(ANALYTICS_VISITOR_KEY, visitorId);
    }
    return visitorId;
  } catch (err) {
    return null;
  }
};

const getEstimatedWeight = (category, productName = '') => {
  const cat = (category || '').toLowerCase();
  const name = (productName || '').toLowerCase();
  
  // SHOES - różne wagi w zależności od typu
  if (cat.includes('shoe') || cat.includes('buty')) {
    if (name.includes('slide') || name.includes('slidy') || name.includes('foam runner') || name.includes('crocs')) return '400g';
    if (name.includes('jordan') || name.includes('dunk') || name.includes('air force')) return '1300g';
    if (name.includes('yeezy 350') || name.includes('yeezy boost')) return '900g';
    if (name.includes('yeezy 700')) return '1100g';
    if (name.includes('new balance') || name.includes('nb 9060') || name.includes('2002r')) return '950g';
    if (name.includes('air max') || name.includes('tn')) return '1050g';
    if (name.includes('balenciaga') || name.includes('track')) return '1400g';
    if (name.includes('salomon') || name.includes('xt-6')) return '850g';
    if (name.includes('converse') || name.includes('vans')) return '700g';
    if (name.includes('rick owens') || name.includes('ramones')) return '1200g';
    return '1100g'; // default dla butów
  }
  
  // SHORTS - różne wagi
  if (cat.includes('shorts') || cat.includes('spodenki')) {
    if (name.includes('essentials') || name.includes('mesh')) return '200g';
    if (name.includes('jordan') || name.includes('nike tech')) return '350g';
    if (name.includes('trapstar') || name.includes('corteiz')) return '380g';
    if (name.includes('cargo')) return '420g';
    if (name.includes('stussy') || name.includes('gallery dept')) return '280g';
    return '300g'; // default dla szortów
  }
  
  // HOODIES
  if (cat.includes('hoodie') || cat.includes('bluza')) {
    if (name.includes('essentials') && name.includes('oversized')) return '950g';
    if (name.includes('essentials')) return '750g';
    if (name.includes('trapstar') || name.includes('tech fleece')) return '650g';
    if (name.includes('chrome hearts') || name.includes('heavyweight')) return '1100g';
    if (name.includes('gallery dept') || name.includes('vintage')) return '850g';
    if (name.includes('zip') || name.includes('full zip')) return '900g';
    if (name.includes('stussy') || name.includes('carhartt')) return '800g';
    return '800g'; // default dla bluz
  }
  
  // T-SHIRTS
  if (cat.includes('t-shirt') || cat.includes('koszulka')) {
    if (name.includes('essentials') && name.includes('oversized')) return '350g';
    if (name.includes('essentials')) return '250g';
    if (name.includes('vintage') || name.includes('heavy')) return '400g';
    if (name.includes('chrome hearts') || name.includes('heavyweight')) return '450g';
    if (name.includes('polo') || name.includes('lacoste')) return '320g';
    if (name.includes('tech') || name.includes('performance')) return '200g';
    return '280g'; // default dla koszulek
  }
  
  // JACKETS
  if (cat.includes('jacket') || cat.includes('kurtka')) {
    if (name.includes('moncler') || name.includes('maya') || name.includes('puffer')) return '1400g';
    if (name.includes('north face') && name.includes('nuptse')) return '1300g';
    if (name.includes('canada goose')) return '1600g';
    if (name.includes('stone island') && name.includes('soft shell')) return '900g';
    if (name.includes('arcteryx') || name.includes('beta')) return '850g';
    if (name.includes('windbreaker') || name.includes('coach')) return '550g';
    if (name.includes('bomber')) return '950g';
    if (name.includes('denim') || name.includes('trucker')) return '1000g';
    if (name.includes('leather') || name.includes('biker')) return '1800g';
    return '1000g'; // default dla kurtek
  }
  
  // PANTS
  if (cat.includes('pants') || cat.includes('spodnie')) {
    if (name.includes('cargo') || name.includes('military')) return '650g';
    if (name.includes('jeans') || name.includes('denim')) return '750g';
    if (name.includes('essentials') || name.includes('sweatpants')) return '500g';
    if (name.includes('tech fleece')) return '480g';
    if (name.includes('corduroy')) return '700g';
    if (name.includes('trapstar') || name.includes('corteiz')) return '550g';
    return '600g'; // default dla spodni
  }
  
  // SETS
  if (cat.includes('sets') || cat.includes('tracksuit')) {
    if (name.includes('tech fleece')) return '1100g';
    if (name.includes('essentials')) return '1200g';
    if (name.includes('trapstar') || name.includes('corteiz')) return '1300g';
    return '1250g'; // default dla setów
  }
  
  // ACCESSORIES
  if (cat.includes('accessories') || cat.includes('bag') || cat.includes('torba')) {
    if (name.includes('backpack') || name.includes('plecak')) return '650g';
    if (name.includes('duffle') || name.includes('travel bag')) return '900g';
    if (name.includes('shoulder bag') || name.includes('crossbody')) return '450g';
    if (name.includes('tote')) return '350g';
    if (name.includes('wallet') || name.includes('portfel')) return '150g';
    if (name.includes('cap') || name.includes('hat') || name.includes('czapka')) return '120g';
    if (name.includes('beanie') || name.includes('balaclava')) return '80g';
    if (name.includes('belt') || name.includes('pasek')) return '200g';
    if (name.includes('socks') || name.includes('skarpetki')) return '60g';
    if (name.includes('watch') || name.includes('zegarek')) return '180g';
    if (name.includes('sunglasses') || name.includes('glasses')) return '100g';
    if (name.includes('jewelry') || name.includes('chain') || name.includes('necklace')) return '120g';
    return '300g'; // default dla akcesoriów
  }
  
  return '500g'; // universal fallback
};

export default function ProductDetail({ productId, initialData = null }) {
  const router = useRouter();
  const { t } = useLanguage();
  const { user, fetchWithAuth } = useAuth();
  const { formatPrice } = useCurrency();
  const recentTrackedClicksRef = useRef(new Map());

  // UI States — if we got SSR data, start ready immediately
  const [detailLoading, setDetailLoading] = useState(initialData == null);
  const [productDetails, setProductDetails] = useState(initialData);
  const [galleryImage, setGalleryImage] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [error, setError] = useState({ message: null, type: null });

  // QC Gallery States
  const [qcCardIndex, setQcCardIndex] = useState({});

  const qcAlbums = useMemo(() => {
    const images = productDetails?.qcImages || productDetails?.product?.qcImages || [];
    if (!images || images.length === 0) return [];
    
    const groups = {};
    images.forEach(img => {
      if (!img) return;
      const color = img.colorway || 'Default';
      if (!groups[color]) {
        groups[color] = [];
      }
      const url = typeof img === 'string' ? img : img.url;
      if (url) {
        groups[color].push(url);
      }
    });

    return Object.entries(groups).map(([colorway, urls]) => ({
      colorway,
      images: urls
    }));
  }, [productDetails]);

  // Preferred agent configurations
  const [preferredAgent, setPreferredAgent] = useState('kakobuy');
  const [preferredAgentLogo, setPreferredAgentLogo] = useState('/images/kako.png');

  // Load preferred agent settings
  useEffect(() => {
    const saved = localStorage.getItem('preferredAgent');
    if (saved) {
      const mapping = {
        'KakoBuy': 'kakobuy',
        'ACBuy': 'allchinabuy',
        'USFans': 'usfans',
        'LitBuy': 'litbuy',
        'GTBuy': 'gtbuy',
        'OopBuy': 'oopbuy',
        'MuleBuy': 'mulebuy',
        'HipoBuy': 'hipobuy'
      };
      const logoMapping = {
        'KakoBuy': '/images/kako.png',
        'ACBuy': '/images/allchinabuy.png',
        'USFans': '/images/usfans.png',
        'LitBuy': '/images/litbuy.png',
        'GTBuy': '/images/gtbuy.png',
        'OopBuy': '/images/oopbuy.png',
        'MuleBuy': '/images/Mulebuy.jpg',
        'HipoBuy': '/images/Hipobuy.png'
      };
      setPreferredAgent(mapping[saved] || 'kakobuy');
      setPreferredAgentLogo(logoMapping[saved] || '/images/kako.png');
    }
  }, []);

  // Seed gallery/selection from initialData on first render
  useEffect(() => {
    if (!initialData) return;
    setGalleryImage(initialData.product.image);
    if (initialData.sizes?.length > 0) setSelectedSize(initialData.sizes[0]);
    if (initialData.colors?.length > 0) {
      const match = initialData.colors.find(c => c.productId === productId) || initialData.colors[0];
      setSelectedColor(match.name);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch product data — only when no initialData provided (e.g. colour-variant navigation)
  useEffect(() => {
    if (!productId) return;
    // If we already have data for this product, skip the fetch
    if (productDetails?.product?._id?.toString() === productId) return;

    const fetchDetail = async () => {
      setDetailLoading(true);
      try {
        const res = await fetch(`/api/products/${productId}`);
        if (!res.ok) throw new Error("Failed to load product");
        const data = await res.json();
        if (data.success) {
          setProductDetails(data);
          setGalleryImage(data.product.image);
          if (data.sizes?.length > 0) setSelectedSize(data.sizes[0]);
          if (data.colors?.length > 0) {
            const currentMatch = data.colors.find(c => c.productId === productId) || data.colors[0];
            setSelectedColor(currentMatch.name);
          }
        }
      } catch (err) {
        console.error("Failed to fetch product details:", err);
        setError({ message: "Błąd podczas ładowania szczegółów produktu", type: "error" });
      } finally {
        setDetailLoading(false);
      }
    };

    fetchDetail();
  }, [productId]);



  // Track click stats
  const trackStat = useCallback(async (productId, type = 'product_click', agent = null) => {
    try {
      const visitorId = getAnalyticsVisitorId();
      const now = Date.now();
      const clickKey = [productId || 'unknown', agent || 'unknown', visitorId || 'anon'].join(':');
      const lastTrackedAt = recentTrackedClicksRef.current.get(clickKey);
      
      if (lastTrackedAt && now - lastTrackedAt < CLICK_TRACK_COOLDOWN_MS) {
        return;
      }
      recentTrackedClicksRef.current.set(clickKey, now);

      await fetch('/api/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          productId, 
          type, 
          agent,
          visitorId,
          userAgent: navigator.userAgent,
          path: window.location.pathname + window.location.search
        })
      });
    } catch (err) {
      console.error("Stats error:", err);
    }
  }, []);

  // Handle wishlist add/delete
  const handleAddToWishlist = async (id) => {
    if (!user) {
      setError({ message: 'Musisz być zalogowany, aby dodać do ulubionych!', type: 'error' });
      return;
    }

    setProductDetails(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        product: {
          ...prev.product,
          isFavorited: !prev.product.isFavorited
        }
      };
    });

    try {
      const isFavorited = productDetails?.product?.isFavorited;
      const endpoint = `/api/users/favorites/${id}`;
      const method = isFavorited ? 'DELETE' : 'POST';

      const res = await fetchWithAuth(endpoint, { method });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Error');

      setError({
        message: isFavorited ? 'Usunięto z ulubionych' : 'Dodano do ulubionych!',
        type: 'success'
      });
    } catch (err) {
      console.error('Wishlist error:', err);
      setError({ message: 'Błąd ulubionych', type: 'error' });
      // Revert state
      setProductDetails(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          product: {
            ...prev.product,
            isFavorited: !prev.product.isFavorited
          }
        };
      });
    }
  };

  const handleColorClick = (color) => {
    setSelectedColor(color.name);
    if (color.image) {
      setGalleryImage(color.image);
    }
    if (color.productId) {
      // Smooth Next.js navigation to client page of sibling product
      router.push(`/products/${color.productId}`, { scroll: false });
    }
  };

  return (
    <div className={styles.productDetailPageWrapper}>
      <div className={styles.productDetailPageContent}>
        
        {/* Toast Notification */}
        {error.message && (
          <div className={`${styles.errorMessage} ${error.type === 'success' ? styles.success : ''}`}>
            <span>{error.message}</span>
            <button onClick={() => setError({ message: null, type: null })} className={styles.errorCloseButton}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        )}

        {/* Back To Gallery Header */}
        <div className={styles.descModalHeaderRow}>
          <button className={styles.backToGalleryBtn} onClick={() => router.push('/products')}>
            <FontAwesomeIcon icon={faArrowLeft} style={{ marginRight: '8px' }} />
            {t('products.backToGallery') || 'Wróć do Galerii'}
          </button>
        </div>

        {detailLoading ? (
          /* Premium Shimmer Skeleton Loader */
          <div className={styles.skeletonDetailLayout}>
            <div className={styles.skeletonDetailLeft}>
              <div className={styles.skeletonDetailBigImage}></div>
              <div className={styles.skeletonDetailThumbnails}>
                {[...Array(4)].map((_, i) => <div key={i} className={styles.skeletonDetailThumb}></div>)}
              </div>
            </div>
            <div className={styles.skeletonDetailRight}>
              <div className={styles.skeletonDetailTitle}></div>
              <div className={styles.skeletonDetailPrice}></div>
              <div className={styles.skeletonDetailSection}></div>
              <div className={styles.skeletonDetailSection}></div>
            </div>
          </div>
        ) : productDetails && (
          <div className={styles.modalProductLayoutNew}>
            
            {/* Left Column: Image Gallery, Metadata, Order Action */}
            <div className={styles.modalProductLeftColumn}>
              
              {/* Large Viewport */}
              <div className={styles.mainImageContainerNew}>
                <img 
                  src={galleryImage || productDetails.product.image} 
                  alt={productDetails.product.name} 
                  className={styles.mainGalleryImageNew} 
                />
              </div>

              {/* Thumbnails strip */}
              {(() => {
                const thumbnails = Array.from(new Set([
                  productDetails.product.image,
                  ...productDetails.colors.map(c => c.image),
                ].filter(Boolean)));

                if (thumbnails.length <= 1) return null;

                return (
                  <div className={styles.thumbnailsStripNew}>
                    {thumbnails.map((img, idx) => (
                      <button
                        key={idx}
                        className={`${styles.thumbnailBtnNew} ${galleryImage === img ? styles.activeThumbnailNew : ''}`}
                        onClick={() => setGalleryImage(img)}
                      >
                        <img src={img} alt={`Thumbnail ${idx + 1}`} className={styles.thumbnailImgNew} />
                      </button>
                    ))}
                  </div>
                );
              })()}

              {/* Primary Order Action */}
              <div className={styles.orderActionsContainer}>
                <a
                  href={convertLink(productDetails.product.link, preferredAgent)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.orderButtonPremiumNew}
                  onClick={() => trackStat(productDetails.product._id, 'product_click', preferredAgent)}
                >
                  <img src={preferredAgentLogo} alt={preferredAgent} className={styles.orderAgentLogoNew} />
                  <span>{t('products.orderProduct') || 'Zamów Produkt'}</span>
                </a>
                <button
                  className={`${styles.detailCopyBtnNew} ${copiedId === 'main' ? styles.copiedNew : ''}`}
                  onClick={() => {
                    const link = convertLink(productDetails.product.link, preferredAgent);
                    navigator.clipboard.writeText(link);
                    setCopiedId('main');
                    trackStat(productDetails.product._id, 'product_click', preferredAgent);
                    setTimeout(() => setCopiedId(null), 2000);
                  }}
                  title="Kopiuj link do agenta"
                >
                  <FontAwesomeIcon icon={copiedId === 'main' ? faCheck : faCopy} />
                </button>
              </div>

              {/* Alternative Agents Selection */}
              <div className={styles.altAgentsSectionNew}>
                <div className={styles.altAgentsTitleNew}>{t('products.otherAgents') || 'Inni agenci:'}</div>
                <div className={styles.altAgentsGridNew}>
                  {SUPPORTED_AGENTS.filter(a => a.value !== preferredAgent).map((agent) => (
                    <a
                      key={agent.value}
                      href={convertLink(productDetails.product.link, agent.value)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.altAgentChipNew}
                      onClick={() => trackStat(productDetails.product._id, 'product_click', agent.value)}
                      title={agent.label}
                    >
                      <img src={agent.icon} alt={agent.label} className={styles.altAgentIconNew} />
                      <span>{agent.label}</span>
                    </a>
                  ))}
                </div>
              </div>

              {/* Product details table */}
              <div className={styles.detailsBoxNew}>
                <h4 className={styles.detailsBoxTitleNew}>{t('products.productDetails') || 'Szczegóły Produktu'}</h4>
                <div className={styles.detailsGridNew}>
                  <div className={styles.detailRowNew}>
                    <span className={styles.detailLabelNew}>{t('products.platform') || 'Platforma'}</span>
                    <span className={`${styles.detailValNew} ${styles.badgePlatformNew}`}>
                      {productDetails.details.platform.toUpperCase()}
                    </span>
                  </div>
                  <div className={styles.detailRowNew}>
                    <span className={styles.detailLabelNew}>{t('products.category') || 'Kategoria'}</span>
                    <span className={`${styles.detailValNew} ${styles.badgeCategoryNew}`}>
                      {productDetails.product.category.toUpperCase()}
                    </span>
                  </div>
                  <div className={styles.detailRowNew}>
                    <span className={styles.detailLabelNew}>{t('products.weight') || 'Waga'}</span>
                    <span className={styles.detailValNew}>
                      {productDetails.details.weight && productDetails.details.weight !== 'N/A' 
                        ? productDetails.details.weight 
                        : (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {getEstimatedWeight(productDetails.product.category, productDetails.product.name)}
                              <span className={styles.estimatedBadgeNew}>{t('products.estimated') || 'Szacowana'}</span>
                            </span>
                          )
                      }
                    </span>
                  </div>
                  <div className={styles.detailRowNew}>
                    <span className={styles.detailLabelNew}>{t('products.delivery') || 'Dostawa'}</span>
                    <span className={styles.detailValNew}>{productDetails.details.delivery || 'N/A'}</span>
                  </div>
                  <div className={styles.detailRowNew}>
                    <span className={styles.detailLabelNew}>{t('products.sales') || 'Sprzedaż'}</span>
                    <span className={styles.detailValNew}>{productDetails.details.sales || '0'}</span>
                  </div>
                  <div className={styles.detailRowNew}>
                    <span className={styles.detailLabelNew}>{t('products.clicks') || 'Kliknięcia'}</span>
                    <span className={styles.detailValNew}>{productDetails.product.clicks || '0'}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: Text Information & Interactive selectors */}
            <div className={styles.modalProductRightColumn}>
              
              {/* Brand Shop & Favorite */}
              <div className={styles.shopRowNew}>
                <span className={styles.shopLabelNew}>{t('products.bestBatchLabel') || 'Best Batch'}</span>
                <button
                  className={`${styles.wishlistBtnNew} ${productDetails.product.isFavorited ? styles.wishlistActiveNew : ''}`}
                  onClick={() => handleAddToWishlist(productDetails.product._id)}
                  title="Dodaj do ulubionych"
                >
                  <FontAwesomeIcon icon={faHeart} />
                </button>
              </div>

              {/* Title & Price */}
              <h2 className={styles.productTitleNew}>{productDetails.product.name}</h2>
              <div className={styles.productPriceNew}>
                {formatPrice(productDetails.product.price)}
              </div>

              {/* Real-time stats */}
              <div className={styles.productStatsNew}>
                <span>{productDetails.details.views} {t('products.views') || 'wyświetleń'}</span>
                <span className={styles.statsSeparatorNew}>•</span>
                <span>{productDetails.details.favorites} {t('products.likes') || 'polubień'}</span>
              </div>

              {/* Colorways / Variant Selector */}
              {productDetails.colors && productDetails.colors.length > 0 && (
                <div className={styles.variantsSectionNew}>
                  <h4 className={styles.sectionLabelNew}>{t('products.colorways') || 'Warianty kolorystyczne'}</h4>
                  <div className={styles.variantsGridNew}>
                    {productDetails.colors.map((c, idx) => (
                      <button
                        key={idx}
                        className={`${styles.variantChipNew} ${selectedColor === c.name ? styles.activeVariantNew : ''}`}
                        onClick={() => handleColorClick(c)}
                        title={c.name}
                      >
                        {c.image && <img src={c.image} alt={c.name} className={styles.variantChipImgNew} />}
                        <span className={styles.variantChipTextNew}>{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Size Selector */}
              {productDetails.sizes && productDetails.sizes.length > 0 && (
                <div className={styles.sizesSectionNew}>
                  <h4 className={styles.sectionLabelNew}>{t('products.availableSizes') || 'Dostępne Rozmiary'}</h4>
                  <div className={styles.sizesGridNew}>
                    {productDetails.sizes.map((sz) => (
                      <button
                        key={sz}
                        className={`${styles.sizeChipNew} ${selectedSize === sz ? styles.activeSizeNew : ''}`}
                        onClick={() => setSelectedSize(sz)}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Share Button - always visible */}
              <button
                className={`${styles.shareButtonGray} ${copiedId === 'share' ? styles.shareButtonCopied : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  const shareLink = `${window.location.origin}/products/${productDetails.product.slug || productDetails.product._id}`;
                  navigator.clipboard.writeText(shareLink);
                  setCopiedId('share');
                  setTimeout(() => setCopiedId(null), 2000);
                }}
              >
                <FontAwesomeIcon icon={copiedId === 'share' ? faCheck : faShare} />
                <span>{copiedId === 'share' ? 'Skopiowano!' : 'Udostępnij'}</span>
              </button>

              {/* QC Gallery Section */}
              {qcAlbums.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '13px', color: 'rgba(255,255,255,0.6)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Zdjęcia QC</h3>
                  <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }}>
                    {qcAlbums.map((album, albumIdx) => {
                      const imgs = album.images || [];
                      const idx = qcCardIndex[albumIdx] || 0;
                      if (!imgs.length) return null;
                      return (
                        <div key={albumIdx} style={{ flexShrink: 0, width: '120px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
                          <div style={{ position: 'relative', width: '120px', height: '120px', background: '#000' }}>
                            <img
                              src={imgs[idx]}
                              alt={`QC - ${album.colorway}`}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', cursor: 'pointer' }}
                              onError={e => e.target.src = '/placeholder.png'}
                              onClick={() => window.open(imgs[idx], '_blank')}
                              title="Kliknij, aby otworzyć w nowej karcie"
                            />
                            {imgs.length > 1 && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setQcCardIndex(prev => ({ ...prev, [albumIdx]: idx > 0 ? idx - 1 : imgs.length - 1 }));
                                  }}
                                  style={{ position: 'absolute', left: '4px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}
                                >&#10094;</button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setQcCardIndex(prev => ({ ...prev, [albumIdx]: idx < imgs.length - 1 ? idx + 1 : 0 }));
                                  }}
                                  style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}
                                >&#10095;</button>
                                <div style={{ position: 'absolute', bottom: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '9px', padding: '1px 5px', borderRadius: '8px', zIndex: 2 }}>
                                  {idx + 1} / {imgs.length}
                                </div>
                              </>
                            )}
                          </div>
                          {album.colorway && album.colorway !== 'Default' && (
                            <div style={{ padding: '4px 6px', fontSize: '10px', color: 'rgba(255,255,255,0.7)', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                              {album.colorway}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>



          </div>
        )}

      </div>
    </div>
  );
}
