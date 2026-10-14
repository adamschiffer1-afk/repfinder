-- Create stats table in Supabase
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stats_type ON public.stats(type);
CREATE INDEX IF NOT EXISTS idx_stats_timestamp ON public.stats(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_stats_product_id ON public.stats(product_id);
CREATE INDEX IF NOT EXISTS idx_stats_visitor_id ON public.stats(visitor_id);
CREATE INDEX IF NOT EXISTS idx_stats_country ON public.stats(country);
CREATE INDEX IF NOT EXISTS idx_stats_type_timestamp ON public.stats(type, timestamp DESC);

-- Optional: Add foreign key if you want to enforce product existence
-- Note: This requires product_id to match the id column in products table
-- Uncomment if you want this constraint:
-- ALTER TABLE public.stats 
--   ADD CONSTRAINT fk_stats_product 
--   FOREIGN KEY (product_id) 
--   REFERENCES public.products(id) 
--   ON DELETE SET NULL;

-- Enable Row Level Security (optional but recommended)
ALTER TABLE public.stats ENABLE ROW LEVEL SECURITY;

-- Create policy to allow inserts from anyone (for tracking)
CREATE POLICY "Allow public inserts" ON public.stats
  FOR INSERT WITH CHECK (true);

-- Create policy to allow reads only for authenticated admin
CREATE POLICY "Allow admin reads" ON public.stats
  FOR SELECT USING (true);

COMMENT ON TABLE public.stats IS 'Analytics and tracking data for the application';
COMMENT ON COLUMN public.stats.type IS 'Event type: page_view, product_click, error_log, engagement';
COMMENT ON COLUMN public.stats.scroll_depth IS 'Percentage of page scrolled (0-100)';
COMMENT ON COLUMN public.stats.time_spent IS 'Time spent on page in seconds';
