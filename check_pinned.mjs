import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data } = await supabase
  .from('products')
  .select('name, batch, is_pinned')
  .eq('is_pinned', true)
  .order('pinned_order');

console.log(`Pinned products: ${data.length}\n`);

const byBatch = {};
data.forEach(p => {
  byBatch[p.batch] = (byBatch[p.batch] || 0) + 1;
});

console.log('By batch:');
Object.entries(byBatch).forEach(([batch, count]) => {
  console.log(`  ${batch}: ${count}`);
});
