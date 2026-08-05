// CSV Update Script - Updates existing products or adds new ones
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const MONGODB_URI = process.env.MONGODB_URI;
const AFFILIATE_CODE = 'xfrostyy';
const CSV_FILE = 'se1-itemexport-1679502043-20260619024109.csv';

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
  slug: { type: String, unique: true, sparse: true },
  itemId: { type: String, unique: true, sparse: true }
}, { timestamps: true });

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

// BRAND MAP with Broken Planet fix
const BRAND_MAP = {
  'n.k': 'Nike', 'N.K': 'Nike', 'N.k': 'Nike',
  'J.o.r.d.a.n': 'Jordan', 'j.o.r.d.a.n': 'Jordan',
  'b.b.l': 'Burberry', 'B.B.L': 'Burberry',
  'd.r': 'Dior', 'D.R': 'Dior',
  'g.c': 'Gucci', 'G.C': 'Gucci',
  'p.l.d': 'Prada', 'P.L.D': 'Prada',
  'b.l': 'Balenciaga', 'B.L': 'Balenciaga',
  'b.m': 'The North Face', 'B.M': 'The North Face',
  'g.y': 'Goyard', 'G.Y': 'Goyard',
  'm.k.l': 'Michael Kors', 'M.K.L': 'Michael Kors',
  'C.a.r.t.i.e.r': 'Cartier',
  'a.m.i': 'Ami Paris', 'A.M.I': 'Ami Paris',
  'a.m.e': 'Amiri', 'A.M.E': 'Amiri',
  'a.m.n': 'Amina Muaddi', 'A.M.N': 'Amina Muaddi',
  'a.m.s': 'AMS', 'A.M.S': 'AMS',
  'k.l.x': 'Chrome Hearts', 'K.L.X': 'Chrome Hearts', 'klx': 'Chrome Hearts',
  'c.o.r': 'Corteiz', 'C.O.R': 'Corteiz',
  's.l.l': 'YSL', 'S.L.L': 'YSL', 'sll': 'YSL',
  'o.w': 'Off White', 'O.W': 'Off White',
  'f.d': 'Fendi', 'F.D': 'Fendi', 'fd': 'Fendi',
  'n.e.w': 'New Balance', 'N.E.W': 'New Balance',
  'd.e': 'Diesel', 'D.E': 'Diesel',
  'q.d': 'QD', 'Q.D': 'QD',
  'k.d.y': 'Cartier', 'K.D.Y': 'Cartier',
  'c.p': 'CP Company', 'C.P': 'CP Company',
  'l.a.n': 'Lanvin',
  'c.j.b.l': 'Casablanca',
  'e.y': 'EY', 'E.Y': 'EY',
  'r.l': 'Ralph Lauren', 'R.L': 'Ralph Lauren',
  's.t.x': 'Stussy', 'S.T.X': 'Stussy',
  's.t.d': 'Stussy', 'S.T.D': 'Stussy',
  'm.s.n.k': 'Mastermind Japan',
  'k.h.t': 'Carhartt', 'K.H.T': 'Carhartt',
  'c.k': 'Calvin Klein', 'C.K': 'Calvin Klein',
  'a.d': 'Adidas', 'A.D': 'Adidas',
  'a.d.m': 'Adidas', 'A.D.M': 'Adidas',
  'l.o.n': 'Longines',
  's.p': 'Supreme', 'S.P': 'Supreme',
  'R.o.l.e.x': 'Rolex',
  'h': 'Broken Planet', 'H': 'Broken Planet', 'H.': 'Broken Planet',
  'a.p': 'Audemars Piguet', 'A.P': 'Audemars Piguet',
  's.k': 'Seiko',
  'x.n.e': 'XNE', 'X.N.E': 'XNE',
  'R.i.c.h.a.r.d M.i.l.l.e': 'Richard Mille',
  'k.w': 'Converse', 'K.W': 'Converse',
  's.z': 'Maison Margiela', 'S.Z': 'Maison Margiela',
  'c.h.l': 'Chanel',
  'y.z': 'Yeezy',
  'D.G': 'Dolce Gabbana',
  'B.i.r.k.e.n.s.t.o.c.k.s': 'Birkenstock',
  'M.M': 'Maison Margiela', 'm.m': 'Maison Margiela',
  'b.p': 'Bape', 'B.P': 'Bape',
  'h.l': 'Hugo Boss', 'H.L': 'Hugo Boss',
  'e.s': 'Essentials', 'E.S': 'Essentials',
  'V.a.l.e.n.t.i.n.o': 'Valentino',
  'M.c.Q.u.e.e.n': 'McQueen',
  't.b.l': 'Timberland', 'T.B.L': 'Timberland',
  'l.g': 'LEGO', 'L.G': 'LEGO',
  'm.l.b': 'MLB', 'M.L.B': 'MLB',
  'd.s': 'Dsquared2', 'D.S': 'Dsquared2',
  'k.c': 'Kate Spade', 'K.C': 'Kate Spade',
  'a.s': 'Acne Studios', 'A.S': 'Acne Studios',
  'u.u': 'Uniqlo', 'U.U': 'Uniqlo',
  'G.A': 'Gallery Dept',
  'm.j.l': 'Marc Jacobs', 'M.J.L': 'Marc Jacobs',
  'y.s.s': 'YSS', 'Y.S.S': 'YSS',
  'p.r.a': 'Prada', 'P.R.A': 'Prada',
  't.r.a': 'Trapstar', 'T.R.A': 'Trapstar',
  'k.s': 'KS', 'K.S': 'KS',
  'u.g': 'UGG', 'U.G': 'UGG',
  'U.S': 'US',
  'l.b.t': 'Louboutin', 'L.B.T': 'Louboutin',
};

