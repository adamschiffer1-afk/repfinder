require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function checkQC() {
  await mongoose.connect(process.env.MONGODB_URI);
  const col = mongoose.connection.collection('products');
  
  const productWithQC = await col.findOne({ $and: [ { qcImages: { $exists: true } }, { qcImages: { $ne: [] } }, { qcImages: { $ne: null } } ] });
  
  if (productWithQC) {
    console.log("\nFound a product with local QC:");
    console.log("Name:", productWithQC.name);
    console.log("Link:", productWithQC.link);
    console.log("QC Images length:", productWithQC.qcImages.length);
  } else {
    console.log("\nNo products have local QC images in the DB.");
  }

  await mongoose.connection.close();
}

checkQC();
