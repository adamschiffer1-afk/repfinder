-- Drop existing table if exists
DROP TABLE IF EXISTS products CASCADE;

-- Create products table with all necessary columns
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  image TEXT NOT NULL,
  category TEXT NOT NULL,
  batch TEXT NOT NULL DEFAULT 'best',
  link TEXT NOT NULL,
  clicks INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT false,
  pinned_order INTEGER DEFAULT NULL,
  is_hidden BOOLEAN DEFAULT false,
  qc_images JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_batch ON products(batch);
CREATE INDEX idx_products_is_pinned ON products(is_pinned);
CREATE INDEX idx_products_pinned_order ON products(pinned_order);
CREATE INDEX idx_products_is_hidden ON products(is_hidden);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_created_at ON products(created_at DESC);
CREATE INDEX idx_products_name ON products USING gin(to_tsvector('simple', name));

-- Enable Row Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access (only non-hidden products)
CREATE POLICY "Allow public read access to visible products"
  ON products
  FOR SELECT
  USING (is_hidden = false OR is_hidden IS NULL);

-- Create policy to allow all access with service_role key (for admin)
CREATE POLICY "Allow all access with service_role"
  ON products
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add some sample products for testing
INSERT INTO products (name, slug, price, image, category, batch, link, is_pinned, pinned_order) VALUES
('Nike Dunk Low Panda', 'nike-dunk-low-panda', 36.40, 'https://i.imgur.com/sample1.jpg', 'shoes', 'best', 'https://weidian.com/item.html?itemID=4466742144', true, 1),
('Air Jordan 1 High', 'air-jordan-1-high', 45.80, 'https://i.imgur.com/sample2.jpg', 'shoes', 'best', 'https://weidian.com/item.html?itemID=4466742145', true, 2),
('Essential Hoodie Grey', 'essential-hoodie-grey', 18.50, 'https://i.imgur.com/sample3.jpg', 'hoodies', 'budget', 'https://weidian.com/item.html?itemID=4466742146', false, NULL),
('Trapstar Tracksuit Black', 'trapstar-tracksuit-black', 28.90, 'https://i.imgur.com/sample4.jpg', 'sets', 'best', 'https://weidian.com/item.html?itemID=4466742147', false, NULL);

COMMENT ON TABLE products IS 'Main products table for RepFinder';
COMMENT ON COLUMN products.is_hidden IS 'Hide product from public view (admin can still see)';
COMMENT ON COLUMN products.is_pinned IS 'Pin product to top of list';
COMMENT ON COLUMN products.pinned_order IS 'Order of pinned products (lower = higher)';
COMMENT ON COLUMN products.qc_images IS 'Array of QC images with colorway info';