function decodeBrandName(name) {
  let decoded = name;
  const sortedEntries = Object.entries(BRAND_MAP).sort((a, b) => b[0].length - a[0].length);
  
  for (const [abbrev, full] of sortedEntries) {
    const escapedAbbrev = abbrev.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp('(?:^|\\s)(' + escapedAbbrev + ')(?=\\s|$)', 'gi');
    decoded = decoded.replace(regex, (match, p1) => {
      return match.replace(p1, full);
    });
  }
  
  decoded = decoded.replace(/[\u4e00-\u9fa5]/g, '');
  decoded = decoded.replace(/\b([A-Z]\.){2,}[A-Z]\b/g, (match) => match.replace(/\./g, ''));
  decoded = decoded.toLowerCase();
  decoded = decoded.replace(/\bshort[- ]sleeves?\b/gi, 'T-shirt');
  decoded = decoded.replace(/\blong[- ]sleeves?\b/gi, 'Long Sleeve');
  decoded = decoded.replace(/\bfanny pack\b/gi, 'Bag');
  decoded = decoded.replace(/\bshoulder bag\b/gi, 'Bag');
  decoded = decoded.replace(/\bknitted hat\b/gi, 'Hat');
  decoded = decoded.replace(/\bzipper sweatshirt\b/gi, 'Zip Hoodie');
  decoded = decoded.replace(/\b\w/g, char => char.toUpperCase());
  decoded = decoded.replace(/\s+/g, ' ').trim();
  
  return decoded;
}

async function scrapeImageFromWeidian(itemId) {
  try {
    const url = `https://weidian.com/item.html?itemID=${itemId}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15',
        'Referer': 'https://weidian.com/'
      },
      timeout: 8000
    });
    const $ = cheerio.load(response.data);
    const scriptTag = $('#__rocker-render-inject__');
    if (scriptTag.length === 0) return null;
    const dataObj = JSON.parse(scriptTag.attr('data-obj'));
    const itemInfo = dataObj?.result?.default_model?.item_info;
    if (!itemInfo) return null;
    let img = itemInfo.item_head || '';
    if (img) {
      if (img.startsWith('//')) img = `https:${img}`;
      else if (!img.startsWith('http')) img = `https://${img}`;
      if (!img.includes('?')) img = `${img}?w=400&h=400`;
    }
    return img || null;
  } catch (error) {
    return null;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function detectCategory(name) {
  const n = name.toLowerCase();
  if (n.includes('shoe') || n.includes('sneaker') || n.includes('jordan') || n.includes('dunk') || n.includes('鞋子')) return 'shoes';
  if (n.includes('hoodie') || n.includes('sweatshirt')) return 'hoodies';
  if (n.includes('pants') || n.includes('jeans') || n.includes('sweatpants')) return 'pants';
  if (n.includes('short') && !n.includes('short sleeve')) return 'shorts';
  if (n.includes('jacket') || n.includes('coat')) return 'jackets';
  if (n.includes('tracksuit') || n.includes('set')) return 'sets';
  if (n.includes('shirt') || n.includes('tee') || n.includes('polo')) return 't-shirts';
  if (n.includes('bag') || n.includes('backpack') || n.includes('hat') || n.includes('belt') || n.includes('watch') || n.includes('glasses')) return 'accessories';
  if (n.includes('sweater') || n.includes('cardigan')) return 'sweaters';
  return 'clothing';
}

function parseCSV(content) {
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);
  if (lines.length === 0) throw new Error('CSV file is empty');
  
  const firstLine = lines[0];
  const hasHeader = firstLine.includes('商品ID') || firstLine.includes('商品标题');
  const dataLines = hasHeader ? lines.slice(1) : lines;
  
  const products = [];
  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i];
    const fields = [];
    let current = '';
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim());
    if (fields.length < 5) continue;
    
    let itemId, title, priceStr, link;
    if (fields.length === 5) {
      [itemId, title, , priceStr, link] = fields;
    } else {
      [itemId, title, , , priceStr, link] = fields;
    }
    
    const priceCNY = parseFloat(priceStr) || 0;
    const priceUSD = parseFloat((priceCNY * 0.14).toFixed(2));
    if (priceUSD === 0) continue;
    const decodedName = decodeBrandName(title);
    products.push({
      itemId: itemId.trim(),
      name: decodedName,
      originalName: title,
      price: priceUSD,
      priceCNY,
      link: link.trim()
    });
  }
  return products;
}

