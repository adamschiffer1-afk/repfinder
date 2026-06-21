require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function checkNames() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Product = mongoose.models.Product || mongoose.model('Product', new mongoose.Schema({}, { strict: false }));
  
  // Find products with spaced letters like "M A X" or just dashes "---"
  const spaced = await Product.find({ name: /(?:[A-Za-z0-9]\s){2,}[A-Za-z0-9]/ }).limit(20);
  console.log(`Found ${spaced.length} spaced names:`);
  spaced.forEach(p => console.log(`- "${p.name}"`));
  
  const dashed = await Product.find({ name: /^-+$/ }).limit(20);
  console.log(`\nFound ${dashed.length} dashed names:`);
  dashed.forEach(p => console.log(`- "${p.name}"`));

  const otherWeird = await Product.find({ name: /[^A-Za-z0-9\s\-]/ }).limit(20);
  console.log(`\nFound ${otherWeird.length} names with special chars:`);
  otherWeird.forEach(p => console.log(`- "${p.name}"`));
  
  await mongoose.connection.close();
}

checkNames();
