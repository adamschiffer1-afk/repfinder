// Fix Product Names Script - Updates only product names based on new brand mapping
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String, required: true },
  category: { type: String, required: true },
  batch: { type: String, default: 'random' },
  link: { type: String, required: true },
  clicks: { type: Number, default: 0 },
  isPinned: { type: Boolean, default: false },
  pinnedOrder: { type: Number, default: null },
  qcImages: { type: [String], default: [] },
  slug: { type: String, unique: true, sparse: true },
  itemId: { type: String, unique: true, sparse: true }
}, { timestamps: true });

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

// UPDATED BRAND MAP with fixes
const BRAND_FIXES = {
  // Purple Brand fix
  'Puma': 'Purple Brand',
  // Gucci variations
  'G.U': 'Gucci',
  'GU': 'Gucci',
  // Yeezy fix
  'YZ': 'Yeezy',
  'Yz': 'Yeezy',
  // Dior variations
  'DR': 'Dior',
  'D R': 'Dior',
  // Supreme variations
  'SUP': 'Supreme',
  'S U P': 'Supreme',
  // Broken Planet (was incorrectly Denim Tears)
  'Denim Tears': 'Broken Planet',
  // Lanvin
  'L.A.N': 'Lanvin',
  'LAN': 'Lanvin',
};

async function fixProductNames() {
  try {
    console.log('🔌 Łączenie z MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Połączono z MongoDB\n');

    let fixedCount = 0;
    let skippedPinned = 0;
    let totalChecked = 0;

    // Get all products (excluding pinned ones)
    const products = await Product.find({ 
      $or: [{ isPinned: false }, { isPinned: { $exists: false } }] 
    });

    console.log(`📦 Znaleziono ${products.length} produktów do sprawdzenia\n`);

    for (const product of products) {
      totalChecked++;
      let needsUpdate = false;
      let newName = product.name;

      // Check each brand fix
      for (const [oldBrand, newBrand] of Object.entries(BRAND_FIXES)) {
        // Create regex to match the brand name as a whole word
        const regex = new RegExp(`\\b${oldBrand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        
        if (regex.test(newName)) {
          newName = newName.replace(regex, newBrand);
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await Product.updateOne(
          { _id: product._id },
          { $set: { name: newName } }
        );
        console.log(`✅ [${totalChecked}/${products.length}] Zaktualizowano: "${product.name}" → "${newName}"`);
        fixedCount++;
      } else {
        if (totalChecked % 100 === 0) {
          console.log(`⏩ Sprawdzono ${totalChecked}/${products.length} produktów...`);
        }
      }
    }

    // Check pinned products count
    const pinnedCount = await Product.countDocuments({ isPinned: true });

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Zaktualizowano nazwy: ${fixedCount} produktów`);
    console.log(`⏭️  Pominięto (przypięte): ${pinnedCount} produktów`);
    console.log(`📊 Sprawdzono łącznie: ${totalChecked} produktów`);
    console.log('='.repeat(60));

    await mongoose.connection.close();
    console.log('\n✅ Gotowe!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Błąd:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

fixProductNames();
