import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 Checking pinned products...\n');

const { data, error } = await supabase
  .from('products')
  .select('id, name, is_pinned, pinned_order')
  .order('pinned_order', { ascending: true, nullsFirst: false })
  .limit(50);

if (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}

const pinned = data.filter(p => p.is_pinned);
const unpinned = data.filter(p => !p.is_pinned);

console.log(`📌 Pinned products: ${pinned.length}`);
pinned.forEach((p, i) => {
  console.log(`  ${i + 1}. ${p.name} (order: ${p.pinned_order})`);
});

console.log(`\n📦 Total products checked: ${data.length}`);
console.log(`✅ Unpinned: ${unpinned.length}`);
