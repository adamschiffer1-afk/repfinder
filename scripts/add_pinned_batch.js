// scripts/add_pinned_batch.js
// Adds 3 new pinned products to MongoDB
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });
const { detectCategory } = require('../src/utils/categoryHelper');

const AFFCODE = 'xfrostyy';
const CNY_TO_USD = 0.14;

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String, required: true },
  category: { type: String, required: true },
  batch: { type: String, default: 'best' },
  link: { type: String, required: true },
  clicks: { type: Number, default: 0 },
  isPinned: { type: Boolean, default: false },
  pinnedOrder: { type: Number, default: null },
  qcImages: { type: [String], default: [] }
}, { timestamps: true });

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

// Products to add (scraped from Weidian)
const newItems = [
  {
    itemId: '7772077395',
    name: 'Gradient Underwear Pack',
    priceInCny: 61,
    image: 'https://si.geilicdn.com/pcitem901883166076-2ee6000001915f2368510a207569_800_800.jpg',
    category: 'accessories',
  },
  {
    itemId: '7772081447',
    name: 'Gradient Letter Print Couple T-Shirt',
    priceInCny: 113,
    image: 'https://si.geilicdn.com/pcitem1965899906-4e540000019c9899975a0a2396f4_4000_4000.jpg',
    category: 't-shirts',
  },
  {
    itemId: '7775008666',
    name: 'Print Couple Short Sleeve T-Shirt',
    priceInCny: 120,
    image: 'https://si.geilicdn.com/pcitem901898590714-15130000019468cfe8a30a2304aa_800_800.jpg',
    category: 't-shirts',
  }
];

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Połączono z MongoDB');

  // Get highest pinnedOrder from DB
  const highestPinned = await Product.findOne({ isPinned: true }).sort({ pinnedOrder: -1 }).lean();
  let nextPinnedOrder = (highestPinned && highestPinned.pinnedOrder != null)
    ? highestPinned.pinnedOrder + 1
    : 1;
  console.log(`Starting pinnedOrder at: ${nextPinnedOrder}`);

  for (const item of newItems) {
    const link = `https://www.kakobuy.com/item/details?url=${encodeURIComponent(`https://weidian.com/item.html?itemID=${item.itemId}`)}&affcode=${AFFCODE}`;
    const priceUSD = parseFloat((item.priceInCny * CNY_TO_USD).toFixed(2));

    // Check if already exists
    const existing = await Product.findOne({ link: new RegExp(`itemID=${item.itemId}`) });
    if (existing) {
      console.log(`⚠️  Already exists: "${existing.name}", updating isPinned & pinnedOrder...`);
      existing.isPinned = true;
      existing.pinnedOrder = nextPinnedOrder++;
      await existing.save();
      console.log(`  → Updated to pinnedOrder #${existing.pinnedOrder}`);
      continue;
    }

    await Product.create({
      name: item.name,
      price: priceUSD,
      image: item.image,
      category: item.category,
      batch: 'best',
      link,
      isPinned: true,
      pinnedOrder: nextPinnedOrder++,
      clicks: 0,
      qcImages: [],
    });
    console.log(`✅ Added: "${item.name}" | $${priceUSD} | category: ${item.category} | pinnedOrder: #${nextPinnedOrder - 1}`);
  }

  console.log('\n✨ Gotowe!');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
