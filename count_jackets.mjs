import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { count, error } = await supabase
  .from('products')
  .select('*', { count: 'exact', head: true })
  .eq('category', 'jackets');

if (error) {
  console.error('Error:', error);
} else {
  console.log('✅ Total jackets in database:', count);
}
