require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function fixSpacedNames() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Product = mongoose.models.Product || mongoose.model('Product', new mongoose.Schema({
    name: String,
    price: Number,
    image: String,
    category: String,
    link: String
  }, { strict: false }));

  const products = await Product.find({});
  let updatedCount = 0;

  for (let p of products) {
    let originalName = p.name || '';
    let newName = originalName;

    // 1. Specific fix for M A X 2 7 0
    if (newName.includes('M A X 2 7 0')) {
      newName = newName.replace(/M A X 2 7 0/gi, 'Air max 270');
    }

    // 2. Fix spaced single characters: 'S K E P T A' -> 'SKEPTA'
    // This regex looks for 3 or more single word characters separated by a single space
    // and removes the spaces between them.
    newName = newName.replace(/(?<=\b|\s)([A-Za-z0-9])(?:\s+([A-Za-z0-9]))+(?=\b|\s)/g, (match) => {
      return match.replace(/\s+/g, '');
    });

    // 3. Remove trailing dots or dashes (e.g., 'Ess .' -> 'Ess')
    newName = newName.replace(/\s+[\.\-]+$/, '');
    
    // 4. "VINTAG" to "Vintage"
    if (newName === 'VINTAG') newName = 'Vintage';
    
    // 5. Clean up any accidental double spaces
    newName = newName.replace(/\s{2,}/g, ' ').trim();

    if (newName !== originalName) {
      console.log(`Fixing: "${originalName}" -> "${newName}"`);
      await Product.updateOne({ _id: p._id }, { $set: { name: newName } });
      updatedCount++;
    }
  }

  // Find completely broken names (only punctuation/symbols)
  const brokenProducts = await Product.find({ name: /^[^A-Za-z0-9]+$/ });
  console.log(`\nFound ${brokenProducts.length} products with broken names (e.g. '---', '.').`);
  
  if (brokenProducts.length > 0) {
      console.log("Deleting products with completely broken names...");
      const result = await Product.deleteMany({ name: /^[^A-Za-z0-9]+$/ });
      console.log(`Deleted ${result.deletedCount} broken products.`);
  }

  console.log(`\nUpdated ${updatedCount} products.`);
  await mongoose.connection.close();
}

fixSpacedNames();
