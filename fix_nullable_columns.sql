-- Fix NOT NULL constraints that are causing insert failures
-- Run this in Supabase SQL Editor

-- Make columns nullable so inserts don't fail
ALTER TABLE products 
ALTER COLUMN name DROP NOT NULL,
ALTER COLUMN price DROP NOT NULL,
ALTER COLUMN image DROP NOT NULL,
ALTER COLUMN category DROP NOT NULL,
ALTER COLUMN batch DROP NOT NULL,
ALTER COLUMN link DROP NOT NULL;

-- Set better defaults for important columns
ALTER TABLE products 
ALTER COLUMN name SET DEFAULT 'Unnamed Product',
ALTER COLUMN price SET DEFAULT 0,
ALTER COLUMN category SET DEFAULT 'other',
ALTER COLUMN batch SET DEFAULT 'best',
ALTER COLUMN clicks SET DEFAULT 0;

-- Verify the changes
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'products'
AND column_name IN ('name', 'price', 'image', 'category', 'batch', 'link')
ORDER BY ordinal_position;
