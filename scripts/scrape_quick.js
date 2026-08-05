const axios = require('axios');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: Number,
  category: String,
  link: String,
  image: String,
  batch: String,
  createdAt: { type: Date, default: Date.now },
});
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

const AFFILIATE_CODE = 'xfrostyy';

const EXTRA_LINKS = [
  { id: '7757965616', name: 'Nike elite bag' },
  { id: '7510076206', name: 'burberry hoodie' },
  { id: '7510860862', name: 'casablanca t-shirt' },
  { id: '7512270409', name: 'casablanca shorts' },
  { id: '7757924266', name: 'jordan shorts' }
];

const { detectCategory } = require('../src/utils/categoryHelper');

async function scrape(itemId, customName) {
    console.log(`\n🔍 Szybki scraping: ${customName} (${itemId})...`);
    const url = `https://weidian.com/item.html?itemID=${itemId}`;
    try {
        const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(res.data);
        const scriptTag = $('#__rocker-render-inject__');
        if (scriptTag.length === 0) return [];
        const data = JSON.parse(scriptTag.attr('data-obj'));
        const itemInfo = data.result.default_model.item_info;
        const baseName = customName || itemInfo.item_name;
        const priceUSD = (parseFloat(itemInfo.origin_price) * 0.14).toFixed(2);

        const skuProperties = data.result.default_model.sku_properties;
        const variants = [];

        if (skuProperties && skuProperties.attr_list) {
            const imageAttr = skuProperties.attr_list.find(attr => attr.attr_values && attr.attr_values.some(v => v.img));
            if (imageAttr) {
                for (const val of imageAttr.attr_values) {
                    if (val.img) {
                        variants.push({
                            name: baseName,
                            price: parseFloat(priceUSD),
                            image: `${val.img}?w=400&h=400`,
                            category: detectCategory(baseName),
                            batch: 'best',
                            link: `https://www.kakobuy.com/item/details?url=${encodeURIComponent(url)}&affcode=${AFFILIATE_CODE}`
                        });
                    }
                }
            }
        }
        if (variants.length === 0) {
            variants.push({
                name: baseName,
                price: parseFloat(priceUSD),
                image: `${itemInfo.item_head}?w=400&h=400`,
                category: detectCategory(baseName),
                batch: 'best',
                link: `https://www.kakobuy.com/item/details?url=${encodeURIComponent(url)}&affcode=${AFFILIATE_CODE}`
            });
        }
        return variants;
    } catch (e) {
        console.error(`❌ Błąd: ${e.message}`);
        return [];
    }
}

async function run() {
    await mongoose.connect(MONGODB_URI);
    for (const item of EXTRA_LINKS) {
        const variants = await scrape(item.id, item.name);
        for (const v of variants) {
            await Product.create(v);
        }
        console.log(`✅ Dodano: ${item.name}`);
    }
    console.log('\n✨ Wszystkie 5 produktów dodane!');
    process.exit(0);
}
run();
