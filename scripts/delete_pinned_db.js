const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: Number,
  category: String,
  link: String,
  image: String,
  batch: String,
  isPinned: { type: Boolean, default: false },
}, {
  timestamps: true,
});

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

const pinnedIds = [
  '7768964356', '7765938955', '7765944855', '7768974132', '7769003888',
  '7768970284', '7768893560', '7765954171', '7765942871', '7768913208',
  '7765915371', '7768974134', '7766003953', '7769003890', '7768964372',
  '7766007905', '7765948737', '7768950510', '7768905364', '7766005793',
  '7765851545', '7768988102', '7768901436', '7765925131', '7766015881',
  '7768925008', '7765942883', '7768962396', '7765948743', '7768913216',
  '7765972395', '7766025667', '7765990147', '7765915365', '7765911439',
  '7768980152', '7765970411', '7768970294', '7769013674', '7765851553',
  '7769009736', '7768917118', '7768950518', '7768923046'
];

async function deleteFromDb() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected successfully!');

    console.log('🔍 Searching and deleting matching products...');
    const query = {
      $or: pinnedIds.map(id => ({ link: { $regex: id } }))
    };

    // First find them to see what we are deleting
    const toDelete = await Product.find(query);
    console.log(`📦 Found ${toDelete.length} products in MongoDB matching pinned IDs.`);
    
    if (toDelete.length > 0) {
      toDelete.forEach(p => {
        console.log(` - Deleting: ${p.name} | ${p.link}`);
      });

      const result = await Product.deleteMany(query);
      console.log(`🗑️ Successfully deleted ${result.deletedCount} products from MongoDB!`);
    } else {
      console.log('ℹ️ No matching products found in MongoDB.');
    }

    process.exit(0);
  } catch (err) {
    console.error('💥 ERROR DELETING FROM DB:', err);
    process.exit(1);
  }
}

deleteFromDb();