async function run() {
  if (!fs.existsSync(CSV_FILE)) {
    console.log(`❌ CSV file "${CSV_FILE}" not found!`);
    return;
  }
  console.log(`📋 Reading CSV file: ${CSV_FILE}\n`);
  const content = fs.readFileSync(CSV_FILE, 'utf-8');
  let products;
  try {
    products = parseCSV(content);
  } catch (error) {
    console.log(`❌ Failed to parse CSV: ${error.message}`);
    return;
  }
  console.log(`✅ Parsed ${products.length} products from CSV\n`);
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');
  
  let updatedCount = 0;
  let addedCount = 0;
  let skippedCount = 0;
  
  for (let i = 0; i < products.length; i++) {
    const prod = products[i];
    console.log(`[${i + 1}/${products.length}] Processing: "${prod.name}"`);
    
    // Check if product exists by itemId or link
    const cleanUrl = `https://weidian.com/item.html?itemID=${prod.itemId}`;
    const affLink = `https://www.kakobuy.com/item/details?url=${encodeURIComponent(cleanUrl)}&affcode=${AFFILIATE_CODE}`;
    
    const existingProduct = await Product.findOne({
      $or: [
        { itemId: prod.itemId },
        { link: affLink }
      ]
    });
    
    const productImage = await scrapeImageFromWeidian(prod.itemId);
    await sleep(200);
    const category = detectCategory(prod.name);
    const imageUrl = productImage || 'https://via.placeholder.com/400x400?text=Product';
    
    if (existingProduct) {
      // Update existing product (skip pinned products)
      if (existingProduct.isPinned) {
        console.log(`   ⏭️  Skipped (pinned): ${existingProduct.name}`);
        skippedCount++;
      } else {
        await Product.updateOne(
          { _id: existingProduct._id },
          {
            $set: {
              name: prod.name,
              price: prod.price,
              image: imageUrl,
              category: category,
              batch: 'best',
              link: affLink,
              itemId: prod.itemId
            }
          }
        );
        const imageStatus = productImage ? '📷' : '⚠️ no img';
        console.log(`   🔄 Updated: $${prod.price} | ${category} | ${imageStatus}`);
        updatedCount++;
      }
    } else {
      // Add new product
      const productData = {
        name: prod.name,
        price: prod.price,
        image: imageUrl,
        category: category,
        batch: 'best',
        link: affLink,
        itemId: prod.itemId,
        clicks: 0,
        isPinned: false
      };
      try {
        await Product.create(productData);
        const imageStatus = productImage ? '📷' : '⚠️ no img';
        console.log(`   ✅ Added: $${prod.price} | ${category} | ${imageStatus}`);
        addedCount++;
      } catch (error) {
        console.error(`   ❌ DB Error: ${error.message}`);
      }
    }
    await sleep(200);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`✅ Added new: ${addedCount}`);
  console.log(`🔄 Updated existing: ${updatedCount}`);
  console.log(`⏭️  Skipped (pinned): ${skippedCount}`);
  console.log('='.repeat(60));
  await mongoose.connection.close();
  console.log('\n✅ Done!');
}

run().catch(err => {
  console.error('❌ Critical error:', err);
  process.exit(1);
});
