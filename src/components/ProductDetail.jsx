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
  faArrowLeft
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

const getEstimatedWeight = (category) => {
  const cat = (category || '').toLowerCase();
  if (cat.includes('shoe') || cat.includes('buty')) return '~1200g';
  if (cat.includes('hoodie') || cat.includes('bluza')) return '~800g';
  if (cat.includes('t-shirt') || cat.includes('koszulka')) return '~300g';
  if (cat.includes('jacket') || cat.includes('kurtka')) return '~1000g';
  if (cat.includes('pants') || cat.includes('spodnie') || cat.includes('jeans')) return '~600g';
  if (cat.includes('bag') || cat.includes('torba')) return '~700g';
  if (cat.includes('cap') || cat.includes('czapka') || cat.includes('hat')) return '~150g';
  if (cat.includes('socks') || cat.includes('skarpetki')) return '~100g';
  return '~500g';
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
            Wróć do Galerii
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
                  ...productDetails.qcImages
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
                  <span>Zamów Produkt</span>
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
                <div className={styles.altAgentsTitleNew}>Inni agenci:</div>
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
                <h4 className={styles.detailsBoxTitleNew}>Szczegóły Produktu</h4>
                <div className={styles.detailsGridNew}>
                  <div className={styles.detailRowNew}>
                    <span className={styles.detailLabelNew}>Platforma</span>
                    <span className={`${styles.detailValNew} ${styles.badgePlatformNew}`}>
                      {productDetails.details.platform.toUpperCase()}
                    </span>
                  </div>
                  <div className={styles.detailRowNew}>
                    <span className={styles.detailLabelNew}>Kategoria</span>
                    <span className={`${styles.detailValNew} ${styles.badgeCategoryNew}`}>
                      {productDetails.product.category.toUpperCase()}
                    </span>
                  </div>
                  <div className={styles.detailRowNew}>
                    <span className={styles.detailLabelNew}>Waga</span>
                    <span className={styles.detailValNew}>
                      {productDetails.details.weight && productDetails.details.weight !== 'N/A' 
                        ? productDetails.details.weight 
                        : (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {getEstimatedWeight(productDetails.product.category)}
                              <span className={styles.estimatedBadgeNew}>Szacowana</span>
                            </span>
                          )
                      }
                    </span>
                  </div>
                  <div className={styles.detailRowNew}>
                    <span className={styles.detailLabelNew}>Dostawa</span>
                    <span className={styles.detailValNew}>{productDetails.details.delivery || 'N/A'}</span>
                  </div>
                  <div className={styles.detailRowNew}>
                    <span className={styles.detailLabelNew}>Sprzedaż</span>
                    <span className={styles.detailValNew}>{productDetails.details.sales || '0'}</span>
                  </div>
                  <div className={styles.detailRowNew}>
                    <span className={styles.detailLabelNew}>Kliknięcia</span>
                    <span className={styles.detailValNew}>{productDetails.product.clicks || '0'}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: Text Information & Interactive selectors */}
            <div className={styles.modalProductRightColumn}>
              
              {/* Brand Shop & Favorite */}
              <div className={styles.shopRowNew}>
                <span className={styles.shopLabelNew}>Best Batch</span>
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
                <span>{productDetails.details.views} wyświetleń</span>
                <span className={styles.statsSeparatorNew}>•</span>
                <span>{productDetails.details.favorites} polubień</span>
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

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
