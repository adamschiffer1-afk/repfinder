/**
 * Google Sheets Proxy API Route
 * 
 * GET /api/admin/scrape/sheets?url={googleSheetsUrl}
 * 
 * Fetches CSV data from Google Sheets URL (acts as a proxy to avoid CORS issues)
 * 
 * NOTE: This file is for Next.js App Router
 * Place at: /src/app/api/admin/scrape/sheets/route.js
 */

import { NextResponse } from 'next/server';

/**
 * GET handler for fetching Google Sheets CSV data
 * @param {Request} request - Next.js request object
 * @returns {Response} CSV data or error response
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    // Validate URL is from Google Sheets
    if (!url.includes('docs.google.com') && !url.includes('googleapis.com')) {
      return NextResponse.json({ error: 'Invalid Google Sheets URL' }, { status: 400 });
    }

    // Fetch the CSV data from Google Sheets
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch Google Sheets data' }, { status: response.status });
    }

    const csvData = await response.text();

    // Return CSV data with appropriate headers
    return new Response(csvData, {
      headers: {
        'Content-Type': 'text/csv',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Google Sheets fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
