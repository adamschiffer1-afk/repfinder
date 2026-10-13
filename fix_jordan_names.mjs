import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Function to simplify Jordan name
function simplifyJordanName(name) {
  // Check if it's "AJ bag" or similar non-shoe product
  if (name.toLowerCase().includes('bag') || name.toLowerCase().includes('sock')) {
    return name; // Keep bags and socks as is
  }
  
  // Extract Jordan number from "Jordan X" or "AJ X" or "AJXX"
  const jordanMatch = name.match(/(?:jordan|aj)\s*(\d+)/i);
  
  if (!jordanMatch) {
    return name; // Not a numbered Jordan, keep original
  }
  
  const number = jordanMatch[1];
  return `Jordan ${number}`;
}

async function fixJordanNames() {
  console.log('🔍 Fetching Jordan products...\n');
  
  // Get all products with "Jordan" or "AJ" in name
  const { data: jordans, error } = await supabase
    .from('products')
    .select('*')
    .or('name.ilike.%jordan%,name.ilike.%aj%');
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log(`Found ${jordans.length} Jordan products\n`);
  
  let updated = 0;
  let skipped = 0;
  
  for (const product of jordans) {
    const newName = simplifyJordanName(product.name);
    
    if (newName !== product.name) {
      console.log(`📝 ${product.name} → ${newName}`);
      
      // Generate new slug
      const newSlug = newName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + `-${product.link.match(/itemID=(\d+)/)?.[1] || product.id.slice(0, 8)}`;
      
      // Update in database
      const { error: updateError } = await supabase
        .from('products')
        .update({
          name: newName,
          slug: newSlug,
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id);
      
      if (updateError) {
        console.log(`   ❌ Failed: ${updateError.message}`);
      } else {
        updated++;
      }
    } else {
      console.log(`⏭️  Skipped: ${product.name} (no change)`);
      skipped++;
    }
  }
  
  console.log('\n═══════════════════════════════════');
  console.log(`✅ Updated: ${updated} products`);
  console.log(`⏭️  Skipped: ${skipped} products`);
  console.log('═══════════════════════════════════\n');
}

fixJordanNames();
