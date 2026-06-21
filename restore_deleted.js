require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const fs = require('fs');

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

async function restoreDeletedProducts() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Read backup
  const backup = JSON.parse(fs.readFileSync('scratch/backup_products_before_import.json', 'utf-8'));
  console.log(`Backup contains ${backup.length} products`);

  // Get current products links (to find which ones are missing)
  const currentProducts = await Product.find({}, { link: 1, itemId: 1 });
  const currentLinks = new Set(currentProducts.map(p => p.link));
  const currentItemIds = new Set(currentProducts.map(p => p.itemId).filter(Boolean));

  // Find products in backup that are no longer in DB (the ones deleted)
  const missingProducts = backup.filter(p => {
    return !currentLinks.has(p.link) && (!p.itemId || !currentItemIds.has(p.itemId));
  });

  console.log(`Found ${missingProducts.length} products to restore`);

  let restoredCount = 0;
  for (const p of missingProducts) {
    try {
      // Remove _id so Mongo assigns a new one (avoids conflicts)
      const { _id, __v, createdAt, updatedAt, ...productData } = p;
      await Product.create(productData);
      console.log(`✅ Restored: "${p.name}"`);
      restoredCount++;
    } catch (err) {
      console.error(`❌ Failed to restore "${p.name}": ${err.message}`);
    }
  }

  console.log(`\nRestored ${restoredCount} products.`);
  await mongoose.connection.close();
}

restoreDeletedProducts();
