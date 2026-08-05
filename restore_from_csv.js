require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');

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
  qcImages: { type: [mongoose.Schema.Types.Mixed], default: [] },
  slug: { type: String, sparse: true },
  itemId: { type: String, sparse: true }
}, { timestamps: true });

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

const AFFILIATE_CODE = 'xfrostyy';

// CSV files to check
const CSV_FILES = [
  'se1-itemexport-1653718259-20260619220330.csv',
  'se1-itemexport-1679502043-20260619024109.csv',
  'se1-itemexport-1679502043-20260610000353.csv',
];

function parseCSV(content) {
  const lines = content.split('\n').map(l => l.trim()).filter(l => l);
  const hasHeader = lines[0].includes('商品ID') || lines[0].includes('商品标题');
  const dataLines = hasHeader ? lines.slice(1) : lines;
  
  const products = [];
  for (const line of dataLines) {
    const fields = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) { fields.push(current.trim()); current = ''; }
      else current += char;
    }
    fields.push(current.trim());
    if (fields.length < 4) continue;
    
    let itemId, title, priceStr, link;
    if (fields.length === 5) {
      [itemId, title, , priceStr, link] = fields;
    } else {
      [itemId, title, , , priceStr, link] = fields;
    }
    
    const priceCNY = parseFloat(priceStr) || 0;
    const priceUSD = parseFloat((priceCNY * 0.14).toFixed(2));
    if (!priceUSD || !itemId) continue;
    
    // Build the kakobuy afflink
    const cleanUrl = `https://weidian.com/item.html?itemID=${itemId.trim()}`;
    const affLink = `https://www.kakobuy.com/item/details?url=${encodeURIComponent(cleanUrl)}&affcode=${AFFILIATE_CODE}`;
    
    products.push({ itemId: itemId.trim(), title: title.trim(), priceUSD, affLink });
  }
  return products;
}

async function scrapeImageFromWeidian(itemId) {
  try {
    const url = `https://weidian.com/item.html?itemID=${itemId}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
        'Referer': 'https://weidian.com/'
      },
      timeout: 8000
    });
    const $ = cheerio.load(response.data);
    const scriptTag = $('#__rocker-render-inject__');
    if (!scriptTag.length) return null;
    const dataObj = JSON.parse(scriptTag.attr('data-obj'));
    const itemInfo = dataObj?.result?.default_model?.item_info;
    let img = itemInfo?.item_head || '';
    if (img) {
      if (img.startsWith('//')) img = `https:${img}`;
      else if (!img.startsWith('http')) img = `https://${img}`;
      if (!img.includes('?')) img = `${img}?w=400&h=400`;
    }
    return img || null;
  } catch { return null; }
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Get all current products
  const currentProducts = await Product.find({});
  const currentLinks = new Set(currentProducts.map(p => p.link));
  const currentItemIds = new Set(currentProducts.map(p => p.itemId).filter(Boolean));
  
  console.log(`Currently ${currentProducts.length} products in DB`);

  // Collect all unique products from all CSV files
  const allCsvProducts = new Map(); // itemId -> product data
  for (const csvFile of CSV_FILES) {
    if (!fs.existsSync(csvFile)) continue;
    const content = fs.readFileSync(csvFile, 'utf-8');
    const parsed = parseCSV(content);
    for (const p of parsed) {
      if (!allCsvProducts.has(p.itemId)) {
        allCsvProducts.set(p.itemId, p);
      }
    }
  }
  console.log(`Total unique products in all CSVs: ${allCsvProducts.size}`);

  // Find which ones are missing from DB
  const missing = [];
  for (const [itemId, p] of allCsvProducts) {
    if (!currentLinks.has(p.affLink) && !currentItemIds.has(itemId)) {
      missing.push(p);
    }
  }
  console.log(`Missing from DB (to restore): ${missing.length}`);

  // Build image map from existing products
  const imageMap = new Map();
  currentProducts.forEach(p => {
    if (p.itemId && p.image && !p.image.includes('placeholder')) imageMap.set(p.itemId, p.image);
  });

  let restored = 0;
  for (let i = 0; i < missing.length; i++) {
    const p = missing[i];
    
    // Use original title from CSV (unchanged, just clean Chinese chars if needed)
    let name = p.title;
    // Remove Chinese characters
    name = name.replace(/[\u4e00-\u9fa5]/g, '').trim();
    if (!name) name = p.title; // fallback to full title
    
    let imageUrl = imageMap.get(p.itemId) || null;
    if (!imageUrl) {
      console.log(`[${i+1}/${missing.length}] Scraping image for ${p.itemId}...`);
      imageUrl = await scrapeImageFromWeidian(p.itemId);
      await new Promise(r => setTimeout(r, 300));
      if (!imageUrl) imageUrl = 'https://via.placeholder.com/400x400?text=Product';
    }

    try {
      await Product.create({
        name,
        price: p.priceUSD,
        image: imageUrl,
        category: 'clothing',
        batch: 'random',
        link: p.affLink,
        clicks: 0,
        isPinned: false,
        itemId: p.itemId,
        qcImages: []
      });
      console.log(`✅ [${i+1}/${missing.length}] Restored: "${name}"`);
      restored++;
    } catch (err) {
      console.error(`❌ Failed: ${err.message}`);
    }
  }

  console.log(`\nDone! Restored ${restored} products.`);
  await mongoose.connection.close();
}

run().catch(err => { console.error(err); process.exit(1); });
