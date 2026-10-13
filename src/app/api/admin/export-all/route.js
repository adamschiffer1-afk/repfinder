import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';

/**
 * POST - Export all products as JSON backup
 */
export async function POST(request) {
  try {
    const session = await auth();
    // Use same auth as bulk scraper
    if (!session || session.user.email !== 'kakobuybs209@gmail.com') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Get ALL products
    const allProducts = await Product.find({})
      .sort({ createdAt: -1 })
      .lean();

    console.log(`📦 Exporting ${allProducts.length} products`);

    // Return the export data
    return NextResponse.json({
      success: true,
      products: allProducts,
      count: allProducts.length,
      exportDate: new Date().toISOString(),
      message: `Exported ${allProducts.length} products`
    });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export products: ' + error.message },
      { status: 500 }
    );
  }
}
