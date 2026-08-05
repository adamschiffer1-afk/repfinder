// Weidian Shop API Scraper - używa API panelu Weidian
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const axios = require('axios');
const readline = require('readline');

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

async function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  console.log('📋 INSTRUKCJA:');
  console.log('1. Otwórz panel Weidian: https://s.weidian.com/weassistant/pc/weassistant-pc');
  console.log('2. Wejdź w "商品管理" (Product Management)');
  console.log('3. Otwórz DevTools (F12)');
  console.log('4. Kliknij zakładkę "Network"');
  console.log('5. Odśwież stronę');
  console.log('6. Znajdź request do "queryShopItemList"');
  console.log('7. Kliknij prawym przyciskiem -> Copy -> Copy as cURL (bash)');
  console.log('8. Wklej tutaj\n');

  const curl = await askQuestion('Wklej cURL command: ');

  if (!curl || !curl.includes('queryShopItemList')) {
    console.log('❌ Invalid cURL - musi zawierać queryShopItemList');
    await mongoose.connection.close();
    return;
  }

  // Parse cURL to extract cookies and headers
  const cookieMatch = curl.match(/--cookie '([^']+)'/);
  const cookies = cookieMatch ? cookieMatch[1] : '';

  console.log('\n🔍 Fetching products from API...\n');

  let page = 1;
  let hasMore = true;
  let allProducts = [];

  while (hasMore) {
    try {
      const response = await axios.post(
        'https://thor.weidian.com/trident/wditem.queryShopItemList/1.0',
        {
          context: {
            userId: "1679502043",
            shopId: "0"
          },
          request: {
            page: page,
            pageSize: 100,
            status: 2 // 2 = on sale
          }
        },
        {
          headers: {
            'Cookie': cookies,
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://s.weidian.com/'
          }
        }
      );

      const items = response.data?.result?.itemList || [];
      
      if (items.length === 0) {
        hasMore = false;
        break;
      }

      console.log(`📦 Page ${page}: Found ${items.length} products`);
      allProducts.push(...items);

      page++;
      await sleep(1000);

    } catch (error) {
      console.error(`❌ Error fetching page ${page}:`, error.message);
      hasMore = false;
    }
  }

  console.log(`\n✅ Total products found: ${allProducts.length}`);
  console.log('\n📥 Adding products to database...\n');

  let successCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < allProducts.length; i++) {
    const item = allProducts[i];
    const itemId = item.itemId || item.id;
    
    console.log(`[${i + 1}/${allProducts.length}] ${item.itemName}`);

    // Check if exists
    const exists = await Product.findOne({ link: new RegExp(itemId) });
    if (exists) {
      console.log(`   ⏭️  Already exists`);
      skippedCount++;
      continue;
    }

    try {
      const originPrice = parseFloat(item.price) || 0;
      const priceUSD = parseFloat((originPrice * 0.14).toFixed(2));

      let img = item.itemImgUrl || '';
      if (img) {
        if (img.startsWith('//')) img = `https:${img}`;
        else if (!img.startsWith('http')) img = `https://${img}`;
        if (!img.includes('?')) img = `${img}?w=400&h=400`;
      }

      const cleanUrl = `https://weidian.com/item.html?itemID=${itemId}`;
      const affLink = `https://www.kakobuy.com/item/details?url=${encodeURIComponent(cleanUrl)}&affcode=${AFFILIATE_CODE}`;

      await Product.create({
        name: item.itemName,
        price: priceUSD,
        image: img,
        category: detectCategory(item.itemName),
        batch: 'best',
        link: affLink
      });

      console.log(`   ✅ Added - $${priceUSD}`);
      successCount++;

    } catch (error) {
      console.error(`   ❌ DB Error: ${error.message}`);
      failedCount++;
    }

    await sleep(100);
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
