/**
 * Fix All Categories API Route
 * 
 * GET /api/admin/fix-categories?secret=fix-my-categories-now
 * 
 * Analyzes all products and fixes miscategorized items
 */

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import { detectCategory } from '@/utils/categoryHelper';

export async function GET(request) {
  try {
    console.log('Fix categories request received');
    
    // Simple auth with query param
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    
    if (secret !== 'fix-my-categories-now') {
      return NextResponse.json({ 
        error: 'Unauthorized', 
        hint: 'Add ?secret=fix-my-categories-now to URL' 
      }, { status: 401 });
    }

    console.log('Auth passed, connecting to MongoDB...');
    await dbConnect();
    
    console.log('📦 Fetching all products...');
    const products = await Product.find({});
    console.log(`Found ${products.length} products`);

    let fixed = 0;
    let unchanged = 0;
    const changes = [];

    console.log('🔍 Analyzing categories...\n');

    for (const product of products) {
      const currentCategory = product.category;
      const correctCategory = detectCategory(product.name);

      if (currentCategory !== correctCategory) {
        console.log(`❌ "${product.name}"`);
        console.log(`   ${currentCategory} → ${correctCategory}`);
        
        product.category = correctCategory;
        await product.save();
        
        changes.push({
          id: product._id.toString(),
          name: product.name,
          oldCategory: currentCategory,
          newCategory: correctCategory
        });
        
        fixed++;
      } else {
        unchanged++;
      }
    }

    console.log(`\n✅ Fixed: ${fixed} | Already correct: ${unchanged}`);

    return NextResponse.json({
      success: true,
      total: products.length,
      fixed,
      unchanged,
      changes: changes.slice(0, 50) // Limit to first 50 changes for response size
    });

  } catch (error) {
    console.error('❌ Fix categories error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message, stack: error.stack },
      { status: 500 }
    );
  }
}