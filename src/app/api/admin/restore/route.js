import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';

/**
 * POST - Restore pinned products from backup
 */
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { backup } = body;

    if (!Array.isArray(backup) || backup.length === 0) {
      return NextResponse.json({ error: 'No backup data provided' }, { status: 400 });
    }

    await dbConnect();

    // Prepare products for insertion (remove _id and timestamps from backup)
    const productsToRestore = backup.map(product => {
      const { _id, __v, createdAt, updatedAt, ...productData } = product;
      return {
        ...productData,
        isPinned: true, // Ensure they're pinned
        pinnedOrder: product.pinnedOrder || 999999
      };
    });

    // Insert the restored products
    const insertedProducts = await Product.insertMany(productsToRestore, { ordered: true });
    
    console.log(`✅ Restored ${insertedProducts.length} pinned products`);

    return NextResponse.json({
      success: true,
      restoredCount: insertedProducts.length,
      message: `Successfully restored ${insertedProducts.length} pinned products`
    });

  } catch (error) {
    console.error('Restore error:', error);
    return NextResponse.json(
      { error: 'Failed to restore products: ' + error.message },
      { status: 500 }
    );
  }
}
