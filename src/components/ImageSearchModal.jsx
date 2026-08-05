'use client';
import { useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faUpload, faCamera, faSpinner, faCheckCircle, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
import styles from '@/styles/ImageSearchModal.module.css';
import { useLanguage } from '@/context/LanguageContext';

export default function ImageSearchModal({ isOpen, onClose }) {
  const { t } = useLanguage();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setResults([]);
    setError(null);
    onClose();
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      processFile(selected);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) {
      processFile(dropped);
    }
  };

  const processFile = (file) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }
    setError(null);
    setFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);
    
    // Auto submit
    handleSearch(file);
  };

  const handleSearch = async (fileToSearch) => {
    setLoading(true);
    setError(null);
    setResults([]);

    const formData = new FormData();
    formData.append('image', fileToSearch);

    try {
      const res = await fetch('/api/search/image', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Search failed');
      }

      setResults(data.products || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={handleClose}>
          <FontAwesomeIcon icon={faTimes} />
        </button>

        <h2 className={styles.title}>
          <FontAwesomeIcon icon={faCamera} className={styles.titleIcon} />
          Image Search
        </h2>
        <p className={styles.subtitle}>Upload a photo to find similar products in our database.</p>

        {!preview && (
          <div 
            className={styles.dropzone}
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileChange}
            />
            <div className={styles.dropzoneContent}>
              <FontAwesomeIcon icon={faUpload} className={styles.uploadIcon} />
              <p>Click or drag an image here</p>
              <span className={styles.smallText}>Supports JPG, PNG</span>
            </div>
          </div>
        )}

        {preview && (
          <div className={styles.previewContainer}>
            <img src={preview} alt="Preview" className={styles.previewImg} />
            <button className={styles.changeBtn} onClick={() => {
              setPreview(null);
              setFile(null);
              setResults([]);
            }}>Change Image</button>
          </div>
        )}

        {error && (
          <div className={styles.errorBox}>
            <FontAwesomeIcon icon={faExclamationCircle} /> {error}
          </div>
        )}

        {loading && (
          <div className={styles.loadingBox}>
            <FontAwesomeIcon icon={faSpinner} spin className={styles.spinner} />
            <p>Analyzing image & searching database...</p>
          </div>
        )}

        {results.length > 0 && (
          <div className={styles.resultsContainer}>
            <h3 className={styles.resultsTitle}>Found {results.length} matches:</h3>
            <div className={styles.resultsGrid}>
              {results.map((product) => (
                <a key={product._id} href={`/products?search=${encodeURIComponent(product.name)}`} className={styles.resultCard}>
                  <img src={product.image} alt={product.name} className={styles.resultImg} />
                  <div className={styles.resultInfo}>
                    <p className={styles.resultName}>{product.name}</p>
                    <p className={styles.resultPrice}>¥{product.price}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
