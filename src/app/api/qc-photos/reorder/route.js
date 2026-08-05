import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';

/**
 * PATCH /api/qc-photos/reorder
 * 
 * Reorder QC photos within a specific color variant.
 * 
 * Request Body:
 * {
 *   productId: string,
 *   variantId: string,
 *   photoOrders: Array<{ photoId: string, order: number }>
 * }
 * 
 * Requirements: 8.1, 8.3, 8.4
 */
export async function PATCH(request) {
  try {
    // Authentication and admin authorization check
    const session = await auth();
    if (!session || session.user.email !== 'kakobuybs209@gmail.com') {
      return NextResponse.json(
        { success: false, error: 'Brak uprawnień' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { productId, variantId, photoOrders } = body;

    // Validate required fields
    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      );
    }

    if (!variantId) {
      return NextResponse.json(
        { success: false, error: 'Variant ID is required' },
        { status: 400 }
      );
    }

    if (!photoOrders || !Array.isArray(photoOrders)) {
      return NextResponse.json(
        { success: false, error: 'Photo orders array is required' },
        { status: 400 }
      );
    }

    // Validate photoOrders format
    for (const item of photoOrders) {
      if (!item.photoId || typeof item.order !== 'number') {
        return NextResponse.json(
          { success: false, error: 'Each photo order must have photoId and order number' },
          { status: 400 }
        );
      }
    }

    // Connect to database
    await dbConnect();

    // Find the product
    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Ensure qcPhotos array exists
    if (!product.qcPhotos) {
      product.qcPhotos = [];
    }

    // Update order field for each photo in the variant
    let updatedCount = 0;
    for (const { photoId, order } of photoOrders) {
      const photoIndex = product.qcPhotos.findIndex(
        photo => photo._id.toString() === photoId && photo.variantId === variantId
      );

      if (photoIndex !== -1) {
        product.qcPhotos[photoIndex].order = order;
        updatedCount++;
      }
    }

    if (updatedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'No photos found for the specified variant' },
        { status: 404 }
      );
    }

    // Save the product document
    await product.save();

    return NextResponse.json({
      success: true,
      message: `Successfully updated order for ${updatedCount} photo(s)`,
      updatedCount
    });

  } catch (error) {
    console.error('Error reordering QC photos:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reorder photos' },
      { status: 500 }
    );
  }
}
