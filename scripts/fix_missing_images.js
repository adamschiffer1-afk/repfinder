const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

const ProductSchema = new mongoose.Schema({
  name: String, price: Number, category: String, link: String,
  image: String, batch: String, isPinned: Boolean, clicks: Number, qcImages: [String],
}, { timestamps: true });
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

function decodeHtmlEntities(str) {
  return str
    .replace(/&#34;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function extractWeidianItemId(link) {
  try {
    const urlMatch = link.match(/url=([^&]+)/);
    if (!urlMatch) return null;
    const decoded = decodeURIComponent(urlMatch[1]);
    const idMatch = decoded.match(/itemID=(\d+)/);
    return idMatch ? idMatch[1] : null;
  } catch (e) { return null; }
}

function isBrokenImageUrl(url) {
  if (!url || url.trim() === '') return true;
  // Ends with _80 (without extension) - known broken pattern
  if (/_\d+$/.test(url) && !url.match(/\.(jpg|jpeg|png|webp|gif)$/i)) return true;
  // Too short to be a real image URL
  if (url.length < 30) return true;
  return false;
}

async function fetchWeidianImage(itemId) {
  try {
    const resp = await axios.get(`https://weidian.com/item.html?itemID=${itemId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Referer': 'https://weidian.com/',
      },
      timeout: 25000,
    });

    const html = resp.data;

    // Primary: parse data-obj JSON from script tag
    const dataObjMatch = html.match(/id="__rocker-render-inject__"\s+data-obj="([^"]+)"/);
    if (dataObjMatch) {
      const decoded = decodeHtmlEntities(dataObjMatch[1]);
      const json = JSON.parse(decoded);
      const itemInfo = json?.result?.default_model?.item_info;
      if (itemInfo) {
        const imgs = itemInfo.imgs || [];
        const img = (typeof imgs[0] === 'string' ? imgs[0] : imgs[0]?.url) || '';
        if (img && img.match(/\.(jpg|jpeg|png|webp)/i)) return img;
        if (img) return img + (img.includes('?') ? '' : '.jpg');
      }
    }

    // Fallback: pcitem URLs with full extension
    const imgUrls = html.match(/https:\/\/si\.geilicdn\.com\/pcitem[^"'\s,)>]+\.(jpg|jpeg|png|webp)/gi) || [];
    if (imgUrls.length > 0) return imgUrls[0];

    return null;
  } catch (e) {
    return null;
  }
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Połączono z MongoDB\n');

  // Find all products with kakobuy links (both old and new)
  const allProducts = await Product.find({ link: /kakobuy\.com/ });
  
  const toFix = allProducts.filter(p => isBrokenImageUrl(p.image));
  console.log(`📊 Wszystkich produktów: ${allProducts.length}`);
  console.log(`🔧 Do naprawy (zepsute URL): ${toFix.length}\n`);

  if (toFix.length === 0) {
    console.log('Brak produktów do naprawy!');
    console.log('\nPrzykłady URL z bazy:');
    allProducts.slice(0, 5).forEach(p => {
      console.log(`  ${p.name.substring(0,30)} → ${p.image ? p.image.substring(0, 80) : 'BRAK'}`);
    });
    process.exit(0);
  }

  let fixed = 0;
  let failed = 0;

  for (let i = 0; i < toFix.length; i++) {
    const p = toFix[i];
    const itemId = extractWeidianItemId(p.link);

    if (!itemId) {
      console.log(`⚠️  [${i+1}/${toFix.length}] Brak itemID dla: ${p.name.substring(0,35)}`);
      failed++;
      continue;
    }

    process.stdout.write(`[${i+1}/${toFix.length}] ${p.name.substring(0,35).padEnd(35)} → `);
    const imgUrl = await fetchWeidianImage(itemId);

    if (imgUrl) {
      await Product.updateOne({ _id: p._id }, { $set: { image: imgUrl } });
      console.log(`✅ ${imgUrl.substring(0, 70)}`);
      fixed++;
    } else {
      console.log(`❌ Błąd pobrania`);
      failed++;
    }

    await sleep(1200);
  }

  console.log(`\n✨ Gotowe! Naprawiono: ${fixed}/${toFix.length}, Błędy: ${failed}`);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
