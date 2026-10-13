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

// Products from SMI spreadsheet - categorized by type
const productsData = [
  // T-Shirts (kategoria: t-shirts)
  { itemId: '5080835633', category: 't-shirts', name: 'Ami T-shirt' },
  { itemId: '5067781594', category: 't-shirts', name: 'AMI T-shirt' },
  { itemId: '5076562305', category: 't-shirts', name: 'AMI T-shirt' },
  { itemId: '5096760376', category: 'polo', name: 'Ralph Lauren POLO' },
  { itemId: '5131934787', category: 'polo', name: 'Ralph Lauren POLO' },
  { itemId: '5076482888', category: 'polo', name: 'Ralph Lauren POLO' },
  { itemId: '5083836949', category: 'shorts', name: 'Ralph Lauren Shorts' },
  { itemId: '751134063', category: 't-shirts', name: 'Stone Island T-shirt' },
  { itemId: '751324417', category: 'polo', name: 'Stone Island POLO' },
  { itemId: '751191589', category: 't-shirts', name: 'Stone Island T-shirt' },
  { itemId: '750811329', category: 'sets', name: 'LV Shirt Set' },
  { itemId: '751006978', category: 't-shirts', name: 'LV T-shirt' },
  { itemId: '750445830', category: 't-shirts', name: 'Chrome Hearts T-shirt' },
  { itemId: '750838564', category: 't-shirts', name: 'Chrome Hearts T-shirt' },
  { itemId: '751155812', category: 't-shirts', name: 'Corteiz T-shirt' },
  { itemId: '751186541', category: 't-shirts', name: 'Corteiz T-shirt' },
  { itemId: '751188093', category: 't-shirts', name: 'Corteiz T-shirt' },
  { itemId: '750880586', category: 'shorts', name: 'Corteiz shorts' },
  { itemId: '751156792', category: 'shorts', name: 'Corteiz shorts' },
  { itemId: '750442741', category: 'shorts', name: 'Corteiz shorts' },
  { itemId: '751373069', category: 'sets', name: 'Dior suit' },
  { itemId: '750835195', category: 't-shirts', name: 'DIOR T-shirt' },
  { itemId: '750448420', category: 'shorts', name: 'Dior shorts' },
  { itemId: '751002229', category: 't-shirts', name: 'Prada T-shirt' },
  { itemId: '751280065', category: 't-shirts', name: 'Prada T-shirt' },
  { itemId: '751277887', category: 't-shirts', name: 'Stussy T-shirt' },
  { itemId: '751156510', category: 't-shirts', name: 'Stussy T-shirt' },
  { itemId: '750820186', category: 't-shirts', name: 'Stussy T-shirt' },
  { itemId: '750969774', category: 't-shirts', name: 'LOEWE t-shirt' },
  { itemId: '750722935', category: 't-shirts', name: 'Gucci T-shirt' },
  { itemId: '750951365', category: 't-shirts', name: 'Gucci T-shirt' },
  { itemId: '750754122', category: 't-shirts', name: 'spider T-shirt' },
  { itemId: '751086086', category: 't-shirts', name: 'Casablanca T-shirt' },
  { itemId: '751231422', category: 't-shirts', name: 'Casablanca T-shirt' },
  { itemId: '750813509', category: 't-shirts', name: 'Burberry T-shirt' },
  { itemId: '751272746', category: 'shorts', name: 'Burberry Shorts' },
  { itemId: '750830087', category: 't-shirts', name: 'Trapstar t-shirt' },
  { itemId: '751250307', category: 't-shirts', name: 'Trapstar t-shirt' },
  { itemId: '750686072', category: 't-shirts', name: 'Essentials T-shirt' },
  { itemId: '751063851', category: 't-shirts', name: 'Essentials T-shirt' },
  { itemId: '750440954', category: 't-shirts', name: 'Essentials T-shirt' },
  { itemId: '750638779', category: 'shorts', name: 'Essentials Shorts' },
  { itemId: '751141160', category: 't-shirts', name: 'CP T-shirt' },
  { itemId: '750831244', category: 't-shirts', name: 'Dsquared2 T-shirt' },
  { itemId: '751067602', category: 't-shirts', name: 'Dsquared2 T-shirt' },
  { itemId: '751008166', category: 'shorts', name: 'Dsquared2 shorts' },
  { itemId: '751132303', category: 't-shirts', name: 'Hellstar T-shirt' },
  { itemId: '751345638', category: 't-shirts', name: 'Hellstar T-shirt' },
  { itemId: '750721947', category: 'shorts', name: 'Hellstar shorts' },
  { itemId: '751193783', category: 't-shirts', name: 'Tommy T-shirt' },
  { itemId: '750952151', category: 't-shirts', name: 'Tommy T-shirt' },
  { itemId: '751540183', category: 't-shirts', name: 'Denim Tears T-shirt' },
  { itemId: '750871901', category: 'shorts', name: 'Denim Tears Shorts' },
  { itemId: '750757134', category: 't-shirts', name: 'Syna World T-shirt' },
  { itemId: '751789762', category: 't-shirts', name: 'PP T-shirt' },
  { itemId: '750971562', category: 't-shirts', name: 'PP T-shirt' },
  { itemId: '751462145', category: 't-shirts', name: 'PP T-shirt' },
  { itemId: '751536267', category: 't-shirts', name: 'PP T-shirt' },
  { itemId: '750964283', category: 't-shirts', name: 'Palm Angels T-shirt' },
  { itemId: '751063660', category: 't-shirts', name: 'Palm Angel T-shirt' },
  { itemId: '751089041', category: 't-shirts', name: 'Palm Angels T-shirt' },
  { itemId: '751066406', category: 't-shirts', name: 'Palm Angels T-shirt' },
  { itemId: '751414887', category: 't-shirts', name: 'Palm Angels T-shirt' },
  { itemId: '750912123', category: 't-shirts', name: 'Moncler T-shirt' },
  { itemId: '750902209', category: 't-shirts', name: 'Moncler T-shirt' },
  { itemId: '751468462', category: 'shorts', name: 'Moncler shorts' },
  { itemId: '751540806', category: 't-shirts', name: 'OFF-White T-shirt' },
  { itemId: '751063422', category: 't-shirts', name: 'Off-White T-shirt' },
  { itemId: '750997357', category: 't-shirts', name: 'Valentino T-shirt' },
  { itemId: '751256602', category: 't-shirts', name: 'Valentino T-shirt' },
  { itemId: '750568534', category: 'shorts', name: 'Valentino shorts' },
  { itemId: '750587691', category: 't-shirts', name: 'Travis Scott T-shirt' },
  { itemId: '751064239', category: 'shorts', name: 'Travis Scott Shorts' },
  { itemId: '750947599', category: 't-shirts', name: 'Amiri T-shirt' },
  { itemId: '751326387', category: 't-shirts', name: 'Amiri T-shirt' },
  { itemId: '750837974', category: 'sets', name: 'Amiri suit' },
  { itemId: '750945426', category: 'sets', name: 'Amiri suit' },
  { itemId: '750760188', category: 'sets', name: 'Amiri suit' },
  { itemId: '751249666', category: 'shorts', name: 'Amiri shorts' },
  { itemId: '750729584', category: 't-shirts', name: 'BAPE T-shirt' },
  { itemId: '751251473', category: 't-shirts', name: 'BAPE T-shirt' },
  { itemId: '751000330', category: 't-shirts', name: 'BAPE T-shirt' },
  { itemId: '750732563', category: 't-shirts', name: 'BAPE T-shirt' },
  { itemId: '751137793', category: 'shorts', name: 'Bape Shorts' },
  { itemId: '751370941', category: 'shorts', name: 'Bape Shorts' },
  { itemId: '751325208', category: 't-shirts', name: 'represent T-shirt' },
  { itemId: '750909357', category: 't-shirts', name: 'represent T-shirt' },
  { itemId: '750807682', category: 't-shirts', name: 'Carhartt T-shirt' },
  { itemId: '751064827', category: 't-shirts', name: 'Carhartt T-shirt' },
  { itemId: '750637603', category: 'shorts', name: 'Carhartt Shorts' },
  { itemId: '751534114', category: 't-shirts', name: 'Vlone T-shirt' },
  { itemId: '750449790', category: 't-shirts', name: 'Maison Margiela T-shirt' },
  { itemId: '750570293', category: 't-shirts', name: 'Maison Margiela T-shirt' },
  { itemId: '750449790', category: 't-shirts', name: 'Rhude T-shirt' },
  { itemId: '750633686', category: 't-shirts', name: 'Under Armour T-shirt' },
  { itemId: '750915812', category: 't-shirts', name: 'Under Armour T-shirt' },
  { itemId: '751470632', category: 't-shirts', name: 'Gallery Dept T-shirt' },
  { itemId: '751065829', category: 't-shirts', name: 'Gallery Dept T-shirt' },
];

