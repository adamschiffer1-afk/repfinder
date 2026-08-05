'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Helper to generate UUID v4
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (pathname && pathname.startsWith('/admin-99x-hsd')) return;

    // 1. Setup Visitor ID (Fingerprinting)
    let visitorId = localStorage.getItem('__vf_visitor_id');
    if (!visitorId) {
      visitorId = generateUUID();
      localStorage.setItem('__vf_visitor_id', visitorId);
    }

    // 2. Setup UTM & Referrer
    const urlParams = new URLSearchParams(window.location.search);
    const utmSource = urlParams.get('utm_source') || '';
    const utmCampaign = urlParams.get('utm_campaign') || '';
    // Store referrer only if it's an external site
    let referrer = document.referrer;
    if (referrer && referrer.includes(window.location.hostname)) {
      referrer = ''; // internal navigation
    }

    // 3. Track Page View
    const trackVisit = async () => {
      try {
        await fetch('/api/stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'page_view',
            visitorId,
            referrer,
            utmSource,
            utmCampaign,
            userAgent: navigator.userAgent,
            path: pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '')
          })
        });
      } catch (err) {
        console.error('Analytics error:', err);
      }
    };
    trackVisit();

    // 4. Track Engagement (Time on Site & Scroll Depth)
    const startTime = performance.now();
    let maxScroll = 0;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (docHeight > 0) {
        const depth = Math.round((scrollY / docHeight) * 100);
        if (depth > maxScroll) maxScroll = depth;
      }
    };
    
    // Throttled scroll listener
    let scrollTimeout;
    const scrollListener = () => {
      if (!scrollTimeout) {
        scrollTimeout = setTimeout(() => {
          handleScroll();
          scrollTimeout = null;
        }, 500);
      }
    };
    window.addEventListener('scroll', scrollListener);

    // Send engagement beacon on page exit
    const handleExit = () => {
      const timeSpent = Math.round((performance.now() - startTime) / 1000);
      // Only track meaningful engagement (> 2 seconds or scrolled)
      if (timeSpent > 2 || maxScroll > 10) {
        const payload = JSON.stringify({
          type: 'engagement',
          visitorId,
          path: window.location.pathname,
          timeSpent,
          scrollDepth: maxScroll
        });
        navigator.sendBeacon('/api/stats', payload);
      }
    };
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') handleExit();
    });
    window.addEventListener('pagehide', handleExit);

    // 5. Global Sentry-style Breadcrumbs
    window.__breadcrumbs = window.__breadcrumbs || [];
    const handleBreadcrumbClick = (e) => {
      let target = e.target;
      let depth = 0;
      // Find nearest interactive element up to 3 levels deep
      while (target && depth < 3 && target !== document.body) {
        if (target.tagName === 'BUTTON' || target.tagName === 'A' || target.role === 'button' || target.onclick) {
          const text = target.innerText?.substring(0, 30).replace(/\n/g, ' ').trim() || target.getAttribute('aria-label') || target.tagName;
          const action = `${target.tagName.toLowerCase()}[${text}]`;
          window.__breadcrumbs.push(action);
          if (window.__breadcrumbs.length > 5) window.__breadcrumbs.shift();
          break;
        }
        target = target.parentElement;
        depth++;
      }
    };
    document.addEventListener('click', handleBreadcrumbClick);

    // 6. Global Error Logger
    const logError = async (payload) => {
      try {
        if (
          payload.errorMessage?.includes('/api/stats') ||
          payload.errorMessage?.includes('Analytics error') ||
          payload.errorMessage?.includes('Failed to track stat')
        ) return;

        await fetch('/api/stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'error_log',
            visitorId,
            userAgent: navigator.userAgent,
            path: window.location.pathname + window.location.search,
            errorMessage: payload.errorMessage || 'Nieznany błąd',
            errorStack: payload.errorStack || 'Brak śladu stosu',
            breadcrumbs: window.__breadcrumbs || []
          })
        });
      } catch (err) {}
    };

    const handleRuntimeError = (event) => {
      const message = event.message || (event.error && event.error.message) || 'Błąd wykonania skryptu';
      const stack = event.error && event.error.stack ? event.error.stack : 'Event: runtime error';
      logError({ errorMessage: message, errorStack: stack });
    };

    const handlePromiseRejection = (event) => {
      const message = event.reason && (event.reason.message || event.reason.toString()) || 'Odrzucona obietnica (Promise Rejection)';
      const stack = event.reason && event.reason.stack ? event.reason.stack : 'Event: promise rejection';
      logError({ errorMessage: message, errorStack: stack });
    };

    const handleAssetLoadError = (event) => {
      const target = event.target;
      if (target && (target.tagName === 'IMG' || target.tagName === 'IMAGE')) {
        const src = target.src || 'brak src';
        if (src.startsWith('data:image') && src.length < 100) return;
        logError({
          errorMessage: `Błąd ładowania obrazka: ${src}`,
          errorStack: 'Błąd elementu <img> w DOM (444 / Dead Link)'
        });
      }
    };

    window.addEventListener('error', handleRuntimeError);
    window.addEventListener('unhandledrejection', handlePromiseRejection);
    window.addEventListener('error', handleAssetLoadError, true);

    return () => {
      window.removeEventListener('scroll', scrollListener);
      window.removeEventListener('pagehide', handleExit);
      document.removeEventListener('click', handleBreadcrumbClick);
      window.removeEventListener('error', handleRuntimeError);
      window.removeEventListener('unhandledrejection', handlePromiseRejection);
      window.removeEventListener('error', handleAssetLoadError, true);
    };
  }, [pathname, searchParams]);

  return null;
}
