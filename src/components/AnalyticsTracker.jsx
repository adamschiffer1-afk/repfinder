'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Don't track admin visits
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

  return null;
}
