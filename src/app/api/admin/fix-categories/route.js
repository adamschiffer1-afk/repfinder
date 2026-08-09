/**
 * Fix All Categories API Route
 * 
 * GET /api/admin/fix-categories
 * 
 * Analyzes all products and fixes miscategorized items
 */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import { detectCategory } from '@/utils/categoryHelper';

export async function GET(request) {
  console.log('Fix categories request received');
  
  // Check authentication
  const session = await auth();
  if (!session || session.user.email !== 'kakobuybs209@gmail.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    await dbConnect();
    
    console.log('📦 Fetching all products...');
    const products = await Product.find({});
    console.log(`Found ${products.length} products`);

    let fixed = 0;
    let unchanged = 0;
    const changes = [];

    console.log('🔍 Analyzing categories...');

    for (const product of products) {
      const currentCategory = product.category;
      const correctCategory = detectCategory(product.name);

      if (currentCategory !== correctCategory) {
        console.log(`❌ WRONG: "${product.name}" - Was: ${currentCategory} → Should be: ${correctCategory}`);
        
        product.category = correctCategory;
        await product.save();
        
        changes.push({
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
      changes
    });

  } catch (error) {
    console.error('Fix categories error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}
