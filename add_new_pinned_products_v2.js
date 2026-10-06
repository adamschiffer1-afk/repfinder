const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config({ path: '.env.local' });

// Fix SSL certificate issue
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Try ANON key instead
const AFFILIATE_CODE = 'xfrostyy';

// URLs to add (30 products)
const urls = [
  'https://weidian.com/item.html?itemID=7834112554&spider_token=7a08',
  'https://weidian.com/item.html?itemID=7833981948&spider_token=0ca5',
  'https://weidian.com/item.html?itemID=7831144185&spider_token=8f47',
  'https://weidian.com/item.html?itemID=7831078907&spider_token=80e0',
  'https://weidian.com/item.html?itemID=7830908323&spider_token=e6a4',
  'https://weidian.com/item.html?itemID=7831146261&spider_token=7e07',
  'https://weidian.com/item.html?itemID=7834069264&spider_token=0511',
  'https://weidian.com/item.html?itemID=7834098740&spider_token=3c2a',
  'https://weidian.com/item.html?itemID=7834173806&spider_token=bb45',
  'https://weidian.com/item.html?itemID=7834144280&spider_token=321f',
  'https://weidian.com/item.html?itemID=7831142233&spider_token=118f',
  'https://weidian.com/item.html?itemID=7831098699&spider_token=ba47',
  'https://weidian.com/item.html?itemID=7831057317&spider_token=c004',
  'https://weidian.com/item.html?itemID=7834138320&spider_token=8348',
  'https://weidian.com/item.html?itemID=7831165807&spider_token=1206',
  'https://weidian.com/item.html?itemID=7831122475&spider_token=0938',
  'https://weidian.com/item.html?itemID=7830940093&spider_token=2275',
  'https://weidian.com/item.html?itemID=7831106567&spider_token=dafa',
  'https://weidian.com/item.html?itemID=7834071178&spider_token=6fb1',
  'https://weidian.com/item.html?itemID=7831104557&spider_token=030b',
  'https://weidian.com/item.html?itemID=7831078911&spider_token=2adc',
  'https://weidian.com/item.html?itemID=7831148189&spider_token=6206',
  'https://weidian.com/item.html?itemID=7834090886&spider_token=eccc',
  'https://weidian.com/item.html?itemID=7831136245&spider_token=d729',
  'https://weidian.com/item.html?itemID=7831124371&spider_token=05eb',
  'https://weidian.com/item.html?itemID=7833916324&spider_token=aac4',
  'https://weidian.com/item.html?itemID=7831065057&spider_token=0754',
  'https://weidian.com/item.html?itemID=7831090737&spider_token=4a1f',
  'https://weidian.com/item.html?itemID=7831082917&spider_token=54be',
  'https://weidian.com/item.html?itemID=7831066997&spider_token=3221',
];

const supabaseAxios = axios.create({
  baseURL: `${SUPABASE_URL}/rest/v1`,
  headers: {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  }
});

function detectCategory(productName) {
  const name = productName.toLowerCase();
  
  if (name.includes('belt') || name.includes('waist') || name.includes('leather belt')) {
    return 'belts';
  }
  if (name.includes('airpods') || name.includes('jbl') || name.includes('speaker') || 
      name.includes('headphones') || name.includes('charger') || name.includes('ipad') ||
      name.includes('tablet') || name.includes('apple pencil')) {
    return 'electronics';
  }
  if (name.includes('hat') || name.includes('cap') || name.includes('beanie') || 
      name.includes('balaclava') || name.includes('bucket hat') || name.includes('snapback')) {
    return 'headwear';
  }
  if (name.includes('bag') || name.includes('backpack') || name.includes('tote') || 
      name.includes('messenger') || name.includes('duffel') || name.includes('crossbody') ||
      name.includes('sling bag')) {
    return 'bags-backpacks';
  }
  if (name.includes('shoe') || name.includes('sneaker') || name.includes('boot') || 
      name.includes('jordan') || name.includes('dunk') || name.includes('yeezy') ||
      name.includes('runner') || name.includes('trainer') || name.includes('slides')) {
    return 'shoes';
  }
  if (name.includes('hoodie') || name.includes('hoody') || name.includes('sweatshirt') ||
      name.includes('sweater') || name.includes('crewneck')) {
    return 'hoodies';
  }
  if (name.includes('longsleeve') || name.includes('long sleeve') || 
      name.includes('long-sleeve') || name.includes('ls tee')) {
    return 'longsleeve';
  }
  if (name.includes('shirt') || name.includes('tee') || name.includes('t-shirt') ||
      name.includes('polo') || name.includes('jersey')) {
    return 't-shirts';
  }
  if (name.includes('pant') || name.includes('jean') || name.includes('trouser') ||
      name.includes('jogger') || name.includes('cargo')) {
    return 'pants';
  }
  if (name.includes('short')) {
    return 'shorts';
  }
  if (name.includes('jacket') || name.includes('coat') || name.includes('windbreaker') ||
      name.includes('puffer') || name.includes('bomber') || name.includes('blazer')) {
    return 'jackets';
  }
  if (name.includes('set') || name.includes('tracksuit') || name.includes('outfit')) {
    return 'sets';
  }
  return 'accessories';
}

