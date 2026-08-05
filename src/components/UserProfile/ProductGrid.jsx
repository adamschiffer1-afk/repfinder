'use client';

import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faHeartBroken, faThumbsDown, faSearch, faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';
import styles from '@/styles/UserProfile.module.css';
import { useCurrency } from '@/hooks/useCurrency';

export default function ProductGrid({ products, type, onRemove, isOwner }) {
    const { formatPrice } = useCurrency();

    if (!products || products.length === 0) {
        return (
            <div className={styles.emptyState}>
                <FontAwesomeIcon icon={faHeartBroken} className={styles.emptyIcon} />
                <p className={styles.emptyText}>Brak produktów w tej sekcji.</p>
            </div>
        );
    }

    return (
        <div className={styles.productsGrid}>
            {products.map((product) => (
                <div key={product._id || product.id} className={styles.productCard}>
                    <Link href={`/products/${product.slug || product._id || product.id}`} className={styles.imageWrapper}>
                        <LazyLoadImage
                            src={product.image || '/default-product.png'}
                            alt={product.name}
                            effect="blur"
                            className={styles.productImage}
                        />
                    </Link>
                    <div className={styles.cardContent}>
                        <h3 className={styles.productName}>{product.name}</h3>
                        <div className={styles.price}>{formatPrice(product.price)}</div>

                        <div className={styles.cardActions}>
                            <Link href={product.link} className={styles.actionBtn} target="_blank" rel="noopener noreferrer">
                                <FontAwesomeIcon icon={faExternalLinkAlt} />
                                Zobacz
                            </Link>
                            <Link href={`/qc?qcurl=${encodeURIComponent(product.link)}`} className={styles.actionBtn}>
                                <FontAwesomeIcon icon={faSearch} />
                                QC
                            </Link>
                        </div>

                        {isOwner && (
                            <button
                                className={`${styles.removeBtn} ${styles.danger}`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    onRemove(product._id || product.id);
                                }}
                            >
                                <FontAwesomeIcon icon={type === 'favorites' ? faTrash : faThumbsDown} />
                                {type === 'favorites' ? 'Usuń' : 'Cofnij'}
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
