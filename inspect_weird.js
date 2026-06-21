require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function inspectWeirdProducts() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Product = mongoose.models.Product || mongoose.model('Product', new mongoose.Schema({}, { strict: false }));
  
  const weird = await Product.find({ name: /^[\.\-\s（）]+$/ }).limit(10);
  console.log(`Found ${weird.length} weird names:`);
  weird.forEach(p => {
    console.log(`- ID: ${p._id}, Name: "${p.name}", Link: ${p.link}, Category: ${p.category}`);
  });

  const max270 = await Product.findOne({ name: /M A X 2 7 0/ });
  if (max270) {
    console.log(`\nM A X 2 7 0 -> Link: ${max270.link}, Category: ${max270.category}`);
  }

  await mongoose.connection.close();
}

inspectWeirdProducts();
