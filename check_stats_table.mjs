import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkStatsTable() {
  try {
    console.log('🔍 Checking if stats table exists...\n');

    const { data, error, count } = await supabase
      .from('stats')
      .select('*', { count: 'exact', head: false })
      .limit(5);

    if (error) {
      console.log('❌ Stats table does NOT exist');
      console.log('Error:', error.message);
      console.log('\n📝 Need to create stats table in Supabase');
      return;
    }

    console.log(`✅ Stats table exists with ${count} total records`);
    console.log('\nFirst 5 records:');
    console.log(JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkStatsTable();
