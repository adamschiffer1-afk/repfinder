require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function checkQC() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Product = mongoose.models.Product || mongoose.model('Product', new mongoose.Schema({}, { strict: false }));
  
  const product = await Product.findOne({ name: /Jordan 4/i });
  console.log("Jordan 4 product details:");
  if (product) {
    console.log("Name:", product.name);
    console.log("Link:", product.link);
    console.log("QC Images length:", product.qcImages ? product.qcImages.length : 0);
  }
  
  // Find ANY product with qcImages > 0
  const productWithQC = await Product.findOne({ qcImages: { $exists: true, $not: { $size: 0 } } });
  if (productWithQC) {
    console.log("\nFound a product with local QC:");
    console.log("Name:", productWithQC.name);
    console.log("QC Images:", productWithQC.qcImages);
  } else {
    console.log("\nNo products have local QC images in the DB.");
  }

  await mongoose.connection.close();
}

checkQC();
