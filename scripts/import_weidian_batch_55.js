// scripts/import_weidian_batch_55.js
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
const { detectCategory } = require('../src/utils/categoryHelper');

// Mongoose Schema definition matching src/models/Product.js
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
  qcImages: { type: [String], default: [] }
}, { timestamps: true });

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

const AFFILIATE_CODE = 'xfrostyy';

const WEIDIAN_URLS = [
  'https://weidian.com/item.html?itemID=7772191785&spider_token=82d4',
  'https://weidian.com/item.html?itemID=7775148066&spider_token=74f6',
  'https://weidian.com/item.html?itemID=7772118463&spider_token=934f',
  'https://weidian.com/item.html?itemID=7772103113&spider_token=7c34',
  'https://weidian.com/item.html?itemID=7775037146&spider_token=9192',
  'https://weidian.com/item.html?itemID=7772171891&spider_token=7f4b',
  'https://weidian.com/item.html?itemID=7775008666&spider_token=d9cd',
  'https://weidian.com/item.html?itemID=7772175843&spider_token=57d1',
  'https://weidian.com/item.html?itemID=7771937209&spider_token=8b51',
  'https://weidian.com/item.html?itemID=7775071450&spider_token=0d10',
  'https://weidian.com/item.html?itemID=7772081447&spider_token=1b09',
  'https://weidian.com/item.html?itemID=7775183634&spider_token=eb10',
  'https://weidian.com/item.html?itemID=7775138304&spider_token=447a',
  'https://weidian.com/item.html?itemID=7775169818&spider_token=f1f2',
  'https://weidian.com/item.html?itemID=7772108831&spider_token=4c62',
  'https://weidian.com/item.html?itemID=7775138302&spider_token=e28b',
  'https://weidian.com/item.html?itemID=7775177678&spider_token=40e3',
  'https://weidian.com/item.html?itemID=7775071442&spider_token=ac4d',
  'https://weidian.com/item.html?itemID=7775108334&spider_token=44b1',
  'https://weidian.com/item.html?itemID=7772191635&spider_token=e8a3',
  'https://weidian.com/item.html?itemID=7772095167&spider_token=083d',
  'https://weidian.com/item.html?itemID=7775171768&spider_token=4fd4',
  'https://weidian.com/item.html?itemID=7772171869&spider_token=cecb',
  'https://weidian.com/item.html?itemID=7772108827&spider_token=14f7',
  'https://weidian.com/item.html?itemID=7775078300&spider_token=a8b8',
  'https://weidian.com/item.html?itemID=7775029012&spider_token=02c6',
  'https://weidian.com/item.html?itemID=7772081429&spider_token=de86',
  'https://weidian.com/item.html?itemID=7772122635&spider_token=a3fd',
  'https://weidian.com/item.html?itemID=7772102931&spider_token=4575',
  'https://weidian.com/item.html?itemID=7775053588&spider_token=7cf8',
  'https://weidian.com/item.html?itemID=7775098818&spider_token=893f',
  'https://weidian.com/item.html?itemID=7775159794&spider_token=bbcb',
  'https://weidian.com/item.html?itemID=7772047017&spider_token=3752',
  'https://weidian.com/item.html?itemID=7772183725&spider_token=99dd',
  'https://weidian.com/item.html?itemID=7775096878&spider_token=696f',
  'https://weidian.com/item.html?itemID=7775116554&spider_token=2c2b',
  'https://weidian.com/item.html?itemID=7772193603&spider_token=2137',
  'https://weidian.com/item.html?itemID=7775153932&spider_token=a5bc',
  'https://weidian.com/item.html?itemID=7772063579&spider_token=52e0',
  'https://weidian.com/item.html?itemID=7775124454&spider_token=43ae',
  'https://weidian.com/item.html?itemID=7772183719&spider_token=f5b2',
  'https://weidian.com/item.html?itemID=7772077395&spider_token=0971',
  'https://weidian.com/item.html?itemID=7775124450&spider_token=2669',
  'https://weidian.com/item.html?itemID=7772193599&spider_token=be45',
  'https://weidian.com/item.html?itemID=7772193597&spider_token=0445',
  'https://weidian.com/item.html?itemID=7775075390&spider_token=778e',
  'https://weidian.com/item.html?itemID=7772130575&spider_token=99d5',
  'https://weidian.com/item.html?itemID=7772156101&spider_token=f498',
  'https://weidian.com/item.html?itemID=7772140425&spider_token=d5e9',
  'https://weidian.com/item.html?itemID=7772091345&spider_token=f7eb',
  'https://weidian.com/item.html?itemID=7775181630&spider_token=6aec',
  'https://weidian.com/item.html?itemID=7772169807&spider_token=38f8',
  'https://weidian.com/item.html?itemID=7772118345&spider_token=2aac',
  'https://weidian.com/item.html?itemID=7772091339&spider_token=c375',
  'https://weidian.com/item.html?itemID=7771903249&spider_token=3420'
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set in environment or .env.local!");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(uri);
  console.log("Connected successfully!");

  // Get next pinned order
  const highestPinned = await Product.findOne({ isPinned: true }).sort({ pinnedOrder: -1 }).exec();
  let nextPinnedOrder = highestPinned && highestPinned.pinnedOrder !== null ? highestPinned.pinnedOrder + 1 : 1;
  console.log(`Starting pinnedOrder numbering at: ${nextPinnedOrder}`);

  let successCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < WEIDIAN_URLS.length; i++) {
    const rawUrl = WEIDIAN_URLS[i];
    console.log(`\n[${i + 1}/${WEIDIAN_URLS.length}] Processing: ${rawUrl}`);

    const itemIdMatch = rawUrl.match(/itemID=(\d+)/) || rawUrl.match(/item\/(\d+)/);
    if (!itemIdMatch) {
      console.error("Invalid URL format, skipping.");
      failedCount++;
      continue;
    }

    const itemId = itemIdMatch[1];
    const cleanUrl = `https://weidian.com/item.html?itemID=${itemId}`;
    const affLink = `https://www.kakobuy.com/item/details?url=${encodeURIComponent(cleanUrl)}&affcode=${AFFILIATE_CODE}`;

    // Check if duplicate exists
    const duplicate = await Product.findOne({ link: new RegExp(`itemID=${itemId}`) }).exec();
    if (duplicate) {
      console.log(`Product with itemId ${itemId} already exists: "${duplicate.name}"`);
      duplicate.isPinned = true;
      duplicate.pinnedOrder = nextPinnedOrder++;
      await duplicate.save();
      console.log(`Updated existing product to be pinned (order #${duplicate.pinnedOrder})`);
      skippedCount++;
      continue;
    }

    // Scrape from Weidian
    let retries = 3;
    let dataObj = null;

    while (retries > 0) {
      try {
        const response = await axios.get(cleanUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
          },
          timeout: 8000
        });

        const $ = cheerio.load(response.data);
        const scriptTag = $('#__rocker-render-inject__');

        if (scriptTag.length === 0) {
          throw new Error("Bot protection / rocker-render-inject script tag not found.");
        }

        dataObj = JSON.parse(scriptTag.attr('data-obj'));
        break;
      } catch (err) {
        retries--;
        console.warn(`Attempt failed for ${itemId}. Retries left: ${retries}. Error: ${err.message}`);
        if (retries > 0) await sleep(1500);
      }
    }

    if (!dataObj || !dataObj.result || !dataObj.result.default_model) {
      console.error(`Failed to scrape product info for ${itemId} after retries.`);
      failedCount++;
      continue;
    }

    try {
      const itemInfo = dataObj.result.default_model.item_info;
      const itemName = itemInfo.item_name;
      const originPrice = parseFloat(itemInfo.origin_price) || 0;
      const priceUSD = parseFloat((originPrice * 0.14).toFixed(2));

      let img = itemInfo.item_head || '';
      if (img) {
        if (img.startsWith('//')) {
          img = `https:${img}`;
        } else if (!img.startsWith('http')) {
          img = `https://${img}`;
        }
        if (!img.includes('?')) {
          img = `${img}?w=400&h=400`;
        }
      }

      const productCategory = detectCategory(itemName);

      const newProduct = await Product.create({
        name: itemName,
        price: priceUSD,
        image: img,
        category: productCategory,
        batch: 'best',
        link: affLink,
        isPinned: true,
        pinnedOrder: nextPinnedOrder++
      });

      console.log(`Successfully added product: "${newProduct.name}"`);
      console.log(`Price: $${newProduct.price} | Category: ${newProduct.category} | Pinned Order: #${newProduct.pinnedOrder}`);

      successCount++;
    } catch (createErr) {
      console.error(`Error saving product for ${itemId} into DB:`, createErr);
      failedCount++;
    }

    await sleep(1000);
  }

  console.log("\n-------------------------");
  console.log(`Batch process finished!`);
  console.log(`Successfully Added: ${successCount}`);
  console.log(`Updated / Staged (Already Existed): ${skippedCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log("-------------------------");

  await mongoose.disconnect();
  console.log("Disconnected from MongoDB.");
}

run().catch(err => {
  console.error("Critical error in batch script:", err);
});
