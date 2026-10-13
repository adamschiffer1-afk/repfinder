import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Load environment variables
config({ path: '.env.local' });

// Fix SSL certificate issue
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function generateDiscordKey(name, itemId) {
  // Extract brand and product type from name with more detail
  const lowerName = name.toLowerCase();
  
  // Remove common filler words
  const removeWords = ['the', '2024', '2025'];
  let words = lowerName.split(/\s+/).filter(word => !removeWords.includes(word));
  
  // Take first 3-4 meaningful words and add last 4 digits of itemId for uniqueness
  const maxWords = 4;
  const relevantWords = words.slice(0, maxWords);
  const shortId = itemId.slice(-4);
  
  const key = relevantWords.join(' ') + ` ${shortId}`;
  
  return key.replace(/[^a-z0-9\s]/g, '').trim();
}

function extractItemId(link) {
  // Extract itemID from Weidian link or Kakobuy encoded URL
  
  // First, try direct match
  let match = link.match(/itemID[=:](\d+)/);
  if (match) return match[1];
  
  // If it's a Kakobuy link with encoded URL, decode it first
  if (link.includes('kakobuy.com') && link.includes('url=')) {
    try {
      const urlMatch = link.match(/url=([^&]+)/);
      if (urlMatch) {
        const decodedUrl = decodeURIComponent(urlMatch[1]);
        match = decodedUrl.match(/itemID[=:](\d+)/);
        if (match) return match[1];
      }
    } catch (e) {
      // Decode failed
    }
  }
  
  return null;
}

function generateKakobuyLink(itemId, affCode = 'xfrostyy') {
  const weidianUrl = `https://weidian.com/item.html?itemID=${itemId}`;
  const encodedUrl = encodeURIComponent(weidianUrl);
  return `https://www.kakobuy.com/item/details?url=${encodedUrl}&affcode=${affCode}`;
}

async function main() {
  console.log('🧥 Fetching jackets from database...\n');
  
  const { data: jackets, error } = await supabase
    .from('products')
    .select('*')
    .eq('category', 'jackets')
    .order('name', { ascending: true });
  
  if (error) {
    console.error('❌ Error fetching jackets:', error);
    return;
  }
  
  if (!jackets || jackets.length === 0) {
    console.log('❌ No jackets found in database!');
    return;
  }
  
  console.log(`✅ Found ${jackets.length} jackets\n`);
  
  // Group by brand
  const brandMap = {};
  const mapping = [];
  
  for (const jacket of jackets) {
    const itemId = extractItemId(jacket.link);
    
    if (!itemId) {
      console.log(`⚠️  Skipping ${jacket.name} - no itemID found`);
      continue;
    }
    
    const discordKey = generateDiscordKey(jacket.name, itemId);
    const kakobuyLink = generateKakobuyLink(itemId);
    
    // Extract brand from name (first word usually)
    const brand = jacket.name.split(' ')[0].toUpperCase();
    
    if (!brandMap[brand]) {
      brandMap[brand] = [];
    }
    
    brandMap[brand].push({
      key: discordKey,
      link: kakobuyLink,
      originalName: jacket.name
    });
    
    mapping.push({
      key: discordKey,
      link: kakobuyLink,
      brand: brand,
      originalName: jacket.name
    });
  }
  
  // Generate output
  let output = '// ============================================\n';
  output += '// JACKETS DISCORD BOT MAPPING\n';
  output += `// Generated: ${new Date().toISOString()}\n`;
  output += `// Total jackets: ${mapping.length}\n`;
  output += '// ============================================\n\n';
  
  // Sort brands alphabetically
  const sortedBrands = Object.keys(brandMap).sort();
  
  for (const brand of sortedBrands) {
    output += `// ${brand}\n`;
    
    const items = brandMap[brand];
    for (const item of items) {
      output += `"${item.key}": "${item.link}",  // ${item.originalName}\n`;
    }
    
    output += '\n';
  }
  
  // Save to file
  const filename = 'jackets_discord_mapping.txt';
  fs.writeFileSync(filename, output);
  
  console.log('═══════════════════════════════════════');
  console.log('📊 SUMMARY');
  console.log('═══════════════════════════════════════');
  console.log(`✓ Total jackets processed: ${mapping.length}`);
  console.log(`✓ Brands found: ${sortedBrands.length}`);
  console.log(`✓ Output saved to: ${filename}`);
  console.log('\n📋 Brands:');
  sortedBrands.forEach(brand => {
    console.log(`   ${brand}: ${brandMap[brand].length} jackets`);
  });
  console.log('═══════════════════════════════════════\n');
  
  // Preview first few entries
  console.log('📝 Preview (first 10 entries):\n');
  mapping.slice(0, 10).forEach(item => {
    console.log(`"${item.key}": "${item.link}",`);
  });
  
  if (mapping.length > 10) {
    console.log(`\n... and ${mapping.length - 10} more\n`);
  }
  
  console.log(`\n🎉 Done! Check ${filename} for the complete mapping.`);
}

main().catch(console.error);
