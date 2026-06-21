const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://repfinder:va5cxJ6341CDQFIp@ac-x4fzht2-shard-00-00.ve7jrrn.mongodb.net:27017,ac-x4fzht2-shard-00-01.ve7jrrn.mongodb.net:27017,ac-x4fzht2-shard-00-02.ve7jrrn.mongodb.net:27017/?ssl=true&replicaSet=atlas-13mk23-shard-0&authSource=admin&appName=repfinder';

const ProductSchema = new mongoose.Schema({
  name: String,
  price: Number,
  image: String,
  category: String,
  batch: String,
  link: String,
  clicks: { type: Number, default: 0 },
  isPinned: { type: Boolean, default: false },
  pinnedOrder: { type: Number, default: 999999 },
  qcImages: [{
    url: String,
    colorway: { type: String, default: 'Default' },
    addedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

async function updateUnpinnedToBest() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Połączono z MongoDB');

    const Product = mongoose.model('Product', ProductSchema);

    // Znajdź wszystkie nieprzypięte produkty z batch != 'best'
    const result = await Product.updateMany(
      { 
        $or: [
          { isPinned: false },
          { isPinned: { $exists: false } }
        ],
        batch: { $ne: 'best' }
      },
      { 
        $set: { batch: 'best' } 
      }
    );

    console.log(`\n✅ Zaktualizowano ${result.modifiedCount} produktów na batch='best'`);
    
    // Pokaż statystyki
    const stats = await Product.aggregate([
      {
        $group: {
          _id: { batch: '$batch', isPinned: '$isPinned' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.isPinned': -1, '_id.batch': 1 } }
    ]);

    console.log('\nStatystyki po aktualizacji:');
    stats.forEach(stat => {
      const pinned = stat._id.isPinned ? 'Przypięte' : 'Nieprzypięte';
      console.log(`  ${pinned} + ${stat._id.batch}: ${stat.count} produktów`);
    });

  } catch (error) {
    console.error('❌ Błąd:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Rozłączono z MongoDB');
  }
}

updateUnpinnedToBest();
