// Weidian Shop Scraper - pobiera wszystkie produkty ze sklepu
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');

const MONGODB_URI = process.env.MONGODB_URI;
const SHOP_USER_ID = '1679502043';
const AFFILIATE_CODE = 'xfrostyy';

// Product Schema
const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String, required: true },
  category: { type: String, required: true },
  batch: { type: String, default: 'random' },
  link: { type: String, required: true },
  clicks: { type: Number, default: 0 },
  isPinned: { type: Boolean, default: false },
  pinnedOrder: { type: Number, default: null },
  qcImages: { type: [String], default: [] },
  slug: { type: String, unique: true, sparse: true }
}, { timestamps: true });

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

function detectCategory(name) {
  const n = name.toLowerCase();
  if (n.includes('shoe') || n.includes('sneaker') || n.includes('jordan') || n.includes('dunk') || n.includes('nike') || n.includes('adidas') || n.includes('yeezy') || n.includes('boot')) return 'shoes';
  if (n.includes('hoodie') || n.includes('sweatshirt')) return 'hoodies';
  if (n.includes('pants') || n.includes('jeans') || n.includes('cargo') || n.includes('jogger')) return 'pants';
  if (n.includes('short')) return 'shorts';
  if (n.includes('jacket') || n.includes('coat')) return 'jackets';
  if (n.includes('bag') || n.includes('backpack')) return 'bags';
  if (n.includes('shirt') || n.includes('tee') || n.includes('polo')) return 't-shirts';
  if (n.includes('sweater')) return 'sweaters';
  if (n.includes('accessories') || n.includes('hat') || n.includes('cap')) return 'accessories';
  return 'clothing';
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeShopProducts() {
  try {
    console.log(`🔍 Fetching products from shop: ${SHOP_USER_ID}`);
    
    // Pobierz stronę sklepu
    const shopUrl = `https://weidian.com/?userid=${SHOP_USER_ID}`;
    const response = await axios.get(shopUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
        'Referer': 'https://weidian.com/'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const scriptTag = $('#__rocker-render-inject__');

    if (scriptTag.length === 0) {
      throw new Error('Could not find shop data - bot protection active');
    }

    const dataObj = JSON.parse(scriptTag.attr('data-obj'));
    const itemList = dataObj?.result?.default_model?.list || [];

    if (itemList.length === 0) {
      console.log('❌ No products found in shop');
      return [];
    }

    console.log(`✅ Found ${itemList.length} products in shop`);
    
    const productUrls = itemList.map(item => {
      const itemId = item.itemId || item.id || item.itemID;
      return `https://weidian.com/item.html?itemID=${itemId}`;
    });

    return productUrls;

  } catch (error) {
    console.error('❌ Error fetching shop products:', error.message);
    return [];
  }
}

async function scrapeProductDetails(url) {
  try {
    const itemIdMatch = url.match(/itemID=(\d+)/);
    if (!itemIdMatch) return null;

    const itemId = itemIdMatch[1];
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
        'Referer': 'https://weidian.com/'
      },
      timeout: 8000
    });

    const $ = cheerio.load(response.data);
    const scriptTag = $('#__rocker-render-inject__');

    if (scriptTag.length === 0) {
      throw new Error('Product data not found');
    }

    const dataObj = JSON.parse(scriptTag.attr('data-obj'));
    const itemInfo = dataObj?.result?.default_model?.item_info;

    if (!itemInfo) return null;

    const name = itemInfo.item_name;
    const originPrice = parseFloat(itemInfo.origin_price) || 0;
    const priceUSD = parseFloat((originPrice * 0.14).toFixed(2));

    let img = itemInfo.item_head || '';
    if (img) {
      if (img.startsWith('//')) img = `https:${img}`;
      else if (!img.startsWith('http')) img = `https://${img}`;
      if (!img.includes('?')) img = `${img}?w=400&h=400`;
    }

    const cleanUrl = `https://weidian.com/item.html?itemID=${itemId}`;
    const affLink = `https://www.kakobuy.com/item/details?url=${encodeURIComponent(cleanUrl)}&affcode=${AFFILIATE_CODE}`;

    return {
      name,
      price: priceUSD,
      image: img,
      category: detectCategory(name),
      batch: 'best',
      link: affLink,
      itemId
    };

  } catch (error) {
    console.error(`   ❌ Failed to scrape: ${error.message}`);
    return null;
  }
}

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  // 1. Pobierz listę produktów ze sklepu
  const productUrls = await scrapeShopProducts();
  
  if (productUrls.length === 0) {
    console.log('No products to scrape');
    await mongoose.connection.close();
    return;
  }

  console.log(`\n📦 Starting to scrape ${productUrls.length} products...\n`);

  let successCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  // 2. Scrapuj każdy produkt
  for (let i = 0; i < productUrls.length; i++) {
    const url = productUrls[i];
    console.log(`[${i + 1}/${productUrls.length}] ${url}`);

    const productData = await scrapeProductDetails(url);

    if (!productData) {
      failedCount++;
      await sleep(1000);
      continue;
    }

    // Sprawdź czy produkt już istnieje
    const exists = await Product.findOne({ link: new RegExp(productData.itemId) });
    if (exists) {
      console.log(`   ⏭️  Already exists: "${productData.name}"`);
      skippedCount++;
      await sleep(1000);
      continue;
    }

    // Zapisz do bazy
    try {
      await Product.create(productData);
      console.log(`   ✅ Added: "${productData.name}" - $${productData.price}`);
      successCount++;
    } catch (error) {
      console.error(`   ❌ DB Error: ${error.message}`);
      failedCount++;
    }

    await sleep(1500); // Delay między requestami
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Successfully added: ${successCount}`);
  console.log(`⏭️  Skipped (already exist): ${skippedCount}`);
  console.log(`❌ Failed: ${failedCount}`);
  console.log('='.repeat(50));

  await mongoose.connection.close();
  console.log('\n✅ Done!');
}

run().catch(err => {
  console.error('❌ Critical error:', err);
  process.exit(1);
});