async function scrapeWeidianProduct(url) {
  try {
    console.log(`Scraping: ${url}`);
    
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
                'Unknown Product';
    
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
    
    const category = detectCategory(name);
    
    const itemIdMatch = url.match(/itemID=(\d+)/);
    const itemId = itemIdMatch ? itemIdMatch[1] : '';
    const affiliateLink = itemId ? 
      `https://weidian.com/item.html?itemID=${itemId}&wfr=c&source=goods_home&ifr=itemdetail&sfr=${AFFILIATE_CODE}` : 
      url;
    
    console.log(`✓ Scraped: ${name}`);
    return {
      name,
      price,
      image,
      category,
      link: affiliateLink,
      batch: 'best'
    };
  } catch (error) {
    console.error(`✗ Failed to scrape ${url}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Starting bulk add of 30 new pinned products...\n');
  
  // Step 1: Get current pinned products
  console.log('📊 Fetching current pinned products...');
  try {
    const response = await supabaseAxios.get('/products?is_pinned=eq.true&order=pinned_order.asc');
    const currentPinned = response.data || [];
    const currentCount = currentPinned.length;
    
    console.log(`   Found ${currentCount} currently pinned products\n`);
    
    // Step 2: Update existing pinned products - shift them down by 30
    if (currentCount > 0) {
      console.log('📝 Shifting existing pinned products down by 30 positions...');
      
      for (const product of currentPinned) {
        await supabaseAxios.patch(
          `/products?id=eq.${product.id}`,
          { pinned_order: product.pinned_order + 30 }
        );
      }
      
      console.log(`   ✓ Shifted ${currentCount} products\n`);
    }
    
    // Step 3: Scrape and add new products
    console.log('🔍 Scraping new products from Weidian...\n');
    
    const products = [];
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const productData = await scrapeWeidianProduct(url);
      
      if (productData) {
        products.push({
          ...productData,
          is_pinned: true,
          pinned_order: i + 1,
          clicks: 0,
          qc_images: []
        });
        successCount++;
      } else {
        failCount++;
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`\n📦 Scraped ${successCount}/${urls.length} products successfully\n`);
    
    if (products.length === 0) {
      console.log('❌ No products to add!');
      return;
    }
    
    // Step 4: Insert new products
    console.log('💾 Adding products to database...');
    
    const insertResponse = await supabaseAxios.post('/products', products);
    const inserted = insertResponse.data || [];
    
    console.log(`✅ Successfully added ${inserted.length} products!\n`);
    
    // Step 5: Summary
    console.log('═══════════════════════════════════════');
    console.log('📊 SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log(`✓ New products added: ${inserted.length}`);
    console.log(`✓ Existing products shifted: ${currentCount}`);
    console.log(`✓ Total pinned products: ${currentCount + inserted.length}`);
    console.log(`✗ Failed scrapes: ${failCount}`);
    console.log('═══════════════════════════════════════\n');
    
    console.log('🎉 Done! New products are now at the top of your pinned list.');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

main().catch(console.error);
