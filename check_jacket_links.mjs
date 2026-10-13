import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { data: jackets, error } = await supabase
    .from('products')
    .select('name, link, category')
    .eq('category', 'jackets')
    .limit(5);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Sample jacket links:\n');
  jackets.forEach((jacket, i) => {
    console.log(`${i+1}. ${jacket.name}`);
    console.log(`   Link: ${jacket.link}\n`);
  });
}

main();
