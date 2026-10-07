import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync } from 'fs';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Read CSV
const csvContent = readFileSync('jackets_import.csv', 'utf-8');
const lines = csvContent.split('\n').filter(line => line.trim());

const csvProducts = [];
for (let i = 1; i < lines.length; i++) {
  const [name, link, itemId] = lines[i].split(',').map(s => s.trim().replace(/^"|"$/g, ''));
  if (itemId) {
    csvProducts.push({ name, itemId });
  }
}

console.log(`📋 Total products in CSV: ${csvProducts.length}\n`);

// Get all jackets from DB
const { data: dbProducts, error } = await supabase
  .from('products')
  .select('slug')
  .eq('category', 'jackets');

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log(`✅ Total jackets in DB: ${dbProducts.length}\n`);

// Extract itemIDs from DB (slug format: "product-name-ITEMID")
const dbItemIds = new Set();
dbProducts.forEach(p => {
  const parts = p.slug.split('-');
  const lastPart = parts[parts.length - 1];
  if (/^\d+$/.test(lastPart)) {
    dbItemIds.add(lastPart);
  }
});

// Find missing
const missing = csvProducts.filter(p => !dbItemIds.has(p.itemId));

console.log(`❌ Missing products: ${missing.length}\n`);
console.log('='.repeat(60));

if (missing.length > 0) {
  missing.forEach((p, i) => {
    console.log(`${i + 1}. ${p.name} (ID: ${p.itemId})`);
  });
  console.log('='.repeat(60));
}
