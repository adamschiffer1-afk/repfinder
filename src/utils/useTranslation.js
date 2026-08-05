'use client';
import { useState, useEffect } from 'react';
import { translations } from './translations';

export function useTranslation() {
  const [language, setLanguage] = useState('PL');

  useEffect(() => {
    // Load initial language
    const saved = localStorage.getItem('preferredLanguage');
    if (saved) setLanguage(saved);

    // Listen for changes
    const handleStorageChange = () => {
      const updated = localStorage.getItem('preferredLanguage');
      if (updated) setLanguage(updated);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const t = translations[language] || translations.PL;

  return { t, language };
}
