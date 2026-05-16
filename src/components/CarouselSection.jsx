'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { productsData } from '@/data/productsData';
import { useCurrency } from '@/hooks/useCurrency';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import styles from '@/styles/CarouselSection.module.css';
import { useLanguage } from '@/context/LanguageContext';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';

export default function CarouselSection() {
  const [carouselItems, setCarouselItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { formatPrice } = useCurrency();
  const { t } = useLanguage();

  useEffect(() => {
    // Wybierz 6 losowych produktów z lokalnej bazy danych
    const shuffled = [...productsData].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 8);
    setCarouselItems(selected);
    setLoading(false);
  }, []);

  if (loading) return <p className="text-center text-light">{t('products.loading')}</p>;
  if (!carouselItems.length) return <p className="text-center text-light">{t('products.noResults')}</p>;

  return (
    <section className={`${styles.carouselSection} py-5`}>
      <div className="container position-relative">
        <h2 className={`${styles.sectionTitle} mb-5`}>
          {t('featured.title')} <span className={styles.highlight}>{t('featured.highlight')}</span>
        </h2>

        <button className={`${styles.customPrev} custom-prev`}>
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
        <button className={`${styles.customNext} custom-next`}>
          <FontAwesomeIcon icon={faChevronRight} />
        </button>

        <Swiper
          modules={[Navigation, Pagination, Autoplay]}
          spaceBetween={40}
          slidesPerView={1}
          navigation={{ nextEl: '.custom-next', prevEl: '.custom-prev' }}
          pagination={{
            clickable: true,
            el: `.${styles.swiperPagination}`,
            bulletClass: `swiper-pagination-bullet ${styles.swiperPaginationBullet}`,
            bulletActiveClass: `swiper-pagination-bullet-active ${styles.swiperPaginationBulletActive}`,
          }}
          autoplay={{ delay: 3000, disableOnInteraction: false }}
          loop={carouselItems.length > 1}
          speed={500}
          breakpoints={{
            0: { slidesPerView: 1, spaceBetween: 20 },
            768: { slidesPerView: 2, spaceBetween: 30 },
            1024: { slidesPerView: 3, spaceBetween: 60 },
          }}
          className={styles.swiper}
        >
          {carouselItems.map((product, index) => (
            <SwiperSlide key={product.id || index}>
              <Link
                href={product.link || '#'}
                className={styles.carouselCard}
                target="_blank"
              >
                <div className={styles.cardWrapper}>
                  <Image
                    src={product.image || '/fallback-image.jpg'}
                    alt={product.name}
                    width={300}
                    height={250}
                    style={{
                      width: '100%',
                      height: '250px',
                      objectFit: 'contain',
                      borderTopLeftRadius: '1rem',
                      borderTopRightRadius: '1rem',
                    }}
                  />
                  <div className={styles.cardBody}>
                    <h5 className={styles.cardTitle}>{product.name}</h5>
                    <p className={styles.cardText}>{formatPrice(product.price)}</p>
                  </div>
                </div>
              </Link>
            </SwiperSlide>
          ))}
          <div className={`${styles.swiperPagination} swiper-pagination`}></div>
        </Swiper>
      </div>
    </section>
  );
}
