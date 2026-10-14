import { supabaseAdmin } from '../src/lib/supabase.js';

async function createStatsTable() {
  console.log('Attempting to create stats table via Supabase...\n');
  
  try {
    // Try to query the stats table to see if it exists
    const { data, error } = await supabaseAdmin
      .from('stats')
      .select('id')
      .limit(1);
    
    if (error && error.code === 'PGRST204') {
      console.log('✗ Stats table does not exist.');
      console.log('\n⚠️ Please create the stats table manually in Supabase SQL Editor:');
      console.log('https://supabase.com/dashboard/project/qgzmpjbdwwlmhtsrnbaj/sql/new\n');
      console.log('Copy and paste the following SQL:\n');
      console.log('─'.repeat(60));
      
      const sql = `-- Create stats table in Supabase
CREATE TABLE IF NOT EXISTS public.stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type VARCHAR(50),
  product_id TEXT,
  agent VARCHAR(100),
  visitor_id TEXT,
  user_agent TEXT,
  path TEXT,
  country VARCHAR(10),
  referrer TEXT,
  utm_source VARCHAR(100),
  utm_campaign VARCHAR(100),
  scroll_depth INTEGER CHECK (scroll_depth >= 0 AND scroll_depth <= 100),
  time_spent INTEGER,
  error_message TEXT,
  error_stack TEXT,
  breadcrumbs TEXT[],
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_stats_type ON public.stats(type);
CREATE INDEX IF NOT EXISTS idx_stats_timestamp ON public.stats(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_stats_product_id ON public.stats(product_id);
CREATE INDEX IF NOT EXISTS idx_stats_visitor_id ON public.stats(visitor_id);
CREATE INDEX IF NOT EXISTS idx_stats_country ON public.stats(country);
CREATE INDEX IF NOT EXISTS idx_stats_type_timestamp ON public.stats(type, timestamp DESC);

-- Enable RLS
ALTER TABLE public.stats ENABLE ROW LEVEL SECURITY;

-- Allow inserts from anyone
CREATE POLICY "Allow public inserts" ON public.stats
  FOR INSERT WITH CHECK (true);

-- Allow reads
CREATE POLICY "Allow admin reads" ON public.stats
  FOR SELECT USING (true);`;
      
      console.log(sql);
      console.log('─'.repeat(60));
      
    } else if (error) {
      console.log('✗ Error checking stats table:', error.message);
      console.log('\nFull error:', error);
    } else {
      console.log('✓ Stats table already exists!');
      console.log(`Found ${data?.length || 0} records.`);
    }
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

createStatsTable();
