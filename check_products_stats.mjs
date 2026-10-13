import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data } = await supabase.from('products').select('batch');

const batches = {};
data.forEach(p => {
  batches[p.batch] = (batches[p.batch] || 0) + 1;
});

console.log('Products by batch:');
Object.entries(batches).sort((a,b) => b[1] - a[1]).forEach(([batch, count]) => {
  console.log(`  ${batch}: ${count}`);
});

console.log(`\nTotal products: ${data.length}`);
