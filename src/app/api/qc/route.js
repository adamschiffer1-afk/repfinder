import { NextResponse } from 'next/server';
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import { extractItemId } from "@/utils/converter";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ success: false, error: 'Missing url parameter' }, { status: 400 });
  }

  // 1. Try to find local QC images scraped from Telegram in our MongoDB database
  try {
    const itemId = extractItemId(url);
    if (itemId) {
      await dbConnect();
      // Find a product whose purchase link contains this item ID
      const product = await Product.findOne({
        link: { $regex: itemId },
        qcImages: { $exists: true, $not: { $size: 0 } }
      });

      if (product && product.qcImages && product.qcImages.length > 0) {
        console.log(`✅ Found local Telegram QC images for item ID ${itemId} (Product: ${product.name})`);
        return NextResponse.json({
          success: true,
          local: true,
          albums: [
            {
              images: product.qcImages
            }
          ]
        });
      }
    }
  } catch (dbError) {
    console.error('Error searching for local QC images in database:', dbError);
    // Continue to fallback Picks.ly API if DB fails
  }

  // 2. Fallback to Picks.ly upstream API
  const apiKey = process.env.PICKSLY_API_KEY;

  if (!apiKey) {
    console.error('PICKSLY_API_KEY is not defined in environment variables');
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
        cache: 'force-cache',
        next: { revalidate: 3600 }
      }
    );

    const data = await response.json();
    
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
