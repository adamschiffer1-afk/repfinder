'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/styles/HeroSection.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faBoxOpen, faShieldAlt } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '@/context/LanguageContext';
import AgentModal from '@/components/AgentModal';

const FALLBACK = [
  { _id: 'm1', name: 'Nike Air Force 1',     price: 28, image: null, category: 'shoes',   batch: 'popular' },
  { _id: 'm2', name: 'Palace Puffer Jacket', price: 64, image: null, category: 'jackets', batch: 'best'    },
  { _id: 'm3', name: 'New Balance 550',      price: 22, image: null, category: 'shoes',   batch: 'best'    },
  { _id: 'm4', name: 'Carhartt WIP Hoodie',  price: 18, image: null, category: 'hoodies', batch: 'best'    },
  { _id: 'm5', name: 'Stone Island Tee',     price: 14, image: null, category: 't-shirts', batch: 'popular' },
  { _id: 'm6', name: 'Bape Hoodie',          price: 32, image: null, category: 'hoodies', batch: 'best'    },
  { _id: 'm7', name: 'Supreme Box Logo',     price: 45, image: null, category: 't-shirts', batch: 'popular' },
  { _id: 'm8', name: 'OG Adidas Samba',      price: 19, image: null, category: 'shoes',   batch: 'best'    },
];

function fmt(p) {
  if (!p && p !== 0) return '—';
  const n = typeof p === 'number' ? p : parseFloat(p);
  return isNaN(n) ? String(p) : `$${n.toFixed(2)}`;
}

function MarqueeRow({ items, reverse, onCardClick }) {
  // duplicate for seamless loop
  const doubled = [...items, ...items];
  return (
    <div className={styles.marqueeOuter}>
      <div className={`${styles.marqueeTrack} ${reverse ? styles.marqueeReverse : ''}`}>
        {doubled.map((p, i) => (
          <div
            key={`${p._id}-${i}`}
            className={styles.mCard}
            onClick={() => onCardClick(p)}
          >
            <div className={styles.mImg}>
              {p.image
                ? <img src={p.image} alt={p.name} />
                : <FontAwesomeIcon icon={faBoxOpen} className={styles.mPlaceholder} />
              }
              {p.batch === 'popular' && <span className={styles.mBadgePop}>🔥</span>}
              {p.batch === 'best'    && <span className={styles.mBadgeBest}>★</span>}
            </div>
            <div className={styles.mInfo}>
              <span className={styles.mName}>{p.name}</span>
              <span className={styles.mPrice}>{fmt(p.price)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HeroSection() {
  const { t } = useLanguage();
  const router  = useRouter();
  const [products, setProducts]   = useState([]);
  const [selected, setSelected]   = useState(null);
  const [preferredAgent, setPreferredAgent] = useState('KakoBuy');

  useEffect(() => {
    // Load preferred agent from localStorage
    const saved = localStorage.getItem('preferredAgent');
    if (saved) setPreferredAgent(saved);
    
    fetch('/api/products?pinned=true&limit=12', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : { products: [] })
      .then(data => {
        const prods = data.products || data || [];
        if (Array.isArray(prods) && prods.length >= 6) {
          setProducts(prods.slice(0, 12));
        } else {
          // If no pinned products, use fallback
          setProducts(FALLBACK);
        }
      })
      .catch(() => setProducts(FALLBACK));
  }, []);

  const getAgentLink = (product, agentName) => {
    // Extract weidian URL from product.link (it's wrapped in kakobuy)
    const weidianMatch = product.link?.match(/url=([^&]+)/);
    const weidianUrl = weidianMatch ? decodeURIComponent(weidianMatch[1]) : product.link;
    
    const agentUrls = {
      'KakoBuy': `https://www.kakobuy.com/item/details?url=${encodeURIComponent(weidianUrl)}&affcode=xfrostyy`,
      'ACBuy': `https://www.allchinabuy.com/en/page/buy?nTag=Home-search&from=search-input&url=${encodeURIComponent(weidianUrl)}`,
      'USFans': `https://www.usfans.net/page/buy?url=${encodeURIComponent(weidianUrl)}`,
      'LitBuy': `https://www.litbuy.com/en/page/buy?url=${encodeURIComponent(weidianUrl)}`,
      'GTBuy': `https://www.gtbuy.com/en/page/buy?url=${encodeURIComponent(weidianUrl)}`,
      'OopBuy': `https://www.oopbuy.com/en/page/buy?url=${encodeURIComponent(weidianUrl)}`,
      'MuleBuy': `https://www.mulebuy.com/en/page/buy?url=${encodeURIComponent(weidianUrl)}`,
      'HipoBuy': `https://www.hipobuy.com/en/page/buy?url=${encodeURIComponent(weidianUrl)}`
    };
    return agentUrls[agentName] || agentUrls['KakoBuy'];
  };

  const handleProductsClick = () => {
    // Get first pinned product
    const firstProduct = products.find(p => p.is_pinned) || products[0];
    if (firstProduct) {
      window.open(getAgentLink(firstProduct, preferredAgent), '_blank');
    } else {
      router.push('/products');
    }
  };

  const list = products.length >= 6 ? products : FALLBACK;

  return (
    <>
      <section className={styles.heroWrapper}>
        <div className={styles.gridOverlay} />

        <div className={styles.heroInner}>

          {/* ── LEFT ── */}
          <div className={styles.leftCol}>
            <div className={`${styles.badge} ${styles.a1}`}>
              <span className={styles.badgeDot} />
              <span className={styles.badgeText}>{t('hero.badge')}</span>
            </div>

            <h1 className={`${styles.mainTitle} ${styles.a2}`}>
              {t('hero.title')}<br />
              <span className={styles.gradientText}>{t('hero.titleSpan')}</span>
            </h1>

            <p className={`${styles.description} ${styles.a3}`}>
              {t('hero.description')}
            </p>

            <div className={`${styles.actionGroup} ${styles.a4}`}>
              <button className={styles.primaryBtn} onClick={() => router.push('/products')}>
                {t('hero.browseBtn')} <FontAwesomeIcon icon={faArrowRight} />
              </button>
              <button className={styles.secondaryBtn} onClick={() => router.push('/tutorials')}>
                {t('hero.howToBuy')}
              </button>
            </div>

            <div className={`${styles.trustRow} ${styles.a5}`}>
              <div className={styles.trustItem}>
                <FontAwesomeIcon icon={faBoxOpen} />
                <span>{t('hero.statsLinks')}</span>
              </div>
              <div className={styles.trustItem}>
                <FontAwesomeIcon icon={faShieldAlt} />
                <span>{t('hero.statsQC')}</span>
              </div>
            </div>
          </div>

          {/* ── RIGHT — marquee ── */}
          <div className={styles.rightCol}>
            <div className={styles.marqueeHeader}>
              <span className={styles.marqueeLabel}>{t('hero.popularProducts')}</span>
              <button onClick={handleProductsClick} className={styles.productBtn}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
                Zobacz produkty
              </button>
            </div>

            <div className={styles.marqueeStack}>
              <MarqueeRow items={list} reverse={false} onCardClick={setSelected} />
            </div>
          </div>

        </div>
      </section>

      {selected && (
        <AgentModal isOpen product={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
