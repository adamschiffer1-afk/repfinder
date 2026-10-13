import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as cheerio from 'cheerio';

// Load environment variables
config({ path: '.env.local' });

// Fix SSL certificate issue
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

console.log('Checking environment variables:');
console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Service Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const AFFILIATE_CODE = 'xfrostyy';

// Function to generate URL-friendly slug
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Function to detect shoe category
function detectShoeCategory(name) {
  const lowerName = name.toLowerCase();
  
  // Slides / Slippers
  if (lowerName.includes('slide') || lowerName.includes('slipper') || lowerName.includes('foam runner')) {
    return 'slides';
  }
  
  // Otherwise it's shoes
  return 'shoes';
}

// Products from SMI spreadsheet
const shoesData = [
  // JORDAN
  { itemId: '7505718665', name: 'AJ1 High-1' },
  { itemId: '7510823296', name: 'OG Batch Air Jordan 1 High Retro' },
  { itemId: '7511870407', name: 'Good Batch Air Jordan 1 High Retro' },
  { itemId: '7508963543', name: 'HK Batch Jordan 1 retro MID' },
  { itemId: '7514146930', name: 'PK Batch 2.0 Jordan 1 retro low' },
  { itemId: '7512510866', name: 'Air Jordan 3' },
  { itemId: '7509505704', name: 'Air Jordan 312' },
  { itemId: '7509989101', name: 'GX Batch Air Jordan 4 Retro' },
  { itemId: '7511815417', name: 'Air Jordan 5' },
  { itemId: '7510077697', name: 'Air Jordan 6 Retro-TOP' },
  { itemId: '7513768390', name: 'AJ11-HIGH' },
  { itemId: '7507595931', name: 'Air Jordan 12' },
  { itemId: '7508947061', name: 'Air Jordan 13' },
  
  // LV SHOES
  { itemId: '7510040792', name: 'LV Shoes' },
  { itemId: '7508111279', name: 'LV SKATE- TOP' },
  { itemId: '7504435211', name: 'LV sneakers' },
  { itemId: '7513780170', name: 'LV sneakers' },
  { itemId: '7512408158', name: 'LV sneakers' },
  { itemId: '7508137069', name: 'LV sneakers' },
  { itemId: '7514170650', name: 'LV TRAINER MAXI' },
  { itemId: '7513768392', name: 'LV casual shoes' },
  { itemId: '7513722986', name: 'LV sneakers' },
  { itemId: '7508205825', name: 'LV shoes' },
  { itemId: '7508123931', name: 'LV shoes' },
  { itemId: '7507612576', name: 'LV shoes' },
  { itemId: '7509678023', name: 'LV Shoes' },
  { itemId: '7511607612', name: 'LV Abbesses' },
  { itemId: '7513736652', name: 'LV shoes' },
  { itemId: '7510687825', name: 'LOUIS VUITTON SLIDES' },
  { itemId: '7508115343', name: 'LV slippers' },
  { itemId: '7508937295', name: 'LV slippers' },
  
  // NIKE AF1
  { itemId: '7509979490', name: 'NIKE AF1' },
  { itemId: '7510034021', name: 'NIKE AF1' },
  { itemId: '7506399788', name: 'AF1 AY BATCH' },
  { itemId: '7509139104', name: 'AF1 AY BATCH' },
  { itemId: '7510797594', name: 'AF1 x Louis Vuitton' },
  { itemId: '7508770412', name: 'NIKE WMNS Air Force 1 Shadow' },
  
  // NIKE DUNK
  { itemId: '7505778107', name: 'NIKE DUNK LOW' },
  { itemId: '7510072098', name: 'DUNK M BATCH' },
  { itemId: '7508174519', name: 'DUNK GX BATCH' },
  
  // NIKE OTHER
  { itemId: '7506413157', name: 'Nocta HotStep 2' },
  { itemId: '7509997280', name: 'Nike shoes' },
  { itemId: '7511158939', name: 'Nike ACG Air Zoom Gaiadome Gore-Tex' },
  { itemId: '7514208160', name: 'Nike Air Max Plus' },
  { itemId: '7511941888', name: 'NIKE TN' },
  { itemId: '7511892544', name: 'NIKE AIR' },
  { itemId: '7513803902', name: 'Nike Air Max 90' },
  { itemId: '7513956598', name: 'Nike Air Max 95' },
  { itemId: '7511821407', name: 'NIKE AIR MAX 97' },
  { itemId: '7511858609', name: 'NIKE AIR MAX' },
  { itemId: '7506499643', name: 'Nike Air Max 1' },
  { itemId: '7506904253', name: 'Nike Air Max Portal' },
  { itemId: '7511851042', name: 'NIKE SACAI' },
  { itemId: '7510760050', name: 'Nike Air Humara QS "Faded Spruce"' },
  { itemId: '7509975475', name: 'Nike SB Force 58 shoes' },
  { itemId: '7508717088', name: 'NIKE SHOX TL' },
  { itemId: '7506886353', name: 'Nike Initiator Running' },
  { itemId: '7511811541', name: 'NIKE COURT BOROUGH shoes' },
  { itemId: '7511587742', name: 'NIKE AIR ZOOM GT CUT' },
  { itemId: '7507667954', name: 'NIKE X KOBE BRYANT' },
  { itemId: '7510500277', name: 'NIKE FOAMPOSITE ONE' },
  { itemId: '7509973596', name: 'Nike slippers' },
  { itemId: '7514176492', name: 'NIKE slippers' },
  
  // DIOR
  { itemId: '7505856354', name: 'DIOR B30-TOP' },
  { itemId: '7510919804', name: 'Stone Island×B30' },
  { itemId: '7511860567', name: 'DIOR B30 good' },
  { itemId: '7508277502', name: 'DIOR B22 TOP' },
  { itemId: '7506403399', name: 'DIOR B22 GOOD' },
  { itemId: '7513699544', name: 'DIOR B28' },
  { itemId: '7505789915', name: 'DIOR B27' },
  { itemId: '7508188119', name: 'DIOR B25' },
  { itemId: '7507592870', name: 'DIOR B23' },
  { itemId: '7651164118', name: 'DIOR B33' },
  { itemId: '7512587732', name: 'Dior shoes' },
  { itemId: '7512510868', name: 'Dior shoes' },
  { itemId: '7505708853', name: 'Dior low price shoes' },
  { itemId: '7510056542', name: 'Dior Shoes' },
  
  // ADIDAS
  { itemId: '7507660186', name: 'Adidas gazelle X GUCCI GOOD' },
  { itemId: '7506152949', name: 'Adidas Gazelle' },
  { itemId: '7512296405', name: 'Adidas Spezial' },
  { itemId: '7511375544', name: 'Adidas Samba' },
  { itemId: '7511929938', name: 'Adidas samba GOOD' },
  { itemId: '7509028109', name: 'Adidas Campus' },
  { itemId: '7508291354', name: 'ADIDAS x GUCCI' },
  { itemId: '7507610688', name: 'Adidas Yeezy 350' },
  { itemId: '7513736650', name: 'YEEZY 500' },
  { itemId: '7507529041', name: 'YEEZY 700' },
  { itemId: '7511886233', name: 'ADIDAS yeezy 700' },
  { itemId: '7510654157', name: 'Adidas originals superstar' },
  { itemId: '7505687303', name: 'ADIDAS' },
  { itemId: '7509707683', name: 'ADIDAS FORUM HK BATCH' },
  { itemId: '7507671880', name: 'ADIDAD ULTRA BOOST' },
  { itemId: '7511896121', name: 'Adidas XLG Runner Deluxe' },
  { itemId: '7508927411', name: 'Adidas Forum 84 shoes' },
  { itemId: '7507266723', name: 'Adidas Futro Mixr NEO' },
  { itemId: '7506379549', name: 'Adidas XLG RUNNER DELUXE' },
  { itemId: '7505772193', name: 'Adidas Slide' },
  { itemId: '7510039941', name: 'YEEZY FOAM' },
  
  // GUCCI
  { itemId: '7509625251', name: 'GUCCI mac80' },
];

