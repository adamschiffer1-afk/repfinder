'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faCamera, faImage, faExclamationCircle, faLock } from '@fortawesome/free-solid-svg-icons';
import styles from '@/styles/ImageSearchModal.module.css';
import { useLanguage } from '@/context/LanguageContext';
import { searchByImage, warmUpImageSearch, onImageSearchStatus } from '@/lib/imageSearch';

/**
 * Lets the user pick/drop/paste a photo, runs the search in the browser and
 * hands results back via onResults(results, previewUrl).
 */
export default function ImageSearchModal({ isOpen, onClose, onResults }) {
  const { t } = useLanguage();
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [modelProgress, setModelProgress] = useState(null); // null = not downloading
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    warmUpImageSearch();
    return onImageSearchStatus((s) => {
      if (s.stage === 'model') setModelProgress(s.progress ?? 0);
      if (s.stage === 'ready') setModelProgress(null);
      if (s.stage === 'error') {
        setModelProgress(null);
        setBusy(false);
        setError(t('imageSearch.failed'));
      }
    });
  }, [isOpen, t]);

  const reset = () => {
    setPreview(null);
    setBusy(false);
    setError(null);
  };

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose]);

  const runSearch = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setError(t('imageSearch.notImage'));
      return;
    }
    setError(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    setBusy(true);
    try {
      const results = await searchByImage(file);
      setBusy(false);
      onResults(results, url);
      setPreview(null);
      onClose();
    } catch (err) {
      console.error('[ImageSearch]', err);
      setBusy(false);
      setError(t('imageSearch.failed'));
    }
  }, [onResults, onClose, t]);

  // Paste from clipboard + Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const onPaste = (e) => {
      const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/'));
      if (item) runSearch(item.getAsFile());
    };
    const onKey = (e) => { if (e.key === 'Escape' && !busy) handleClose(); };
    window.addEventListener('paste', onPaste);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('paste', onPaste);
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, busy, runSearch, handleClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={() => !busy && handleClose()}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="img-search-title" onClick={e => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={handleClose} aria-label="Close">
          <FontAwesomeIcon icon={faTimes} />
        </button>

        <h2 id="img-search-title" className={styles.title}>
          <FontAwesomeIcon icon={faCamera} className={styles.titleIcon} />
          {t('imageSearch.title')}
        </h2>
        <p className={styles.subtitle}>{t('imageSearch.subtitle')}</p>

        {!preview ? (
          <div
            className={styles.dropzone}
            role="button"
            tabIndex={0}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); runSearch(e.dataTransfer.files[0]); }}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && fileInputRef.current?.click()}
          >
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              hidden
              onChange={e => { runSearch(e.target.files[0]); e.target.value = ''; }}
            />
            <FontAwesomeIcon icon={faImage} className={styles.uploadIcon} />
            <p className={styles.dropText}>{t('imageSearch.drop')}</p>
            <span className={styles.smallText}>{t('imageSearch.formats')}</span>
          </div>
        ) : (
          <div className={styles.previewContainer}>
            <img src={preview} alt="" className={styles.previewImg} />
            {busy && (
              <div className={styles.previewOverlay}>
                <div className={styles.spinner} />
                <p>
                  {modelProgress !== null
                    ? `${t('imageSearch.loadingModel')} ${modelProgress}%`
                    : t('imageSearch.analyzing')}
                </p>
                {modelProgress !== null && (
                  <>
                    <div className={styles.progressTrack}>
                      <div className={styles.progressBar} style={{ width: `${modelProgress}%` }} />
                    </div>
                    <span className={styles.smallText}>{t('imageSearch.firstTime')}</span>
                  </>
                )}
              </div>
            )}
            {!busy && (
              <button className={styles.changeBtn} onClick={reset}>{t('imageSearch.change')}</button>
            )}
          </div>
        )}

        {error && (
          <div className={styles.errorBox} role="alert">
            <FontAwesomeIcon icon={faExclamationCircle} /> {error}
          </div>
        )}

        <p className={styles.privacy}>
          <FontAwesomeIcon icon={faLock} /> {t('imageSearch.privacy')}
        </p>
      </div>
    </div>
  );
}
