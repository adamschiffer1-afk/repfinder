import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';

/**
 * POST - Backup pinned products and delete all products
 */
export async function POST(request) {
  try {
    const session = await auth();
    // Use same auth as bulk scraper
    if (!session || session.user.email !== 'kakobuybs209@gmail.com') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Get all pinned products
    const pinnedProducts = await Product.find({ isPinned: true })
      .sort({ pinnedOrder: 1 })
      .lean();

    console.log(`📦 Found ${pinnedProducts.length} pinned products to backup`);

    // Delete ALL products
    const deleteResult = await Product.deleteMany({});
    console.log(`🗑️  Deleted ${deleteResult.deletedCount} products`);

    // Return the backup data
    return NextResponse.json({
      success: true,
      backup: pinnedProducts,
      deletedCount: deleteResult.deletedCount,
      message: `Backed up ${pinnedProducts.length} pinned products and deleted ${deleteResult.deletedCount} total products`
    });

  } catch (error) {
    console.error('Backup error:', error);
    return NextResponse.json(
      { error: 'Failed to backup and delete products: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * GET - Get list of available backups (from session storage)
 */
export async function GET(request) {
  try {
    const session = await auth();
    // Use same auth as bulk scraper
    if (!session || session.user.email !== 'kakobuybs209@gmail.com') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // This endpoint is just for checking auth
    // Backups are stored client-side in this implementation
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to check backups' },
      { status: 500 }
    );
  }
}
