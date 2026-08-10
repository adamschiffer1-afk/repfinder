/**
 * Debug DB endpoint - sprawdza połączenie i liczbę produktów
 * GET /api/admin/debug-db?secret=check123
 */

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get('secret') !== 'check123') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔍 Trying to connect to MongoDB...');
    console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);
    console.log('MONGODB_URI starts with:', process.env.MONGODB_URI?.substring(0, 20));

    await dbConnect();
    console.log('✅ MongoDB connected!');

    const count = await Product.countDocuments({});
    console.log('📊 Total products in DB:', count);

    const sample = await Product.find({}).limit(3).select('name category batch isPinned');
    console.log('📦 Sample products:', sample);

    return NextResponse.json({
      success: true,
      mongodb_uri_exists: !!process.env.MONGODB_URI,
      mongodb_uri_prefix: process.env.MONGODB_URI?.substring(0, 30),
      connection: 'OK',
      total_products: count,
      sample_products: sample
    });

  } catch (error) {
    console.error('❌ Debug error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
      mongodb_uri_exists: !!process.env.MONGODB_URI
    }, { status: 500 });
  }
}
