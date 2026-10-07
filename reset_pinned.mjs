import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔄 Resetting all pinned products...\n');

// Reset all products to unpinned
const { data, error } = await supabase
  .from('products')
  .update({ 
    is_pinned: false, 
    pinned_order: null 
  })
  .eq('is_pinned', true)
  .select();

if (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}

console.log(`✅ Reset ${data?.length || 0} products to unpinned\n`);

// Check current state
const { count } = await supabase
  .from('products')
  .select('*', { count: 'exact', head: true })
  .eq('is_pinned', true);

console.log(`📊 Currently pinned products: ${count}`);
