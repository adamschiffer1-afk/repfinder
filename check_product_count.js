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
  slug: { type: String, unique: true, sparse: true }
}, { timestamps: true });

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

async function checkProductCount() {
  try {
    await mongoose.connect(MONGODB_URI);
    
    const totalCount = await Product.countDocuments();
    const pinnedCount = await Product.countDocuments({ isPinned: true });
    const unpinnedCount = await Product.countDocuments({ 
      $or: [{ isPinned: false }, { isPinned: { $exists: false } }] 
    });
    const bestBatchCount = await Product.countDocuments({ batch: 'best' });
    
    console.log('📊 Statystyki produktów w bazie:');
    console.log(`   Łącznie: ${totalCount}`);
    console.log(`   Przypięte: ${pinnedCount}`);
    console.log(`   Nieprzypięte: ${unpinnedCount}`);
    console.log(`   Z batcha "best": ${bestBatchCount}`);
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Błąd:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

checkProductCount();
