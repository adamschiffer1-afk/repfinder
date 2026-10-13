-- Create stats table for analytics
CREATE TABLE IF NOT EXISTS public.stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type VARCHAR(50) NOT NULL CHECK (type IN ('page_view', 'product_click', 'error_log', 'engagement')),
    product_id TEXT REFERENCES public.products(id) ON DELETE SET NULL,
    agent VARCHAR(100),
    visitor_id VARCHAR(100),
    user_agent TEXT,
    path VARCHAR(500),
    country VARCHAR(10) DEFAULT 'Unknown',
    referrer TEXT,
    utm_source VARCHAR(100),
    utm_campaign VARCHAR(100),
    scroll_depth INTEGER CHECK (scroll_depth >= 0 AND scroll_depth <= 100),
    time_spent INTEGER,
    error_message TEXT,
    error_stack TEXT,
    breadcrumbs TEXT[],
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_stats_type ON public.stats(type);
CREATE INDEX IF NOT EXISTS idx_stats_timestamp ON public.stats(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_stats_product_id ON public.stats(product_id);
CREATE INDEX IF NOT EXISTS idx_stats_visitor_id ON public.stats(visitor_id);
CREATE INDEX IF NOT EXISTS idx_stats_country ON public.stats(country);
CREATE INDEX IF NOT EXISTS idx_stats_type_timestamp ON public.stats(type, timestamp DESC);

-- Add comment to table
COMMENT ON TABLE public.stats IS 'Analytics and statistics tracking for page views, product clicks, errors, and engagement';
