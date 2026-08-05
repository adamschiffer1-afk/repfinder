// scripts/set_pinned_batch_budget.js
// Sets batch: 'budget' for ALL pinned products
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const ProductSchema = new mongoose.Schema({
  name: String, price: Number, category: String, link: String,
  image: String, batch: String, isPinned: Boolean, clicks: Number,
  qcImages: [String], pinnedOrder: Number,
}, { timestamps: true });
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Połączono z MongoDB');

  const result = await Product.updateMany(
    { isPinned: true },
    { $set: { batch: 'budget' } }
  );

  console.log(`✨ Zaktualizowano ${result.modifiedCount} przypiętych produktów → batch: 'budget'`);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
