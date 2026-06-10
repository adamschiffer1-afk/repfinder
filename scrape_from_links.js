// Scraper z listy linków
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const MONGODB_URI = process.env.MONGODB_URI;
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

async function scrapeProduct(url) {
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
  // Read links from file
  const linksFile = 'product_links.txt';
  
  if (!fs.existsSync(linksFile)) {
    console.log('❌ File "product_links.txt" not found!');
    console.log('\n📝 Create product_links.txt and paste product URLs (one per line)');
    console.log('Example:');
    console.log('https://weidian.com/item.html?itemID=7772191785');
    console.log('https://weidian.com/item.html?itemID=7775148066');
    return;
  }

  const content = fs.readFileSync(linksFile, 'utf-8');
  const urls = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && line.startsWith('http'));

  if (urls.length === 0) {
    console.log('❌ No valid URLs found in product_links.txt');
    return;
  }

  console.log(`📋 Found ${urls.length} URLs in product_links.txt\n`);

  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  let successCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    console.log(`[${i + 1}/${urls.length}] ${url}`);

    const productData = await scrapeProduct(url);

    if (!productData) {
      failedCount++;
      await sleep(1000);
      continue;
    }

    // Check if exists
    const exists = await Product.findOne({ link: new RegExp(productData.itemId) });
    if (exists) {
      console.log(`   ⏭️  Already exists: "${productData.name}"`);
      skippedCount++;
      await sleep(1000);
      continue;
    }

    // Save to DB
    try {
      await Product.create(productData);
      console.log(`   ✅ Added: "${productData.name}" - $${productData.price}`);
      successCount++;
    } catch (error) {
      console.error(`   ❌ DB Error: ${error.message}`);
      failedCount++;
    }

    await sleep(1500);
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
