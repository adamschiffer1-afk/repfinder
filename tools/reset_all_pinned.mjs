#!/usr/bin/env node
/**
 * Reset ALL pinned products in database
 * Sets is_pinned = false for ALL products
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('\n🔥 RESETTING ALL PINNED PRODUCTS\n');
console.log('='.repeat(60));

// Update ALL products to unpinned
const { data, error, count } = await supabase
  .from('products')
  .update({ 
    is_pinned: false, 
    pinned_order: null 
  })
  .neq('id', '00000000-0000-0000-0000-000000000000') // Match all
  .select();

if (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}

console.log(`✅ Reset ${data?.length || 0} products to unpinned`);

// Verify
const { count: pinnedCount } = await supabase
  .from('products')
  .select('*', { count: 'exact', head: true })
  .eq('is_pinned', true);

console.log(`\n📊 Currently pinned: ${pinnedCount}`);
console.log('='.repeat(60) + '\n');

if (pinnedCount === 0) {
  console.log('✅ SUCCESS - All products are now unpinned!\n');
} else {
  console.log(`⚠️  WARNING - Still ${pinnedCount} pinned products remaining\n`);
}
