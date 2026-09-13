-- Add is_hidden column to products table
-- Run this in Supabase SQL Editor

ALTER TABLE products ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

-- Update existing products to ensure they are not hidden
UPDATE products SET is_hidden = FALSE WHERE is_hidden IS NULL;
