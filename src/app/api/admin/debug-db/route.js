/**
 * Debug DB endpoint - sprawdza połączenie Supabase i liczbę produktów
 * GET /api/admin/debug-db?secret=check123
 */

import { NextResponse } from 'next/server';
import { ProductDB, supabaseAdmin } from '@/lib/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get('secret') !== 'check123') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔍 Trying to connect to Supabase...');
    console.log('SUPABASE_URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('SUPABASE_SERVICE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    const count = await ProductDB.countDocuments({});
    console.log('📊 Total products in DB:', count);

    const { data: sample, error } = await supabaseAdmin
      .from('products')
      .select('id, name, category, batch, is_pinned')
      .limit(3);
    
    if (error) throw error;
    
    console.log('📦 Sample products:', sample);

    return NextResponse.json({
      success: true,
      database: 'Supabase (PostgreSQL)',
      supabase_url_exists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabase_service_key_exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
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
      supabase_url_exists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabase_service_key_exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    }, { status: 500 });
  }
}
