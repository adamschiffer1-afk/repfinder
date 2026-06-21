import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { connectToDatabase } from '@/lib/mongodb';
import Product from '@/models/Product';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request) {
  try {
    // 1. Authenticate and check admin authorization
    const session = await auth();
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Unauthorized. Admin access required.',
          code: 'UNAUTHORIZED'
        }, 
        { status: 401 }
      );
    }

    // 2. Parse form data
    const formData = await request.formData();
    const file = formData.get('file');
    const productId = formData.get('productId');
    const variantId = formData.get('variantId');
    const variantName = formData.get('variantName');
    const category = formData.get('category') || 'Overview';
    const altText = formData.get('altText') || '';

    // 3. Validate required fields
    if (!file) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No file provided',
          code: 'INVALID_REQUEST'
        }, 
        { status: 400 }
      );
    }

    if (!productId || !variantId || !variantName) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: productId, variantId, or variantName',
          code: 'INVALID_REQUEST'
        }, 
        { status: 400 }
      );
    }

    // 4. Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid file type. Only JPEG, PNG, WEBP, and GIF are allowed. Received: ${file.type}`,
          code: 'INVALID_FILE_TYPE'
        }, 
        { status: 400 }
      );
    }

    // 5. Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { 
          success: false, 
          error: `File size exceeds 10MB limit. File size: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
          code: 'FILE_TOO_LARGE'
        }, 
        { status: 413 }
      );
    }

    // 6. Generate unique filename
    const timestamp = Date.now();
    const uuid = crypto.randomUUID();
    const ext = path.extname(file.name) || '.jpg';
    const filename = `${timestamp}-${uuid}${ext}`;

    // 7. Create directory structure
    const baseDir = path.join(process.cwd(), 'public', 'qc-photos', productId, variantId);
    const originalDir = path.join(baseDir, 'original');
    const thumbnailDir = path.join(baseDir, 'thumbnails');

    if (!fs.existsSync(originalDir)) {
      fs.mkdirSync(originalDir, { recursive: true });
    }
    if (!fs.existsSync(thumbnailDir)) {
      fs.mkdirSync(thumbnailDir, { recursive: true });
    }

    // 8. Process image with Sharp
    const buffer = Buffer.from(await file.arrayBuffer());
    
    const originalPath = path.join(originalDir, filename);
    const thumbnailPath = path.join(thumbnailDir, filename);

    try {
      // Process original image (max 1920px width, quality 85%)
      await sharp(buffer)
        .resize(1920, null, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .jpeg({ quality: 85, progressive: true })
        .toFile(originalPath);

      // Generate thumbnail (300px, quality 80%)
      await sharp(buffer)
        .resize(300, 300, { 
          fit: 'cover',
          position: 'center' 
        })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);
    } catch (imageError) {
      // Cleanup on image processing error
      console.error('Image processing error:', imageError);
      
      if (fs.existsSync(originalPath)) {
        fs.unlinkSync(originalPath);
      }
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
      }

      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to process image. The file may be corrupted or invalid.',
          code: 'UPLOAD_FAILED'
        }, 
        { status: 500 }
      );
    }

    // 9. Connect to database and update Product document
    await connectToDatabase();

    const product = await Product.findById(productId);
    if (!product) {
      // Cleanup files if product doesn't exist
      fs.unlinkSync(originalPath);
      fs.unlinkSync(thumbnailPath);

      return NextResponse.json(
        { 
          success: false, 
          error: 'Product not found',
          code: 'NOT_FOUND'
        }, 
        { status: 404 }
      );
    }

    // 10. Calculate next order value for variant
    const variantPhotos = product.qcPhotos?.filter(photo => photo.variantId === variantId) || [];
    const maxOrder = variantPhotos.length > 0 
      ? Math.max(...variantPhotos.map(p => p.order || 0))
      : -1;
    const nextOrder = maxOrder + 1;

    // 11. Create photo metadata
    const photoUrl = `/qc-photos/${productId}/${variantId}/original/${filename}`;
    const thumbnailUrl = `/qc-photos/${productId}/${variantId}/thumbnails/${filename}`;

    const photoMetadata = {
      _id: new Date().getTime().toString() + Math.random().toString(36).substr(2, 9),
      url: photoUrl,
      thumbnailUrl: thumbnailUrl,
      variantId: variantId,
      variantName: variantName,
      category: category,
      order: nextOrder,
      altText: altText,
      uploadedAt: new Date()
    };

    // 12. Update Product document
    if (!product.qcPhotos) {
      product.qcPhotos = [];
    }
    product.qcPhotos.push(photoMetadata);

    try {
      await product.save();
    } catch (dbError) {
      // Cleanup files if database update fails
      console.error('Database error:', dbError);
      
      fs.unlinkSync(originalPath);
      fs.unlinkSync(thumbnailPath);

      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to save photo metadata to database',
          code: 'UPLOAD_FAILED'
        }, 
        { status: 500 }
      );
    }

    // 13. Return success response
    return NextResponse.json({
      success: true,
      photo: photoMetadata
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'An unexpected error occurred during upload',
        code: 'UPLOAD_FAILED'
      }, 
      { status: 500 }
    );
  }
}