async function scrapeWeidianProduct(itemId, fallbackName) {
  const url = `https://weidian.com/item.html?itemID=${itemId}`;
  
  try {
    console.log(`Scraping: ${fallbackName} (${itemId})`);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    
    let name = $('.goods_name').text().trim() || 
                $('h1.title').text().trim() || 
                $('.itemInfoTitle').text().trim() ||
                fallbackName;
    
    let priceText = $('.goods_price').text().trim() || 
                    $('.price').text().trim() ||
                    '0';
    let price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;
    
    let image = $('.goods_pic img').attr('src') || 
                $('.mainPic img').attr('src') ||
                $('img.itemImg').attr('src') ||
                '';
    
    if (image && !image.startsWith('http')) {
      image = 'https:' + image;
    }
    
    const category = detectShoeCategory(name);
    const affiliateLink = `https://weidian.com/item.html?itemID=${itemId}&wfr=c&source=goods_home&ifr=itemdetail&sfr=${AFFILIATE_CODE}`;
    
    // Create unique slug by appending itemId
    const baseSlug = generateSlug(name);
    const uniqueSlug = `${baseSlug}-${itemId}`;
    
    console.log(`✓ Scraped: ${name} [${category}]`);
    return {
      name,
      slug: uniqueSlug,
      price,
      image,
      category,
      link: affiliateLink,
      batch: 'smi-shoes'
    };
  } catch (error) {
    console.error(`✗ Failed to scrape ${itemId}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('👟 Starting bulk add of SMI Shoes...\n');
  console.log(`📦 Total shoes to add: ${shoesData.length}\n`);
  
  // Step 1: Get current pinned products
  console.log('📊 Fetching current pinned products...');
  const { data: currentPinned, error: fetchError } = await supabase
    .from('products')
    .select('*')
    .eq('is_pinned', true)
    .order('pinned_order', { ascending: true });
  
  if (fetchError) {
    console.error('❌ Error fetching current products:', fetchError);
    return;
  }
  
  const currentCount = currentPinned?.length || 0;
  console.log(`   Found ${currentCount} currently pinned products\n`);
  
  // Step 2: Update existing pinned products - shift them down by the number of new products
  const shiftAmount = shoesData.length;
  
  if (currentCount > 0) {
    console.log(`📝 Shifting existing pinned products down by ${shiftAmount} positions...\n`);
    
    for (const product of currentPinned) {
      const { error: updateError } = await supabase
        .from('products')
        .update({ pinned_order: product.pinned_order + shiftAmount })
        .eq('id', product.id);
      
      if (updateError) {
        console.error(`   ✗ Failed to update product ${product.id}`);
      }
    }
    
    console.log(`   ✓ Shifted ${currentCount} products\n`);
  }
  
  // Step 3: Scrape and add new products
  console.log('🔍 Scraping new shoes from Weidian...\n');
  
  const products = [];
  let successCount = 0;
  let failCount = 0;
  
  const categoryStats = {};
  
  for (let i = 0; i < shoesData.length; i++) {
    const { itemId, name } = shoesData[i];
    const productData = await scrapeWeidianProduct(itemId, name);
    
    if (productData) {
      products.push({
        ...productData,
        is_pinned: false,
        pinned_order: null,
        clicks: 0,
        qc_images: []
      });
      successCount++;
      
      // Track category stats
      categoryStats[productData.category] = (categoryStats[productData.category] || 0) + 1;
    } else {
      failCount++;
    }
    
    // Delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`\n📦 Scraped ${successCount}/${shoesData.length} shoes successfully\n`);
  
  if (products.length === 0) {
    console.log('❌ No products to add!');
    return;
  }
  
  // Step 4: Insert new products
  console.log('💾 Adding shoes to database...');
  
  const { data: inserted, error: insertError } = await supabase
    .from('products')
    .insert(products)
    .select();
  
  if (insertError) {
    console.error('❌ Error inserting products:', insertError);
    return;
  }
  
  console.log(`✅ Successfully added ${inserted.length} shoes!\n`);
  
  // Step 5: Summary
  console.log('═══════════════════════════════════════');
  console.log('📊 SUMMARY');
  console.log('═══════════════════════════════════════');
  console.log(`✓ New shoes added: ${inserted.length}`);
  console.log(`✓ Existing products shifted: ${currentCount}`);
  console.log(`✓ Total pinned products: ${currentCount + inserted.length}`);
  console.log(`✗ Failed scrapes: ${failCount}`);
  console.log('\n📋 Category breakdown:');
  Object.entries(categoryStats).forEach(([cat, count]) => {
    console.log(`   ${cat}: ${count} products`);
  });
  console.log('═══════════════════════════════════════\n');
  
  console.log('🎉 Done! New SMI shoes are now at the top of your pinned list.');
}

main().catch(console.error);
