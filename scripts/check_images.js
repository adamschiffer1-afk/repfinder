const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const ProductSchema = new mongoose.Schema({
  name: String, price: Number, category: String, link: String,
  image: String, batch: String, isPinned: Boolean,
}, { timestamps: true });
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);

  // Show first 20 products and their image URLs
  const products = await Product.find({}).sort({ createdAt: 1 }).limit(30);
  for (const p of products) {
    console.log(`${p.name.substring(0, 35).padEnd(35)} | ${p.image ? p.image.substring(0, 80) : 'BRAK'}`);
  }
  process.exit(0);
}
run();
