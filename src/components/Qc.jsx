'use client';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import styles from '@/styles/Qc.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faCopy,
  faLock,
  faUnlock,
  faExpand,
  faTimes,
  faChevronLeft,
  faChevronRight,
  faPlus,
  faMinus,
  faArrowRight
} from '@fortawesome/free-solid-svg-icons';

export default function Quality() {
  const { t } = useLanguage();
  const [url, setUrl] = useState('');
  const [qcData, setQcData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentImages, setCurrentImages] = useState({});

  // Modal State
  const [modalImage, setModalImage] = useState(null);
  const [modalImages, setModalImages] = useState([]);
  const [modalIndex, setModalIndex] = useState(0);

  // Zoom & Pan State
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [currentPage, setCurrentPage] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [imageLoading, setImageLoading] = useState({});

  const itemsPerPage = 8; // Increased items per page

  const imageRefs = useRef({});
  const modalImgRef = useRef(null);
  const searchParams = useSearchParams();

  const fetchQCData = async (inputUrl) => {
    setLoading(true);
    setError(null);
    try {
      let normalizedUrl = inputUrl;
      try { normalizedUrl = decodeURIComponent(inputUrl); } catch (e) { }
      const encodedUrl = encodeURIComponent(normalizedUrl);

      const apiUrl = `/api/qc?url=${encodedUrl}`;
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error('Błąd serwera');
      const data = await response.json();

      setQcData(data);
    } catch (err) {
      console.error('QC Fetch Error:', err);
      setError(err.message || 'Błąd podczas pobierania danych.');
      setQcData(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    const qcurl = searchParams.get('qcurl');
    if (qcurl) {
      setUrl(qcurl);
      fetchQCData(qcurl);
    }
  }, [searchParams]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!url) return setError(t('qcPage.emptyError'));
    fetchQCData(url);
  };

  const changeImage = (orderKey, direction) => {
    const images = getImagesForOrder(orderKey);
    if (images.length === 0) return;

    setCurrentImages((prev) => {
      const currentIndex = prev[orderKey] || 0;
      let newIndex = currentIndex + direction;
      if (newIndex < 0) newIndex = images.length - 1;
      if (newIndex >= images.length) newIndex = 0;
      return { ...prev, [orderKey]: newIndex };
    });
  };

  const getImagesForOrder = (index) => {
    return qcData?.albums?.[index]?.images || [];
  };

  // --- Modal & Zoom Logic ---

  const openModal = (orderKey, imageIndex) => {
    const images = getImagesForOrder(orderKey);
    if (!images.length) return;
    setModalImages(images);
    setModalIndex(imageIndex);
    setModalImage(images[imageIndex]);
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
    setIsLocked(false);
  };

  const closeModal = () => {
    setModalImage(null);
    setModalImages([]);
    setZoomLevel(1);
  };

  const handleWheel = (e) => {
    e.stopPropagation();
    // Zoom on wheel
    const scaleAmount = -e.deltaY * 0.001;
    const newZoom = Math.min(Math.max(zoomLevel + scaleAmount, 1), 4);

    setZoomLevel(newZoom);

    if (newZoom === 1) {
      setPanPosition({ x: 0, y: 0 });
    }
  };



  const changeModalImage = (direction) => {
    let newIndex = modalIndex + direction;
    if (newIndex < 0) newIndex = modalImages.length - 1;
    if (newIndex >= modalImages.length) newIndex = 0;

    setModalIndex(newIndex);
    setModalImage(modalImages[newIndex]);
    setZoomLevel(1); // Reset zoom on image change
    setPanPosition({ x: 0, y: 0 });
  };

  const zoomIn = () => setZoomLevel(prev => Math.min(prev + 0.5, 4));
  const zoomOut = () => {
    setZoomLevel(prev => {
      const next = Math.max(prev - 0.5, 1);
      if (next === 1) setPanPosition({ x: 0, y: 0 });
      return next;
    });
  };



  // --- Smart Touch Logic ---
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setDragStart({ x: touch.clientX, y: touch.clientY });
      setIsDragging(true);
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const touch = e.touches[0];

    if (zoomLevel > 1) {
      // Pan Logic
      e.preventDefault();
      const deltaX = touch.clientX - dragStart.x;
      const deltaY = touch.clientY - dragStart.y;
      setPanPosition(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
      setDragStart({ x: touch.clientX, y: touch.clientY });
    }
  };

  const handleTouchEnd = (e) => {
    setIsDragging(false);

    // Swipe Logic (only if not zoomed)
    if (zoomLevel === 1) {
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - dragStart.x;

      // Threshold for swipe
      if (Math.abs(deltaX) > 50) {
        if (deltaX > 0) changeModalImage(-1); // Swipe Right -> Prev
        else changeModalImage(1); // Swipe Left -> Next
      }
    }
  };

  // --- Mouse Logic ---
  const handleMouseDown = (e) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && zoomLevel > 1) {
      e.preventDefault();
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      setPanPosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // --- Pagination ---
  const allQCs = [
    ...(qcData?.kakobuyqc?.grupy || []).map((group, i) => ({ key: `kakobuy_${i}`, ...group })),
    ...(qcData?.cnfans?.qc_data?.data || []).map((order, i) => ({ key: `cnfans_${i}`, ...order })),
  ];

  const totalPages = Math.ceil(allQCs.length / itemsPerPage);
  const paginatedQCs = allQCs.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

  const handlePageChange = (direction) => {
    setCurrentPage((prev) => {
      let newPage = prev + direction;
      if (newPage < 0) newPage = totalPages - 1;
      if (newPage >= totalPages) newPage = 0;
      return newPage;
    });
  };

  return (
    <div className={styles.qcPage}>
      <div className={styles.nebulaGlow} />

      <div className={`${styles.mainContainer} ${styles.animateIn}`}>
        <div className={styles.header}>
          <h1>{t('qcPage.title')}</h1>
          <p>{t('qcPage.subtitle')}</p>
        </div>

        <div className={styles.qcBox}>
          <form onSubmit={handleSubmit} className={styles.inputGroup}>
            <FontAwesomeIcon icon={faSearch} className={styles.inputIcon} />
            <input
              type="text"
              className={styles.input}
              placeholder={t('qcPage.placeholder')}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <button className={styles.actionBtn} type="submit" disabled={loading}>
              {loading ? <div className={styles.spinnerSmall}></div> : <FontAwesomeIcon icon={faArrowRight} />}
            </button>
          </form>


          {error && <div className={styles.statusMsg}>{error}</div>}
        </div>

        {qcData && qcData.albums && qcData.albums.length > 0 && (
          <>
            <div className={styles.qcGrid}>
              {qcData.albums?.map((album, index) => {
                const images = album.images || [];
                const currentIndex = currentImages[index] || 0;

                return (
                  <div key={index} className={styles.qcCard}>
                    <div className={styles.qcImageContainer} onClick={() => openModal(index, currentIndex)}>
                      <img
                        src={images[currentIndex]}
                        alt="QC Preview"
                        className={styles.qcImage}
                        onError={(e) => e.target.src = '/placeholder.png'}
                      />

                      {images.length > 1 && (
                        <>
                          <div
                            className={`${styles.arrowBtn} ${styles.leftArrow}`}
                            onClick={(e) => { e.stopPropagation(); changeImage(index, -1); }}
                          >
                            <FontAwesomeIcon icon={faChevronLeft} />
                          </div>
                          <div
                            className={`${styles.arrowBtn} ${styles.rightArrow}`}
                            onClick={(e) => { e.stopPropagation(); changeImage(index, 1); }}
                          >
                            <FontAwesomeIcon icon={faChevronRight} />
                          </div>
                          <div className={styles.imageCounter}>
                            {currentIndex + 1} / {images.length}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            


            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  className={styles.pageButton}
                  onClick={() => handlePageChange(-1)}
                  disabled={currentPage === 0}
                >
                  <FontAwesomeIcon icon={faChevronLeft} />
                </button>
                <span className={styles.pageInfo}>
                  Strona {currentPage + 1} z {totalPages}
                </span>
                <button
                  className={styles.pageButton}
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === totalPages - 1}
                >
                  <FontAwesomeIcon icon={faChevronRight} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {modalImage && (
        <div className={styles.modal} onClick={closeModal} onWheel={handleWheel}>
          <div className={`${styles.closeBtn}`} onClick={closeModal}>
            <FontAwesomeIcon icon={faTimes} />
          </div>

          <div
            className={styles.modalImageContainer}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={(e) => e.stopPropagation()}
            style={{
              cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
              touchAction: zoomLevel > 1 ? 'none' : 'pan-y' // Prevent scroll when zoomed
            }}
          >
            <img
              ref={modalImgRef}
              src={modalImage}
              alt="QC Fullscreen"
              style={{
                transform: `scale(${zoomLevel}) translate(${panPosition.x / zoomLevel}px, ${panPosition.y / zoomLevel}px)`,
              }}
              draggable={false}
            />

            {/* Navigation Arrows & Counter - Now inside the frame */}
            {modalImages.length > 1 && (
              <>
                <button className={`${styles.modalNavBtn} ${styles.modalPrev}`} onClick={(e) => { e.stopPropagation(); changeModalImage(-1); }}>
                  <FontAwesomeIcon icon={faChevronLeft} />
                </button>
                <button className={`${styles.modalNavBtn} ${styles.modalNext}`} onClick={(e) => { e.stopPropagation(); changeModalImage(1); }}>
                  <FontAwesomeIcon icon={faChevronRight} />
                </button>
                <div className={styles.modalImageCounter}>
                  {modalIndex + 1} / {modalImages.length}
                </div>
              </>
            )}
          </div>



          <div className={styles.modalControls} onClick={(e) => e.stopPropagation()}>
            <button className={styles.controlBtn} onClick={zoomOut}><FontAwesomeIcon icon={faMinus} /></button>
            <span style={{ color: '#fff', minWidth: '40px', textAlign: 'center' }}>{Math.round(zoomLevel * 100)}%</span>
            <button className={styles.controlBtn} onClick={zoomIn}><FontAwesomeIcon icon={faPlus} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
