/**
 * Diagnostic script to check Supabase configuration
 * Run with: node check_supabase.js
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('\n=== SUPABASE CONFIGURATION CHECK ===\n');

console.log('Environment variables:');
console.log('- NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing');
console.log('- SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓ Set' : '✗ Missing');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('\n❌ Missing required environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabase() {
  try {
    console.log('\n=== DATABASE CONNECTION ===\n');
    
    // Check products table
    console.log('Checking products table...');
    const { data: products, error: productsError, count } = await supabase
      .from('products')
      .select('*', { count: 'exact' })
      .limit(5);
    
    if (productsError) {
      console.error('❌ Products table error:', productsError.message);
    } else {
      console.log('✓ Products table exists');
      console.log(`  Total products: ${count}`);
      if (products && products.length > 0) {
        console.log('  Sample product columns:', Object.keys(products[0]).join(', '));
        console.log('  First product:', JSON.stringify(products[0], null, 2));
      }
    }

    // Check users table
    console.log('\nChecking users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (usersError) {
      console.error('❌ Users table error:', usersError.message);
    } else {
      console.log('✓ Users table exists');
    }

    // Check required columns in products table
    if (products && products.length > 0) {
      console.log('\n=== CHECKING REQUIRED COLUMNS ===\n');
      const requiredColumns = [
        'id', 'name', 'price', 'image', 'link', 
        'category', 'batch', 'clicks', 
        'is_pinned', 'pinned_order', 'qc_images',
        'created_at', 'updated_at', 'slug'
      ];
      
      const existingColumns = Object.keys(products[0]);
      
      requiredColumns.forEach(col => {
        const exists = existingColumns.includes(col);
        console.log(`${exists ? '✓' : '✗'} ${col}`);
      });
      
      const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
      if (missingColumns.length > 0) {
        console.log('\n❌ Missing columns:', missingColumns.join(', '));
      } else {
        console.log('\n✓ All required columns present');
      }
    }

    console.log('\n=== CHECK COMPLETE ===\n');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
  }
}

checkDatabase();
