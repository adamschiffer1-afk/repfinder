import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import { NextResponse } from "next/server";

/**
 * GET /api/qc-photos
 * 
 * Retrieves QC photos for a product with optional filtering by variant and category.
 * 
 * Query Parameters:
 * - productId (required): The product ID
 * - variantId (optional): Filter photos by specific color variant
 * - category (optional): Filter photos by category ('Overview', 'Packaging', 'Details')
 * 
 * Returns:
 * {
 *   success: boolean,
 *   photos: QCPhoto[],
 *   variants: { variantId: string, variantName: string, count: number }[]
 * }
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    const variantId = searchParams.get('variantId');
    const category = searchParams.get('category');

    // Validate required parameter
    if (!productId) {
      return NextResponse.json(
        { 
          success: false, 
          error: "productId is required",
          code: "MISSING_PRODUCT_ID"
        },
        { status: 400 }
      );
    }

    await dbConnect();

    // Fetch the product
    const product = await Product.findById(productId).select('qcPhotos').lean();

    if (!product) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Product not found",
          code: "NOT_FOUND"
        },
        { status: 404 }
      );
    }

    // If no qcPhotos field or empty array, return empty result
    if (!product.qcPhotos || product.qcPhotos.length === 0) {
      return NextResponse.json({
        success: true,
        photos: [],
        variants: []
      });
    }

    let photos = product.qcPhotos;

    // Filter by variantId if provided
    if (variantId) {
      photos = photos.filter(photo => photo.variantId === variantId);
    }

    // Filter by category if provided
    if (category && category !== 'All') {
      photos = photos.filter(photo => photo.category === category);
    }

    // Sort photos by order field (ascending)
    photos.sort((a, b) => (a.order || 0) - (b.order || 0));

    // Group photos by variant to generate variant metadata
    const variantMap = new Map();
    
    for (const photo of photos) {
      const vId = photo.variantId;
      if (!variantMap.has(vId)) {
        variantMap.set(vId, {
          variantId: vId,
          variantName: photo.variantName,
          count: 0
        });
      }
      variantMap.get(vId).count++;
    }

    const variants = Array.from(variantMap.values());

    return NextResponse.json({
      success: true,
      photos,
      variants
    });

  } catch (error) {
    console.error('QC Photos GET API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to fetch QC photos",
        code: "SERVER_ERROR"
      },
      { status: 500 }
    );
  }
}
