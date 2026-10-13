import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function unpinAllProducts() {
  try {
    console.log('📌 Fetching pinned products...\n');

    // Get all pinned products first
    const { data: pinnedProducts, error: fetchError } = await supabase
      .from('products')
      .select('id, name')
      .eq('is_pinned', true);

    if (fetchError) throw fetchError;

    console.log(`Found ${pinnedProducts.length} pinned products to unpin\n`);

    if (pinnedProducts.length === 0) {
      console.log('✅ No pinned products found. Nothing to do.');
      return;
    }

    // List them
    pinnedProducts.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name}`);
    });

    console.log('\n🔄 Unpinning all products...\n');

    // Unpin all products
    const { error: updateError } = await supabase
      .from('products')
      .update({ 
        is_pinned: false, 
        pinned_order: null 
      })
      .eq('is_pinned', true);

    if (updateError) throw updateError;

    console.log(`✅ Successfully unpinned ${pinnedProducts.length} products!`);
    console.log('\nTeraz możesz dodać swoje produkty przez admin panel w sekcji Settings.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

unpinAllProducts();
