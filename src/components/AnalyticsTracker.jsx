'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Track page views
  useEffect(() => {
    if (pathname && pathname.startsWith('/admin-99x-hsd')) return;

    const trackVisit = async () => {
      try {
        await fetch('/api/stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'page_view',
            userAgent: navigator.userAgent,
            path: pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '')
          })
        });
      } catch (err) {
        console.error('Analytics error:', err);
      }
    };

    trackVisit();
  }, [pathname, searchParams]);

  // Global Error and Resource Failure Logging
  useEffect(() => {
    const logError = async (payload) => {
      try {
        // Prevent recursive logger loops
        if (
          payload.errorMessage?.includes('/api/stats') ||
          payload.errorMessage?.includes('Analytics error') ||
          payload.errorMessage?.includes('Failed to track stat')
        ) {
          return;
        }

        await fetch('/api/stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'error_log',
            userAgent: navigator.userAgent,
            path: window.location.pathname + window.location.search,
            errorMessage: payload.errorMessage || 'Nieznany błąd',
            errorStack: payload.errorStack || 'Brak śladu stosu'
          })
        });
      } catch (err) {
        // Silent catch to prevent crash loops
      }
    };

    // 1. Unhandled Runtime Exceptions
    const handleRuntimeError = (event) => {
      const message = event.message || (event.error && event.error.message) || 'Błąd wykonania skryptu';
      const stack = event.error && event.error.stack ? event.error.stack : 'Event: runtime error';
      logError({ errorMessage: message, errorStack: stack });
    };

    // 2. Unhandled Promise Rejections
    const handlePromiseRejection = (event) => {
      const message = event.reason && (event.reason.message || event.reason.toString()) || 'Odrzucona obietnica (Promise Rejection)';
      const stack = event.reason && event.reason.stack ? event.reason.stack : 'Event: promise rejection';
      logError({ errorMessage: message, errorStack: stack });
    };

    // 3. Asset Loading Failures (Capture phase)
    const handleAssetLoadError = (event) => {
      const target = event.target;
      if (target && (target.tagName === 'IMG' || target.tagName === 'IMAGE')) {
        const src = target.src || 'brak src';
        // Ignore tiny transparent tracking pixels
        if (src.startsWith('data:image') && src.length < 100) return;
        
        logError({
          errorMessage: `Błąd ładowania obrazka: ${src}`,
          errorStack: 'Błąd elementu <img> w DOM (444 / Dead Link)'
        });
      }
    };

    window.addEventListener('error', handleRuntimeError);
    window.addEventListener('unhandledrejection', handlePromiseRejection);
    window.addEventListener('error', handleAssetLoadError, true); // capture = true for resource loading

    return () => {
      window.removeEventListener('error', handleRuntimeError);
      window.removeEventListener('unhandledrejection', handlePromiseRejection);
      window.removeEventListener('error', handleAssetLoadError, true);
    };
  }, []);

  return null;
}
