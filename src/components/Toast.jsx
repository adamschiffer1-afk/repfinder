'use client';
import { createContext, useContext, useState, useCallback } from 'react';
import styles from '@/styles/Toast.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faExclamationCircle, faInfoCircle, faXmark } from '@fortawesome/free-solid-svg-icons';

const ToastContext = createContext();

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', options = {}) => {
    const duration = options.duration ?? 3000;
    const id = Date.now();
    
    // Remove existing toasts of same type before adding new one
    setToasts(prev => {
      const filtered = type === 'success' 
        ? prev.filter(t => t.type !== 'success') 
        : prev;
      return [...filtered, { id, message, type, removing: false }];
    });
    
    if (duration > 0) {
      setTimeout(() => {
        // Add removing class first
        setToasts(prev => prev.map(t => t.id === id ? { ...t, removing: true } : t));
        // Then remove after animation
        setTimeout(() => {
          removeToast(id);
        }, 200);
      }, duration);
    }
    
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    // Add removing class first
    setToasts(prev => prev.map(t => t.id === id ? { ...t, removing: true } : t));
    // Then remove after animation
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 200);
  }, []);

  const toast = {
    success: (msg, options) => addToast(msg, 'success', options),
    error: (msg, options) => addToast(msg, 'error', options),
    info: (msg, options) => addToast(msg, 'info', options),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className={styles.toastContainer}>
        {toasts.map(({ id, message, type, removing }) => (
          <div key={id} className={`${styles.toast} ${styles[type]} ${removing ? styles.removing : ''}`}>
            <FontAwesomeIcon 
              icon={type === 'success' ? faCheckCircle : type === 'error' ? faExclamationCircle : faInfoCircle} 
              className={styles.toastIcon}
            />
            <span className={styles.toastMessage}>{message}</span>
            <button 
              className={styles.toastClose}
              onClick={() => removeToast(id)}
              aria-label="Close"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
