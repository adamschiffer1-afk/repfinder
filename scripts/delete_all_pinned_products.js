// scripts/delete_all_pinned_products.js
// Deletes ALL products where isPinned is true from MongoDB
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

  const pinnedCount = await Product.countDocuments({ isPinned: true });
  console.log(`🔍 Znaleziono ${pinnedCount} przypiętych produktów do usunięcia.`);

  if (pinnedCount > 0) {
    const result = await Product.deleteMany({ isPinned: true });
    console.log(`🗑️ Pomyślnie usunięto ${result.deletedCount} przypiętych produktów z MongoDB.`);
  } else {
    console.log('ℹ️ Brak przypiętych produktów do usunięcia.');
  }

  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
