'use client';
import { useState, useEffect } from 'react';

export function useCurrency() {
  const [currency, setCurrency] = useState('USD');
  const [rates, setRates] = useState({ USD: 1, PLN: 4.0, CNY: 7.2 }); // Domyślne wartości w razie błędu API

  useEffect(() => {
    // Wczytaj zapisaną walutę z localStorage
    const savedCurrency = localStorage.getItem('preferredCurrency');
    if (savedCurrency) {
      setCurrency(savedCurrency);
    } else {
      // Domyślnie użyjmy PLN jeśli nie zapisano innej
      setCurrency('PLN');
      localStorage.setItem('preferredCurrency', 'PLN');
    }

    // Nasłuchuj zmian ustawień (z SettingsModal)
    const handleStorage = () => {
      const updatedCurrency = localStorage.getItem('preferredCurrency');
      if (updatedCurrency) {
        setCurrency(updatedCurrency);
      }
    };
    window.addEventListener('storage', handleStorage);

    // Pobierz aktualne kursy walut z otwartego API
    const fetchRates = async () => {
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await res.json();
        if (data && data.rates) {
          setRates({
            USD: 1,
            PLN: data.rates.PLN || 4.0,
            CNY: data.rates.CNY || 7.2
          });
        }
      } catch (error) {
        console.error('Błąd pobierania kursów walut:', error);
      }
    };
    
    fetchRates();

    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const formatPrice = (priceInUSD) => {
    // Upewnijmy się, że cena to liczba
    const parsedPrice = parseFloat(priceInUSD) || 0;
    const rate = rates[currency] || 1;
    const converted = parsedPrice * rate;
    
    // Formatowanie w zależności od wybranej waluty
    if (currency === 'PLN') {
      return `${converted.toFixed(2)} PLN`;
    } else if (currency === 'CNY') {
      return `¥${converted.toFixed(2)}`;
    } else {
      // Domyślnie USD
      return `$${converted.toFixed(2)}`;
    }
  };

  return { currency, formatPrice };
}
