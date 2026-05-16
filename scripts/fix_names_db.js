const axios = require('axios');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
const { detectCategory } = require('../src/utils/categoryHelper');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

const ProductSchema = new mongoose.Schema({
  name: String,
  price: Number,
  category: String,
  link: String,
  image: String,
  batch: String,
  createdAt: { type: Date, default: Date.now },
});
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

// Same mapping as in scrape_multi.js
const VARIANT_TYPE_MAP = [
    { keywords: ['卫衣', '连帽卫衣', 'hoodie', 'hoody', 'sweatshirt', 'bluza', '上衣外套'], type: 'hoodies', label: 'Hoodie' },
    { keywords: ['卫裤', '运动裤', '长裤', 'pants', 'trousers', 'joggers', 'sweatpants', 'spodnie'], type: 'pants', label: 'Pants' },
    { keywords: ['短裤', 'shorts', 'spodenki'], type: 'shorts', label: 'Shorts' },
    { keywords: ['t恤', 't-shirt', 'tshirt', 'shirt', 'koszulka', '上衣'], type: 't-shirts', label: 'T-shirt' },
    { keywords: ['外套', '夹克', 'jacket', 'coat', 'kurtka'], type: 'jackets', label: 'Jacket' },
];

function adjustProductName(baseName, variantLabel) {
    if (!variantLabel) return baseName;
    const low = variantLabel.toLowerCase();

    const variantType = VARIANT_TYPE_MAP.find(entry =>
        entry.keywords.some(kw => low.includes(kw.toLowerCase()))
    );
    if (!variantType) return baseName;

    const baseType = VARIANT_TYPE_MAP.find(entry =>
        entry.keywords.some(kw => baseName.toLowerCase().includes(kw.toLowerCase()))
    );

    if (baseType && baseType.type === variantType.type) return baseName;

    let newName = baseName;
    if (baseType) {
        const regex = new RegExp(`\\b${baseType.label}\\b`, 'gi');
        newName = newName.replace(regex, variantType.label).trim();
    } else {
        newName = `${baseName} ${variantType.label}`;
    }
    return newName;
}

// Extract Weidian item ID from kakobuy/weidian link
function extractItemId(link) {
    if (!link) return null;
    // Decode URL-encoded kakobuy links like:
    // https://www.kakobuy.com/item/details?url=https%3A%2F%2Fweidian.com%2Fitem.html%3FitemID%3D7511943850
    const decoded = decodeURIComponent(link);
    const match = decoded.match(/itemID=(\d+)/);
    return match ? match[1] : null;
}

// Re-scrape a Weidian item and return map of imgUrl => {name, category}
async function getVariantData(itemId, baseName) {
    const url = `https://weidian.com/item.html?itemID=${itemId}`;
    try {
        const res = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
            },
            timeout: 12000
        });

        const $ = cheerio.load(res.data);
        const scriptTag = $('#__rocker-render-inject__');
        if (scriptTag.length === 0) return null;

        const data = JSON.parse(scriptTag.attr('data-obj'));
        const skuProperties = data.result.default_model.sku_properties;

        // Build a map: stripped image url base → {adjustedName, adjustedCategory}
        const variantMap = {};

        if (skuProperties && skuProperties.attr_list) {
            const imageAttr = skuProperties.attr_list.find(attr =>
                attr.attr_values && attr.attr_values.some(v => v.img)
            );

            if (imageAttr && imageAttr.attr_values) {
                for (const val of imageAttr.attr_values) {
                    if (val.img) {
                        const variantLabel = (val.attr_name || val.name || '').toLowerCase();
                        const adjustedName = adjustProductName(baseName, variantLabel);
                        const adjustedCategory = detectCategory(adjustedName);

                        // Strip query params from image URL for matching
                        const imgBase = val.img.split('?')[0];
                        variantMap[imgBase] = { name: adjustedName, category: adjustedCategory };
                    }
                }
            }
        }

        return variantMap;
    } catch (e) {
        console.error(`  ❌ Failed to scrape ${itemId}: ${e.message}`);
        return null;
    }
}

async function run() {
    console.log('🚀 Starting Name Fix for existing DB products...\n');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // 1. Get all products from DB
    const allProducts = await Product.find({});
    console.log(`📦 Found ${allProducts.length} products in DB`);

    // 2. Group by unique Weidian itemID
    const itemGroups = {};
    for (const prod of allProducts) {
        const itemId = extractItemId(prod.link);
        if (!itemId) continue;
        if (!itemGroups[itemId]) itemGroups[itemId] = [];
        itemGroups[itemId].push(prod);
    }

    const uniqueItems = Object.keys(itemGroups);
    console.log(`🔗 Found ${uniqueItems.length} unique Weidian items to process\n`);

    let updatedCount = 0;
    let processedCount = 0;

    for (const itemId of uniqueItems) {
        const group = itemGroups[itemId];
        // Only bother re-scraping if there are MULTIPLE variants for the same item
        // (single products are fine as they only have 1 image)
        if (group.length <= 1) continue;

        const baseName = group[0].name;
        processedCount++;
        process.stdout.write(`[${processedCount}/${uniqueItems.length}] ${baseName} (${itemId})...`);

        const variantMap = await getVariantData(itemId, baseName);
        if (!variantMap || Object.keys(variantMap).length === 0) {
            console.log(' ⚠️ No variant data');
            await new Promise(r => setTimeout(r, 1000));
            continue;
        }

        let changed = 0;
        for (const prod of group) {
            // Strip query params from stored image for matching
            const imgBase = (prod.image || '').split('?')[0];
            const match = variantMap[imgBase];

            if (match && (match.name !== prod.name || match.category !== prod.category)) {
                await Product.findByIdAndUpdate(prod._id, {
                    name: match.name,
                    category: match.category
                });
                changed++;
                updatedCount++;
            }
        }

        console.log(changed > 0 ? ` ✅ Fixed ${changed} variants` : ' ✓ OK');

        // Delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 1500));
    }

    console.log(`\n🎉 Done! Updated ${updatedCount} products in total.`);
    process.exit(0);
}

run().catch(err => {
    console.error('💥 Fatal error:', err);
    process.exit(1);
});
