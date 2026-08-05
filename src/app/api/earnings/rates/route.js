import { NextResponse } from 'next/server';

// Cache rates for 1 hour so we don't hammer the free API
let cache = { rates: null, fetchedAt: 0 };
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function GET() {
  const now = Date.now();

  if (cache.rates && now - cache.fetchedAt < CACHE_TTL) {
    return NextResponse.json({ rates: cache.rates, cached: true });
  }

  try {
    // Free, no-key API: CNY base
    const res = await fetch(
      'https://open.er-api.com/v6/latest/CNY',
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) throw new Error('upstream error');

    const data = await res.json();

    if (data.result !== 'success') throw new Error('bad response');

    const rates = {
      CNY_TO_PLN: data.rates?.PLN ?? null,
      CNY_TO_USD: data.rates?.USD ?? null,
    };

    cache = { rates, fetchedAt: now };
    return NextResponse.json({ rates, cached: false });
  } catch {
    // Fallback to approximate rates if fetch fails
    const fallback = { CNY_TO_PLN: 0.585, CNY_TO_USD: 0.138 };
    return NextResponse.json({ rates: fallback, cached: false, fallback: true });
  }
}
