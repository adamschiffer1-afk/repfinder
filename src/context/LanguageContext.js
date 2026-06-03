'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '@/utils/translations';

const LanguageContext = createContext();

// Map browser locale to supported language code
function detectBrowserLanguage() {
  if (typeof navigator === 'undefined') return 'pl';
  const supported = Object.keys(translations); // ['pl', 'en', 'cn', 'de', 'es']
  const browserLangs = navigator.languages || [navigator.language || 'pl'];

  for (const lang of browserLangs) {
    const code = lang.toLowerCase().split('-')[0]; // 'de-DE' → 'de'
    // Map zh/zh-hans/zh-hant → cn
    const mapped = code === 'zh' ? 'cn' : code;
    if (supported.includes(mapped)) return mapped;
  }
  return 'en'; // International fallback
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('pl'); // SSR safe default

  useEffect(() => {
    const savedLanguage = localStorage.getItem('repfinder_lang');
    if (savedLanguage && translations[savedLanguage]) {
      setLanguage(savedLanguage);
    } else {
      // First visit — auto-detect from browser
      const detected = detectBrowserLanguage();
      setLanguage(detected);
    }
  }, []);

  const changeLanguage = (lang) => {
    if (translations[lang]) {
      setLanguage(lang);
      localStorage.setItem('repfinder_lang', lang);
      document.documentElement.lang = lang;
    }
  };

  const t = (keyPath) => {
    const keys = keyPath.split('.');
    let value = translations[language];
    
    for (const key of keys) {
      if (value && value[key]) {
        value = value[key];
      } else {
        return keyPath; // Fallback to key path if translation missing
      }
    }
    
    return value;
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
