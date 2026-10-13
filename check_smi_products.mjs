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
  .or('batch.eq.smi-electronics,batch.eq.smi-shoes');

console.log(`SMI products still in DB: ${data.length}`);
data.slice(0, 15).forEach(p => {
  console.log(`  - ${p.name} (${p.batch}, pinned: ${p.is_pinned})`);
});
