import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function listPinnedProducts() {
  try {
    console.log('📌 Fetching pinned products...\n');

    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, price, category, batch, is_pinned, pinned_order')
      .eq('is_pinned', true)
      .order('pinned_order', { ascending: true });

    if (error) throw error;

    console.log(`Found ${products.length} pinned products:\n`);
    
    products.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name}`);
      console.log(`   ID: ${product.id}`);
      console.log(`   Price: $${product.price}`);
      console.log(`   Category: ${product.category}`);
      console.log(`   Batch: ${product.batch}`);
      console.log(`   Pinned Order: ${product.pinned_order}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

listPinnedProducts();
