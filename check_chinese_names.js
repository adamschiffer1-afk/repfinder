require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

const ProductSchema = new mongoose.Schema({
  name: String,
  isPinned: Boolean
}, { timestamps: true });

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

async function checkChineseNames() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Połączono z MongoDB\n');

    // Find products with Chinese characters
    const allProducts = await Product.find({ 
      $or: [{ isPinned: false }, { isPinned: { $exists: false } }]
    });
    
    const chineseRegex = /[\u4e00-\u9fa5]/;
    const productsWithChinese = allProducts.filter(p => chineseRegex.test(p.name)).slice(0, 50);

    console.log(`🔍 Znaleziono ${productsWithChinese.length} produktów z chińskimi znakami:\n`);
    
    productsWithChinese.forEach((product, index) => {
      console.log(`${index + 1}. "${product.name}"`);
    });

    const totalChinese = allProducts.filter(p => chineseRegex.test(p.name)).length;

    console.log(`\n📊 Łącznie produktów z chińskimi znakami: ${totalChinese}`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Błąd:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

checkChineseNames();
