import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

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

// Function to fetch product data from Weidian
async function fetchWeidianData(itemID) {
  try {
    const url = `https://thor.weidian.com/detail/getItemSkuInfo/1.0?param=%7B%22itemId%22%3A%22${itemID}%22%7D`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://weidian.com/',
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status?.code === 0 && data.result?.itemInfo) {
      const itemInfo = data.result.itemInfo;
      
      // Get price (in CNY, convert to USD)
      let priceYuan = 0;
      if (itemInfo.basicInfo?.price) {
        priceYuan = parseFloat(itemInfo.basicInfo.price);
      } else if (itemInfo.basicInfo?.minPrice) {
        priceYuan = parseFloat(itemInfo.basicInfo.minPrice);
      }
      
      const priceUSD = (priceYuan / 7.3).toFixed(2); // CNY to USD conversion
      
      // Get first image
      let imageUrl = '';
      if (itemInfo.imgs && itemInfo.imgs.length > 0) {
        imageUrl = itemInfo.imgs[0].url;
        // Ensure HTTPS
        if (imageUrl.startsWith('//')) {
          imageUrl = 'https:' + imageUrl;
        } else if (imageUrl.startsWith('http://')) {
          imageUrl = imageUrl.replace('http://', 'https://');
        }
      }
      
      return {
        price: parseFloat(priceUSD),
        image: imageUrl,
        success: true
      };
    }
    
    return { success: false, error: 'Invalid API response' };
  } catch (error) {
    console.error(`Error fetching itemID ${itemID}:`, error.message);
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
  
  for (let i = 0; i < brokenProducts.length; i++) {
    const product = brokenProducts[i];
    const itemID = extractItemID(product.link);
    
    if (!itemID) {
      console.log(`⚠️  [${i+1}/${brokenProducts.length}] ${product.name} - No itemID found`);
      failed++;
      continue;
    }
    
    console.log(`🔄 [${i+1}/${brokenProducts.length}] Fixing ${product.name} (ID: ${itemID})...`);
    
    // Fetch data from Weidian
    const weidianData = await fetchWeidianData(itemID);
    
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
        console.log(`   ✅ Fixed! Price: $${weidianData.price}, Image: ${weidianData.image.substring(0, 50)}...`);
        fixed++;
      }
    } else {
      console.log(`   ❌ Failed to fetch data: ${weidianData.error || 'No data'}`);
      failed++;
    }
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n═══════════════════════════════════');
  console.log(`✅ Fixed: ${fixed} products`);
  console.log(`❌ Failed: ${failed} products`);
  console.log('═══════════════════════════════════\n');
}

fixBrokenProducts();