async function scrapeWeidianProduct(itemId, category, fallbackName) {
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
    
    console.log(`✓ Scraped: ${name} [${category}]`);
    return {
      name,
      slug: uniqueSlug,
      price,
      image,
      category,
      link: affiliateLink,
      batch: 'smi-tshirts-shorts'
    };
  } catch (error) {
    console.error(`✗ Failed to scrape ${itemId}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Starting bulk add of SMI T-shirts & Shorts products...\n');
  console.log(`📦 Total products to add: ${productsData.length}\n`);
  
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
  const shiftAmount = productsData.length;
  
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
  console.log('🔍 Scraping new products from Weidian...\n');
  
  const products = [];
  let successCount = 0;
  let failCount = 0;
  
  const categoryStats = {};
  
  for (let i = 0; i < productsData.length; i++) {
    const { itemId, category, name } = productsData[i];
    const productData = await scrapeWeidianProduct(itemId, category, name);
    
    if (productData) {
      products.push({
        ...productData,
        is_pinned: true,
        pinned_order: i + 1,
        clicks: 0,
        qc_images: []
      });
      successCount++;
      
      // Track category stats
      categoryStats[category] = (categoryStats[category] || 0) + 1;
    } else {
      failCount++;
    }
    
    // Delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`\n📦 Scraped ${successCount}/${productsData.length} products successfully\n`);
  
  if (products.length === 0) {
    console.log('❌ No products to add!');
    return;
  }
  
  // Step 4: Insert new products
  console.log('💾 Adding products to database...');
  
  const { data: inserted, error: insertError } = await supabase
    .from('products')
    .insert(products)
    .select();
  
  if (insertError) {
    console.error('❌ Error inserting products:', insertError);
    return;
  }
  
  console.log(`✅ Successfully added ${inserted.length} products!\n`);
  
  // Step 5: Summary
  console.log('═══════════════════════════════════════');
  console.log('📊 SUMMARY');
  console.log('═══════════════════════════════════════');
  console.log(`✓ New products added: ${inserted.length}`);
  console.log(`✓ Existing products shifted: ${currentCount}`);
  console.log(`✓ Total pinned products: ${currentCount + inserted.length}`);
  console.log(`✗ Failed scrapes: ${failCount}`);
  console.log('\n📋 Category breakdown:');
  Object.entries(categoryStats).forEach(([cat, count]) => {
    console.log(`   ${cat}: ${count} products`);
  });
  console.log('═══════════════════════════════════════\n');
  
  console.log('🎉 Done! New SMI products are now at the top of your pinned list.');
}

main().catch(console.error);
