'use client';

import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faStar,
  faSpinner,
  faExclamationCircle,
  faFrown,
  faShoppingCart,
  faTag,
  faMoneyBillWave,
  faClock,
  faInfoCircle,
  faChevronLeft,
  faChevronRight,
  faTimes,
  faComment,
  faThumbsUp,
  faThumbsDown,
} from '@fortawesome/free-solid-svg-icons';
import 'bootstrap/dist/css/bootstrap.min.css';
import styles from '@/styles/Promotions.module.css';

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [commentPage, setCommentPage] = useState(1);
  const [visibleComments, setVisibleComments] = useState([]);
  const limit = 10;
  const commentsPerPage = 5;

  // Fetch promotions
  const fetchPromotions = async (page) => {
    setIsLoading(true);
    setError(null);
    const skip = (page - 1) * limit;
    try {
      const res = await fetch(`/api/promotions?limit=${limit}&skip=${skip}`);
      if (!res.ok) throw new Error('Nie udało się pobrać promocji');
      const data = await res.json();
      setPromotions(data.promotions);
      setTotal(data.total);
    } catch (error) {
      console.error(error);
      setError(error.message);
      setPromotions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions(page);
  }, [page]);

  // Load comments for selected promo
  useEffect(() => {
    if (selectedPromo) {
      const start = (commentPage - 1) * commentsPerPage;
      const end = start + commentsPerPage;
      setVisibleComments(selectedPromo.comments.slice(0, end));
    }
  }, [selectedPromo, commentPage]);

  // Open modal
  const openModal = (promo) => {
    setSelectedPromo(promo);
    setCommentPage(1);
    setVisibleComments(promo.comments.slice(0, commentsPerPage));
  };

  // Close modal
  const closeModal = () => {
    setSelectedPromo(null);
    setCommentPage(1);
    setVisibleComments([]);
  };

  // Load more comments
  const loadMoreComments = () => {
    setCommentPage((prev) => prev + 1);
  };

  const totalPages = Math.ceil(total / limit);
  const hasMoreComments =
    selectedPromo && visibleComments.length < selectedPromo.comments.length;

  return (
    <div className={styles.promotionContainer}>
      <div className={styles.promotionContent}>
        <h1 className={`${styles.promotionTitle} text-center mb-5`}>
          <span className={styles.promotionTitleWhite}>Promocje</span>{' '}
          <span className={styles.promotionTitleBlue}>Produktów</span>
        </h1>

        {/* Messages */}
        {isLoading && (
          <div className={`${styles.message} ${styles.loadingMessage}`}>
            <FontAwesomeIcon icon={faSpinner} spin className="mr-2" /> Ładowanie...
          </div>
        )}
        {error && (
          <div className={`${styles.message} ${styles.errorMessage}`}>
            <FontAwesomeIcon icon={faExclamationCircle} className="mr-2" /> {error}
          </div>
        )}
        {!isLoading && !error && promotions.length === 0 && (
          <div className={`${styles.message} ${styles.noProductsMessage}`}>
            <FontAwesomeIcon icon={faFrown} className="mr-2" /> Brak promocji do wyświetlenia.
          </div>
        )}

        {/* Promotions grid */}
        {!isLoading && promotions.length > 0 && (
          <div className={styles.promotionGrid}>
            {promotions.map((promo) => (
              <div key={promo._id} className={`${styles.promotionCard} fade-in`}>
                <div className={styles.imageWrapper}>
                  <img
                    src={promo.imageURL}
                    alt={promo.promotionName}
                    className={styles.promotionImage}
                  />
                  <div className={styles.batchIndicators}>
                    {promo.batch && (
                      <span className={styles.batchIndicator}>
                        <FontAwesomeIcon icon={faTag} className="mr-1" /> {promo.batch}
                      </span>
                    )}
                    {new Date(promo.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) && (
                      <span className={`${styles.batchIndicator} ${styles.newIndicator}`}>
                        <FontAwesomeIcon icon={faStar} className="mr-1" /> Nowość
                      </span>
                    )}
                  </div>
                  <div className={styles.overlay}>
                    <a
                      href={promo.promotionLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.viewButton}
                    >
                      <FontAwesomeIcon icon={faShoppingCart} className="mr-2" /> Zobacz
                    </a>
                  </div>
                </div>
                <div className={styles.cardBody}>
                  <h2 className={styles.cardTitle}>{promo.promotionName}</h2>
                  <div className={styles.cardFooter}>
                    <p className={styles.cardPrice}>
                      {promo.price} zł
                    </p>
                    {promo.batch && (
                      <p className={styles.cardBatch}>
                        Batch: {promo.batch}
                      </p>
                    )}
                    <p className={styles.cardExpires}>
                      Ważne do: {new Date(promo.expiresAt).toLocaleDateString('pl-PL')}
                    </p>
                    <div className={styles.ratingContainer}>
                      <span className={styles.rating}>
                        <FontAwesomeIcon icon={faStar} /> {promo.profitability !== undefined ? promo.profitability : '-'}
                      </span>
                      <span className={styles.likes}>
                        <FontAwesomeIcon icon={faThumbsUp} /> {promo.likes || 0}
                      </span>
                      <span className={styles.dislikes}>
                        <FontAwesomeIcon icon={faThumbsDown} /> {promo.dislikes || 0}
                      </span>
                    </div>
                    <button className={styles.descriptionButton} onClick={() => openModal(promo)}>
                      <FontAwesomeIcon icon={faInfoCircle} /> Szczegóły
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > limit && (
          <div className={styles.pagination}>
            <button
              className={styles.pageButton}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
            >
              <FontAwesomeIcon icon={faChevronLeft} className="mr-2" /> Poprzednia
            </button>
            <span className={styles.pageInfo}>
              Strona {page} z {totalPages}
            </span>
            <button
              className={styles.pageButton}
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
            >
              Następna <FontAwesomeIcon icon={faChevronRight} className="ml-2" />
            </button>
          </div>
        )}

        {/* Description and comments modal */}
        {selectedPromo && (
          <div className={styles.descriptionModal}>
            <div className={styles.modalContent}>
              <button className={styles.closeModalButton} onClick={closeModal}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
              <h2 className={styles.modalTitle}>{selectedPromo.promotionName}</h2>
              <div className={styles.modalImageWrapper}>
                <img
                  src={selectedPromo.imageURL}
                  alt={selectedPromo.promotionName}
                  className={styles.modalImage}
                />
              </div>
              <p className={styles.modalPrice}>
                <FontAwesomeIcon icon={faMoneyBillWave} className="mr-1" /> {selectedPromo.price} zł
              </p>
              <div className={styles.modalDescription}>{selectedPromo.description}</div>
              <div className={styles.modalComments}>
                <h3 className={styles.modalCommentsTitle}>
                  <FontAwesomeIcon icon={faComment} className="mr-2" /> Komentarze
                </h3>
                {visibleComments.length === 0 ? (
                  <p className={styles.noComments}>Brak komentarzy.</p>
                ) : (
                  <div className={styles.commentsList}>
                    {visibleComments.map((comment) => (
                      <div key={comment._id} className={styles.commentItem}>
                        <div className={styles.commentHeader}>
                          <img
                            src={comment.avatar || '/default-avatar.png'}
                            alt={comment.username}
                            className={styles.commentAvatar}
                          />
                          <span className={styles.commentUsername}>{comment.username}</span>
                          <span className={styles.commentDate}>
                            {new Date(comment.createdAt).toLocaleDateString('pl-PL')}
                          </span>
                        </div>
                        <p className={styles.commentContent}>{comment.content}</p>
                      </div>
                    ))}
                  </div>
                )}
                {hasMoreComments && (
                  <button className={styles.loadMoreButton} onClick={loadMoreComments}>
                    <FontAwesomeIcon icon={faChevronRight} className="mr-2" /> Załaduj więcej
                  </button>
                )}
              </div>
              <a
                href={selectedPromo.promotionLink}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.modalViewButton}
              >
                <FontAwesomeIcon icon={faShoppingCart} className="mr-2" /> Zobacz produkt
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}