import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read Supabase credentials from env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSQL() {
  try {
    // Read SQL file
    const sqlPath = path.join(__dirname, 'create_stats_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Creating stats table in Supabase...');
    
    // Split by semicolon and run each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));

    for (const statement of statements) {
      if (!statement) continue;
      
      console.log(`Executing: ${statement.substring(0, 60)}...`);
      
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
      
      if (error) {
        console.error('Error executing statement:', error);
        // Continue with next statement even if one fails
      } else {
        console.log('✓ Success');
      }
    }

    console.log('\n✓ Stats table creation complete!');
    console.log('\nNOTE: If you see RPC errors above, please run the SQL manually in Supabase SQL Editor.');
    console.log('Copy the content of scripts/create_stats_table.sql and paste it in:');
    console.log('https://supabase.com/dashboard/project/qgzmpjbdwwlmhtsrnbaj/sql/new');
    
  } catch (error) {
    console.error('Error:', error);
    console.log('\n⚠️ Could not run SQL automatically.');
    console.log('Please run scripts/create_stats_table.sql manually in Supabase SQL Editor:');
    console.log('https://supabase.com/dashboard/project/qgzmpjbdwwlmhtsrnbaj/sql/new');
    process.exit(1);
  }
}

runSQL();
