require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function findProducts() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Product = mongoose.models.Product || mongoose.model('Product', new mongoose.Schema({}, { strict: false }));
  
  const names = ["Amiri Coat", "Dior 30", "VINTAG", "TN", "Ess .", "Prada Loafers", "M A X 2 7 0"];
  
  for (const n of names) {
    const products = await Product.find({ name: new RegExp(n.replace(/\./g, '\\.'), 'i') }).limit(3);
    console.log(`\nSearching for: ${n}`);
    products.forEach(p => console.log(`- ID: ${p._id}, Name: "${p.name}", Price: ${p.price}`));
  }

  // Also let's find any product with name containing "-" and no letters
  const dashes = await Product.find({ name: /^[^a-zA-Z0-9]+$/ }).limit(10);
  console.log(`\nProducts with NO letters/numbers (just dashes, dots, etc):`);
  dashes.forEach(p => console.log(`- ID: ${p._id}, Name: "${p.name}", Price: ${p.price}`));

  await mongoose.connection.close();
}

findProducts();
