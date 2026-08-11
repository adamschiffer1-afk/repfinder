-- Fix products table - add any missing columns
-- Run this in Supabase SQL Editor

-- Add slug column if missing (for SEO-friendly URLs)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Add index on slug for faster lookups
CREATE INDEX IF NOT EXISTS products_slug_idx ON products(slug);

-- Make sure all text columns exist
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'Unnamed Product',
ADD COLUMN IF NOT EXISTS image TEXT,
ADD COLUMN IF NOT EXISTS link TEXT,
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'other',
ADD COLUMN IF NOT EXISTS batch TEXT DEFAULT 'best';

-- Make sure numeric columns exist
ALTER TABLE products
ADD COLUMN IF NOT EXISTS price DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS clicks INTEGER DEFAULT 0;

-- Make sure boolean/order columns exist  
ALTER TABLE products
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pinned_order INTEGER;

-- Make sure JSON column exists
ALTER TABLE products
ADD COLUMN IF NOT EXISTS qc_images JSONB DEFAULT '[]'::jsonb;

-- Make sure timestamp columns exist
ALTER TABLE products
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Check what we have now
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;
