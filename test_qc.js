require('dotenv').config({ path: '.env.local' });

async function testQc() {
  const mongoose = require('mongoose');
  await mongoose.connect(process.env.MONGODB_URI);
  const Product = mongoose.models.Product || mongoose.model('Product', new mongoose.Schema({}, { strict: false }));
  
  const product = await Product.findOne({ name: /Jordan 4/i });
  if (!product) {
    console.log("Product not found");
  } else {
    console.log("Product found! Link:", product.link);
    const apiUrl = `http://localhost:3000/api/qc?url=${encodeURIComponent(product.link)}`;
    console.log("Fetching API:", apiUrl);
    try {
      const res = await fetch(apiUrl);
      const data = await res.json();
      console.log("Response:", JSON.stringify(data, null, 2));
    } catch(err) {
      console.error(err);
    }
  }
  await mongoose.connection.close();
}

testQc();
