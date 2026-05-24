const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config({ path: '.env.local' });
const { detectCategory } = require('../src/utils/categoryHelper');

const MONGODB_URI = process.env.MONGODB_URI;
const AFFCODE = 'xfrostyy';
// 1 CNY ≈ 0.137 USD (rough conversion)
const CNY_TO_USD = 0.137;

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: Number,
  category: String,
  link: String,
  image: String,
  batch: { type: String, enum: ['best', 'budget', 'random'], default: 'random' },
  isPinned: { type: Boolean, default: false },
  clicks: { type: Number, default: 0 },
  qcImages: { type: [String], default: [] },
}, { timestamps: true });

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

// Lista Weidian itemID w kolejności podanej przez użytkownika
const weidianItemIds = [
  '7768964356', '7765938955', '7765944855', '7768974132', '7769003888',
  '7768970284', '7768893560', '7765954171', '7765942871', '7768913208',
  '7765915371', '7768974134', '7766003953', '7769003890', '7768964372',
  '7766007905', '7765948737', '7768950510', '7768905364', '7766005793',
  '7765851545', '7768988102', '7768901436', '7765925131', '7766015881',
  '7768925008', '7765942883', '7768962396', '7765948743', '7768913216',
  '7765972395', '7766025667', '7765990147', '7765915365', '7765911439',
  '7768980152', '7765970411', '7768970294', '7769013674', '7765851553',
  '7769009736', '7768917118', '7768950518', '7768923046'
];

function decodeHtmlEntities(str) {
  return str
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

async function scrapeWeidianItem(itemId) {
  const url = `https://weidian.com/item.html?itemID=${itemId}`;

  try {
    const resp = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Referer': 'https://weidian.com/',
      },
      timeout: 25000,
    });

    const html = resp.data;

    // Data is embedded in script tag with id="__rocker-render-inject__" as data-obj attribute
    // The JSON is HTML-entity-encoded
    const dataObjMatch = html.match(/id="__rocker-render-inject__"\s+data-obj="([^"]+)"/);
    if (dataObjMatch) {
      const decoded = decodeHtmlEntities(dataObjMatch[1]);
      const json = JSON.parse(decoded);
      const itemInfo = json?.result?.default_model?.item_info;

      if (itemInfo) {
        // Name: itemShareDesc is short English name, use it. Fallback to Chinese name.
        const name = itemInfo.itemShareDesc || itemInfo.item_name || itemInfo.name || `Product ${itemId}`;
        // Price: itemLowPrice is in fen (1/100 CNY)
        const priceInFen = itemInfo.itemLowPrice || 0;
        const priceUSD = Math.round((priceInFen / 100 * CNY_TO_USD) * 100) / 100;
        // Images: imgs array contains full URLs
        const imgs = itemInfo.imgs || [];
        const firstImage = (typeof imgs[0] === 'string' ? imgs[0] : imgs[0]?.url) || '';

        return { name, priceUSD, firstImage };
      }
    }

    // Fallback: extract image URLs from HTML directly
    const imgUrls = [...new Set(html.match(/https:\/\/si\.geilicdn\.com\/pcitem[^"'\s,)>]+\.jpg/gi) || [])];
    if (imgUrls.length > 0) {
      // Try to get a name from itemShareDesc pattern in raw HTML
      const shareDescMatch = html.match(/"itemShareDesc"\s*:\s*"([^"]+)"/);
      const priceFenMatch = html.match(/"itemLowPrice"\s*:\s*(\d+)/);
      const name = shareDescMatch ? shareDescMatch[1] : `Product ${itemId}`;
      const priceUSD = priceFenMatch ? Math.round((parseInt(priceFenMatch[1]) / 100 * CNY_TO_USD) * 100) / 100 : 0;
      return { name, priceUSD, firstImage: imgUrls[0] };
    }

    return null;
  } catch (e) {
    console.error(`  ❌ Scrape error for ${itemId}: ${e.message}`);
    return null;
  }
}

function buildKakobuyLink(itemId) {
  const weidianUrl = encodeURIComponent(`https://weidian.com/item.html?itemID=${itemId}`);
  return `https://www.kakobuy.com/item/details?url=${weidianUrl}&affcode=${AFFCODE}`;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Połączono z MongoDB');

  let imported = 0;
  let failed = 0;

  for (let i = 0; i < weidianItemIds.length; i++) {
    const itemId = weidianItemIds[i];
    console.log(`\n[${i + 1}/${weidianItemIds.length}] Scrapuję itemID: ${itemId}...`);

    const data = await scrapeWeidianItem(itemId);

    if (!data) {
      console.error(`  ❌ Nie udało się pobrać danych dla ${itemId}, pomijam.`);
      failed++;
      await sleep(1500);
      continue;
    }

    const { name, priceUSD, firstImage } = data;
    const category = detectCategory(name);
    const link = buildKakobuyLink(itemId);

    // Sprawdź czy produkt już istnieje po linku
    const exists = await Product.findOne({ link });
    if (exists) {
      console.log(`  ⏭️  Już istnieje: ${name}`);
      imported++;
      await sleep(500);
      continue;
    }

    try {
      await Product.create({
        name: name.substring(0, 60),
        price: priceUSD,
        category,
        link,
        image: firstImage,
        batch: 'random',
        isPinned: false,
        clicks: 0,
        qcImages: [],
      });
      console.log(`  ✅ ${name.substring(0, 45)} | cat: ${category} | $${priceUSD} | 📸 ${firstImage ? 'OK' : 'BRAK'}`);
      imported++;
    } catch (err) {
      console.error(`  ❌ Błąd zapisu do DB: ${err.message}`);
      failed++;
    }

    // Krókie opóźnienie między requestami
    await sleep(1500);
  }

  console.log(`\n✨ Import zakończony! Zaimportowano: ${imported}, Błędy: ${failed}`);
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Krytyczny błąd:', err);
  process.exit(1);
});
