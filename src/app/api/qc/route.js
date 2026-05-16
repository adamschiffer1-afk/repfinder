import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ success: false, error: 'Missing url parameter' }, { status: 400 });
  }

  const apiKey = process.env.PICKSLY_API_KEY;

  if (!apiKey) {
    console.error('PICKSLY_API_KEY is not defined in environment variables');
    // For development/debugging purposes, we might want to return a specific error
    return NextResponse.json({ 
      success: false, 
      error: 'QC API is not configured on the server. Please add PICKSLY_API_KEY to your environment variables.' 
    }, { status: 500 });
  }

  try {
    const response = await fetch(
      `https://partner.picks.ly/api/qc/search?url=${encodeURIComponent(url)}`,
      {
        headers: {
          'X-API-Key': apiKey,
          'Accept': 'application/json',
        },
        cache: 'force-cache', // Enable Next.js built-in caching for this request
        next: { revalidate: 3600 } // Cache for 1 hour as per picks.ly docs
      }
    );

    const data = await response.json();
    
    // Log rate limit info if available (optional)
    const rateLimit = response.headers.get('x-ratelimit-remaining');
    if (rateLimit && parseInt(rateLimit) < 5) {
      console.warn(`Picks.ly API Rate Limit low: ${rateLimit} remaining`);
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error fetching QC photos from picks.ly:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch QC photos from upstream provider.' 
    }, { status: 502 });
  }
}
