'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { getVisitorId } from '@/lib/visitorId';

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();


  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Exclude admin routes
    if (pathname && pathname.startsWith('/admin')) return;

    // Check if user is admin (exclude from tracking)
    const checkIfAdmin = async () => {
      try {
        const response = await fetch('/api/auth/session');
        const session = await response.json();
        if (session?.user?.email === 'kakobuybs209@gmail.com') {
          console.log('Admin detected - skipping analytics');
          return true;
        }
      } catch (err) {
        // Not admin or not logged in
      }
      return false;
    };

    let disposed = false;
    let skip = false; // admin: no tracking
    const cleanups = [];
    const on = (target, ev, fn, opts) => { target.addEventListener(ev, fn, opts); cleanups.push(() => target.removeEventListener(ev, fn, opts)); };

    // 1. Visitor ID (Fingerprinting)
    const visitorId = getVisitorId();

    // 2. UTM & Referrer
    const urlParams = new URLSearchParams(window.location.search);
    const utmSource = urlParams.get('utm_source') || '';
    const utmCampaign = urlParams.get('utm_campaign') || '';
    let referrer = document.referrer;
    if (referrer && referrer.includes(window.location.hostname)) referrer = ''; // internal navigation
    const pagePath = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');

    // 3. Page view (after the admin check)
    (async () => {
      const isAdmin = await checkIfAdmin();
      if (disposed) return;
      if (isAdmin) { skip = true; return; }
      try {
        await fetch('/api/stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'page_view', visitorId, referrer, utmSource, utmCampaign, userAgent: navigator.userAgent, path: pagePath }),
        });
      } catch (err) {
        console.error('Analytics error:', err);
      }
    })();

    // 4. Engagement: ONE record per page view, counting only time the tab is visible.
    const MAX_SECONDS = 30 * 60;
    let visibleMs = 0;
    let visibleSince = document.visibilityState === 'visible' ? performance.now() : null;
    let maxScroll = 0;
    let sent = false;

    const pauseClock = () => {
      if (visibleSince !== null) { visibleMs += performance.now() - visibleSince; visibleSince = null; }
    };
    const flushEngagement = () => {
      if (sent || skip) return;
      pauseClock();
      sent = true;
      const timeSpent = Math.min(MAX_SECONDS, Math.round(visibleMs / 1000));
      if (timeSpent > 2 || maxScroll > 10) {
        navigator.sendBeacon('/api/stats', JSON.stringify({
          type: 'engagement', visitorId, path: pathname, timeSpent, scrollDepth: maxScroll,
        }));
      }
    };

    let scrollTimeout = null;
    on(window, 'scroll', () => {
      if (scrollTimeout) return;
      scrollTimeout = setTimeout(() => {
        scrollTimeout = null;
        const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        if (docHeight > 0) maxScroll = Math.max(maxScroll, Math.round((window.scrollY / docHeight) * 100));
      }, 500);
    }, { passive: true });
    cleanups.push(() => clearTimeout(scrollTimeout));

    // Leaving the tab is the last reliable moment on mobile, so it ends the measurement.
    on(document, 'visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushEngagement();
      else if (!sent) visibleSince = performance.now();
    });
    on(window, 'pagehide', flushEngagement);

    // 5. Sentry-style breadcrumbs
    window.__breadcrumbs = window.__breadcrumbs || [];
    on(document, 'click', (e) => {
      let target = e.target;
      let depth = 0;
      while (target && depth < 3 && target !== document.body) {
        if (target.tagName === 'BUTTON' || target.tagName === 'A' || target.role === 'button' || target.onclick) {
          const text = target.innerText?.substring(0, 30).replace(/\n/g, ' ').trim() || target.getAttribute('aria-label') || target.tagName;
          window.__breadcrumbs.push(`${target.tagName.toLowerCase()}[${text}]`);
          if (window.__breadcrumbs.length > 5) window.__breadcrumbs.shift();
          break;
        }
        target = target.parentElement;
        depth++;
      }
    });

    // 6. Global error logger
    const logError = async (payload) => {
      if (skip) return;
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
            breadcrumbs: window.__breadcrumbs || [],
          }),
        });
      } catch (err) {}
    };
    on(window, 'error', (event) => {
      const message = event.message || (event.error && event.error.message) || 'Błąd wykonania skryptu';
      const stack = event.error && event.error.stack ? event.error.stack : 'Event: runtime error';
      logError({ errorMessage: message, errorStack: stack });
    });
    on(window, 'unhandledrejection', (event) => {
      const message = (event.reason && (event.reason.message || event.reason.toString())) || 'Odrzucona obietnica (Promise Rejection)';
      const stack = event.reason && event.reason.stack ? event.reason.stack : 'Event: promise rejection';
      logError({ errorMessage: message, errorStack: stack });
    });
    on(window, 'error', (event) => {
      const target = event.target;
      if (target && (target.tagName === 'IMG' || target.tagName === 'IMAGE')) {
        const src = target.src || 'brak src';
        if (src.startsWith('data:image') && src.length < 100) return;
        logError({ errorMessage: `Błąd ładowania obrazka: ${src}`, errorStack: 'Błąd elementu <img> w DOM (444 / Dead Link)' });
      }
    }, true);

    // Route change / unmount: finish this page's measurement and drop every listener.
    return () => {
      disposed = true;
      flushEngagement();
      cleanups.forEach(fn => fn());
    };
  }, [pathname, searchParams]);

  return null;
}
