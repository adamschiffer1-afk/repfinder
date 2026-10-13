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

// Electronics from SMI spreadsheet
const electronicsData = [
  { itemId: '7514103454', name: 'AirPods2' },
  { itemId: '7511925970', name: 'AirPodsMax red (Metal)' },
  { itemId: '7505444070', name: 'Beats studioPro' },
  { itemId: '7651144434', name: 'Sony - WH1000XM4' },
  { itemId: '7514619476', name: 'JBL' },
  { itemId: '7508974861', name: 'CASIO' },
  { itemId: '7648203793', name: 'Boss' },
  { itemId: '7651077484', name: 'Rolex' },
  { itemId: '7514621454', name: 'Anima' },
  { itemId: '7648136861', name: 'Summer Rose Sakura Pink Hair Dryer' },
  { itemId: '7505355024', name: 'G.H.D' },
  { itemId: '7509717615', name: 'Batterypack 5000Ahm' },
  { itemId: '7648167941', name: 'Turbo handheld fan' },
  { itemId: '7511289591', name: 'F06' },
  { itemId: '7504226154', name: 'Smart Watch' },
  { itemId: '7651183794', name: 'Fill light' },
  { itemId: '7648138877', name: 'AirPods case' },
  { itemId: '7513285656', name: 'AirPods' },
  { itemId: '7512818365', name: 'Galaxybuds2pro' },
  { itemId: '7505406574', name: 'Mar.shall Motif Anc' },
  { itemId: '7648213655', name: 'Sony - WH1000XM5' },
  { itemId: '7511900340', name: 'JBL Pulse6' },
  { itemId: '7648136861', name: 'Hair Dryer' },
  { itemId: '7509717615', name: 'USB-C to Lightning Cable (1m)' },
  { itemId: '7651065562', name: 'Phone Cases' },
  { itemId: '7651171746', name: 'Phone17 Cases' },
  { itemId: '7503990983', name: 'Samsung s25' },
  { itemId: '7648095409', name: 'AirPods case' },
  { itemId: '7513301602', name: 'AirPods' },
  { itemId: '7511401651', name: 'Beats kim' },
  { itemId: '7505861176', name: 'Bose UltraOpen Earbuds' },
  { itemId: '7510012337', name: 'JBL Pulse6+' },
  { itemId: '7508205827', name: 'AirPods Pencil 2nd' },
  { itemId: '7648136863', name: 'Fill light' },
  { itemId: '7505398640', name: 'GameMachine x60' },
  { itemId: '7511397655', name: 'AirPodsMax Black (plastic)' },
  { itemId: '7648136865', name: 'JBL' },
  { itemId: '7677017690', name: 'Airpods Pro3' },
  { itemId: '7651150290', name: 'JBL Boombox3' },
  { itemId: '7648188065', name: 'Hair Dryer' },
  { itemId: '7507627651', name: 'Apple charging head' },
  { itemId: '7648213657', name: 'Fill light' },
  { itemId: '7648105423', name: 'PS4' },
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
    
    const affiliateLink = `https://weidian.com/item.html?itemID=${itemId}&wfr=c&source=goods_home&ifr=itemdetail&sfr=${AFFILIATE_CODE}`;
    
    // Create unique slug by appending itemId
    const baseSlug = generateSlug(name);
    const uniqueSlug = `${baseSlug}-${itemId}`;
    
    console.log(`✓ Scraped: ${name} [electronics]`);
    return {
      name,
      slug: uniqueSlug,
      price,
      image,
      category: 'electronics',
      link: affiliateLink,
      batch: 'smi-electronics'
    };
  } catch (error) {
    console.error(`✗ Failed to scrape ${itemId}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('📱 Starting bulk add of SMI Electronics...\n');
  console.log(`📦 Total electronics to add: ${electronicsData.length}\n`);
  
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
  
  // Step 2: Update existing pinned products - shift them down
  const shiftAmount = electronicsData.length;
  
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
  console.log('🔍 Scraping new electronics from Weidian...\n');
  
  const products = [];
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < electronicsData.length; i++) {
    const { itemId, name } = electronicsData[i];
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
    } else {
      failCount++;
    }
    
    // Delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`\n📦 Scraped ${successCount}/${electronicsData.length} electronics successfully\n`);
  
  if (products.length === 0) {
    console.log('❌ No products to add!');
    return;
  }
  
  // Step 4: Insert new products
  console.log('💾 Adding electronics to database...');
  
  const { data: inserted, error: insertError } = await supabase
    .from('products')
    .insert(products)
    .select();
  
  if (insertError) {
    console.error('❌ Error inserting products:', insertError);
    return;
  }
  
  console.log(`✅ Successfully added ${inserted.length} electronics!\n`);
  
  // Step 5: Summary
  console.log('═══════════════════════════════════════');
  console.log('📊 SUMMARY');
  console.log('═══════════════════════════════════════');
  console.log(`✓ New electronics added: ${inserted.length}`);
  console.log(`✓ Existing products shifted: ${currentCount}`);
  console.log(`✓ Total pinned products: ${currentCount + inserted.length}`);
  console.log(`✗ Failed scrapes: ${failCount}`);
  console.log('\n📋 Products include:');
  console.log('   - AirPods (various models)');
  console.log('   - JBL speakers (Pulse6, Boombox3)');
  console.log('   - Headphones (Sony, Beats, Bose)');
  console.log('   - Watches (Apple Watch, Rolex, Casio)');
  console.log('   - Accessories (cases, cables, chargers)');
  console.log('   - Other (hair dryers, powerbanks, gaming)');
  console.log('═══════════════════════════════════════\n');
  
  console.log('🎉 Done! New SMI electronics are now at the top of your pinned list.');
}

main().catch(console.error);
