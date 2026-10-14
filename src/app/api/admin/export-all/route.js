import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';

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

    // Get ALL products from Supabase
    const { data: allProducts, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Export error:', error);
      throw error;
    }

    console.log(`📦 Exporting ${allProducts?.length || 0} products`);

    // Return the export data
    return NextResponse.json({
      success: true,
      products: allProducts || [],
      count: allProducts?.length || 0,
      exportDate: new Date().toISOString(),
      message: `Exported ${allProducts?.length || 0} products`
    });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export products: ' + error.message },
      { status: 500 }
    );
  }
}