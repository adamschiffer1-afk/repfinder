-- Test query to see if products are visible
SELECT id, name, category, is_hidden, is_pinned FROM products;

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'products';
