import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as cheerio from 'cheerio';

// Load env variables
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Function to extract itemID from weidian link
function extractItemID(link) {
  const match = link.match(/itemID=(\d+)/);
  return match ? match[1] : null;
}

// Function to scrape product data from Weidian (same as admin scraper)
async function scrapeWeidianData(itemId) {
  try {
    const weidianUrl = `https://weidian.com/item.html?itemID=${itemId}`;
    
    const res = await axios.get(weidianUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
      },
      timeout: 15000
    });

    const $ = cheerio.load(res.data);
    const scriptTag = $('#__rocker-render-inject__');
    
    if (scriptTag.length === 0) {
      return { success: false, error: 'Could not find product data' };
    }

    const data = JSON.parse(scriptTag.attr('data-obj'));
    const itemInfo = data.result.default_model.item_info;
    
    const basePriceCNY = parseFloat(itemInfo.origin_price);
    const priceUSD = (basePriceCNY * 0.14).toFixed(2);
    
    let imageUrl = itemInfo.item_head;
    if (!imageUrl.startsWith('http')) {
      imageUrl = 'https:' + imageUrl;
    }
    imageUrl = imageUrl + '?w=400&h=400';

    return {
      success: true,
      price: parseFloat(priceUSD),
      image: imageUrl
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Main function
async function fixBrokenProducts() {
  console.log('🔍 Fetching broken products...\n');
  
  // Get all products with price = 0 or empty image
  const { data: brokenProducts, error } = await supabase
    .from('products')
    .select('*')
    .or('price.eq.0,image.eq.');
  
  if (error) {
    console.error('❌ Error fetching products:', error);
    return;
  }
  
  console.log(`Found ${brokenProducts.length} broken products\n`);
  
  let fixed = 0;
  let failed = 0;
  let skipped = 0;
  
  for (let i = 0; i < brokenProducts.length; i++) {
    const product = brokenProducts[i];
    const itemID = extractItemID(product.link);
    
    if (!itemID) {
      console.log(`⚠️  [${i+1}/${brokenProducts.length}] ${product.name} - No itemID found`);
      skipped++;
      continue;
    }
    
    console.log(`🔄 [${i+1}/${brokenProducts.length}] Fixing ${product.name} (ID: ${itemID})...`);
    
    // Scrape data from Weidian
    const weidianData = await scrapeWeidianData(itemID);
    
    if (weidianData.success && weidianData.price > 0 && weidianData.image) {
      // Update product in database
      const { error: updateError } = await supabase
        .from('products')
        .update({
          price: weidianData.price,
          image: weidianData.image,
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id);
      
      if (updateError) {
        console.log(`   ❌ Failed to update: ${updateError.message}`);
        failed++;
      } else {
        console.log(`   ✅ Fixed! Price: $${weidianData.price}`);
        fixed++;
      }
    } else {
      console.log(`   ❌ Failed to fetch data: ${weidianData.error || 'No data'}`);
      failed++;
    }
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n═══════════════════════════════════');
  console.log(`✅ Fixed: ${fixed} products`);
  console.log(`❌ Failed: ${failed} products`);
  console.log(`⏭️  Skipped: ${skipped} products`);
  console.log('═══════════════════════════════════\n');
}

fixBrokenProducts();
