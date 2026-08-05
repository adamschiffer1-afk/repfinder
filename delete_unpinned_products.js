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

async function deleteUnpinnedProducts() {
  try {
    console.log('🔌 Łączenie z MongoDB...');
    
    if (!MONGODB_URI) {
      throw new Error('Brak MONGODB_URI w .env.local');
    }

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Połączono z MongoDB\n');

    // Policz wszystkie produkty
    const totalCount = await Product.countDocuments();
    console.log(`📦 Łącznie produktów w bazie: ${totalCount}`);

    // Znajdź wszystkie przypięte produkty
    const pinnedProducts = await Product.find({ isPinned: true });
    console.log(`📌 Przypiętych produktów: ${pinnedProducts.length}`);
    
    if (pinnedProducts.length > 0) {
      console.log('\n📌 Przypięte produkty (zostaną zachowane):');
      pinnedProducts.forEach((product, index) => {
        console.log(`   ${index + 1}. ${product.name} (Order: ${product.pinnedOrder})`);
      });
    }

    // Policz nieprzypięte produkty
    const unpinnedCount = await Product.countDocuments({ 
      $or: [{ isPinned: false }, { isPinned: { $exists: false } }] 
    });
    console.log(`\n🗑️  Produktów do usunięcia (nieprzypięte): ${unpinnedCount}`);

    if (unpinnedCount > 0) {
      console.log('\n⚠️  Czy na pewno chcesz usunąć wszystkie nieprzypięte produkty?');
      console.log('   Usuwanie w 3 sekundy...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Usuń wszystkie nieprzypięte produkty
      const result = await Product.deleteMany({ 
        $or: [{ isPinned: false }, { isPinned: { $exists: false } }] 
      });
      
      console.log(`\n✅ Usunięto ${result.deletedCount} niepinnych produktów`);
      console.log(`📌 Zachowano ${pinnedProducts.length} przypiętych produktów`);
      console.log('✅ Gotowe!\n');
    } else {
      console.log('\nℹ️  Brak niepinnych produktów do usunięcia\n');
    }

    await mongoose.connection.close();
    console.log('👋 Rozłączono z bazą danych');
    process.exit(0);
  } catch (error) {
    console.error('❌ Błąd:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

deleteUnpinnedProducts();
