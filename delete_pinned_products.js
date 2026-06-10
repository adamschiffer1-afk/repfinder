import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env.local') });

const ProductSchema = new mongoose.Schema({
  name: String,
  price: Number,
  image: String,
  category: String,
  batch: String,
  link: String,
  isPinned: Boolean,
  pinnedOrder: Number,
}, { timestamps: true });

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

async function deletePinnedProducts() {
  try {
    console.log('🔌 Łączenie z MongoDB...');
    
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error('Brak MONGODB_URI w .env.local');
    }

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Połączono z MongoDB');

    // Znajdź wszystkie przypięte produkty
    const pinnedProducts = await Product.find({ isPinned: true });
    console.log(`\n📌 Znaleziono ${pinnedProducts.length} przypiętych produktów:`);
    
    if (pinnedProducts.length > 0) {
      pinnedProducts.forEach((product, index) => {
        console.log(`   ${index + 1}. ${product.name} (Order: ${product.pinnedOrder})`);
      });

      // Usuń wszystkie przypięte produkty
      const result = await Product.deleteMany({ isPinned: true });
      console.log(`\n🗑️  Usunięto ${result.deletedCount} produktów`);
      console.log('✅ Gotowe!\n');
    } else {
      console.log('ℹ️  Brak przypiętych produktów do usunięcia\n');
    }

    await mongoose.connection.close();
    console.log('👋 Rozłączono z bazą danych');
    process.exit(0);
  } catch (error) {
    console.error('❌ Błąd:', error.message);
    process.exit(1);
  }
}

deletePinnedProducts();
