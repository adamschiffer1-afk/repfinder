require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function testDB() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Product = mongoose.models.Product || mongoose.model('Product', new mongoose.Schema({}, { strict: false }));
  
  const product = await Product.findOne({ name: /Jordan 4/i, price: 128.71 });
  if (product) {
    console.log("Product found:", product.name);
    console.log("qcImages type:", typeof product.qcImages);
    console.log("qcImages length:", product.qcImages ? product.qcImages.length : 'N/A');
    console.log("qcImages details:", JSON.stringify(product.qcImages, null, 2));
  } else {
    console.log("Product not found");
  }
  await mongoose.connection.close();
}

testDB();
