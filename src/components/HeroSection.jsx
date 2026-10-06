'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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

  useEffect(() => {
    fetch('/api/products?limit=12&sort=pinned_order', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : [])
      .then(data => Array.isArray(data) && data.length >= 6 && setProducts(data.slice(0, 12)))
      .catch(() => {});
  }, []);

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
              {t('hero.titleSuffix') ? <><br />{t('hero.titleSuffix')}</> : null}
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
              <Link href="/products" className={styles.marqueeSeeAll}>{t('hero.seeAll')} →</Link>
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
