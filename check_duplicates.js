require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

const ProductSchema = new mongoose.Schema({
  name: String,
  link: String,
  itemId: String,
  isPinned: Boolean
}, { timestamps: true });

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

async function checkDuplicates() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Połączono z MongoDB\n');

    // Find duplicates by link
    const duplicatesByLink = await Product.aggregate([
      { $match: { link: { $exists: true, $ne: null } } },
      { $group: { 
          _id: '$link', 
          count: { $sum: 1 },
          ids: { $push: '$_id' },
          names: { $push: '$name' }
        }
      },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log(`🔍 Znalezione duplikaty według linku: ${duplicatesByLink.length}\n`);
    
    if (duplicatesByLink.length > 0) {
      console.log('Top 10 duplikatów:');
      duplicatesByLink.slice(0, 10).forEach((dup, index) => {
        console.log(`\n${index + 1}. Link: ${dup._id.substring(0, 80)}...`);
        console.log(`   Ilość duplikatów: ${dup.count}`);
        console.log(`   Nazwy: ${dup.names.join(', ')}`);
      });
    }

    const totalProducts = await Product.countDocuments();
    console.log(`\n📊 Statystyki:`);
    console.log(`   Wszystkie produkty: ${totalProducts}`);
    console.log(`   Unikalne linki: ${totalProducts - duplicatesByLink.reduce((sum, d) => sum + (d.count - 1), 0)}`);
    console.log(`   Produkty do usunięcia: ${duplicatesByLink.reduce((sum, d) => sum + (d.count - 1), 0)}`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Błąd:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

checkDuplicates();
