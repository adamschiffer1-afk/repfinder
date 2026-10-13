import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkProducts() {
  try {
    const productNames = [
      'Timberland',
      'NBA Jersey',
      'Jordan shorts',
      'Balenciaga T-shirt',
      'gallery shorts'
    ];

    console.log('🔍 Checking specific products from screenshots...\n');

    for (const name of productNames) {
      const { data: products, error } = await supabase
        .from('products')
        .select('id, name, price, is_pinned, pinned_order')
        .ilike('name', `%${name}%`)
        .limit(5);

      if (error) throw error;

      if (products.length > 0) {
        console.log(`📦 Found ${products.length} product(s) matching "${name}":`);
        products.forEach(p => {
          console.log(`   - ${p.name} | $${p.price} | Pinned: ${p.is_pinned} | Order: ${p.pinned_order}`);
        });
        console.log('');
      } else {
        console.log(`❌ No products found matching "${name}"\n`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkProducts();
