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
  qcImages: { type: [mongoose.Schema.Types.Mixed], default: [] },
  slug: { type: String, sparse: true }
}, { timestamps: true });

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

// Usuwa wzorzec kropek z nazwy: "L.o.u.i.s" -> "Louis", "S.K.A.T.E.S" -> "SKATES"
// Logika: pojedyncze litery oddzielone kropkami (bez spacji) -> sklej w jedno słowo
function fixName(name) {
  if (!name) return name;

  // Zastąp wzorzec: pojedyncza litera.litera.litera... (min 2 człony)
  // np. "L.o.u.i.s" -> "Louis", "S.K.A.T.E.S" -> "SKATES"
  let fixed = name.replace(/\b([A-Za-z])(?:\.([A-Za-z]))+\.?\b/g, (match) => {
    // Usuń wszystkie kropki z dopasowania
    return match.replace(/\./g, '');
  });

  // Usuń też izolowane kropki które zostały np. " . " -> " "
  fixed = fixed.replace(/\s*\.\s*/g, ' ').trim();

  // Usuń podwójne spacje
  fixed = fixed.replace(/\s+/g, ' ').trim();

  return fixed;
}

async function fixProductNames() {
  try {
    console.log('🔌 Łączenie z MongoDB...');

    if (!MONGODB_URI) {
      throw new Error('Brak MONGODB_URI w .env.local');
    }

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Połączono z MongoDB\n');

    // Znajdź wszystkie produkty z kropkami w nazwie
    // Wzorzec: litera, kropka, litera (np. "L.o", "S.K", "m.a")
    const productsWithDots = await Product.find({
      name: { $regex: /[A-Za-z]\.[A-Za-z]/ }
    });

    console.log(`🔍 Znaleziono ${productsWithDots.length} produktów z kropkami w nazwie\n`);

    if (productsWithDots.length === 0) {
      console.log('✅ Brak produktów do poprawienia!\n');
      await mongoose.connection.close();
      process.exit(0);
    }

    let updatedCount = 0;
    let skippedCount = 0;
    const changes = [];

    for (const product of productsWithDots) {
      const originalName = product.name;
      const fixedName = fixName(originalName);

      if (fixedName === originalName) {
        skippedCount++;
        continue;
      }

      changes.push({ original: originalName, fixed: fixedName });

      await Product.updateOne(
        { _id: product._id },
        { $set: { name: fixedName } }
      );
      updatedCount++;
    }

    console.log('📋 Wprowadzone zmiany:');
    changes.forEach((c, i) => {
      console.log(`   ${i + 1}. "${c.original}"\n       → "${c.fixed}"`);
    });

    console.log(`\n✅ Zaktualizowano nazwy: ${updatedCount} produktów`);
    if (skippedCount > 0) {
      console.log(`⏭️  Pominięto (bez zmian): ${skippedCount} produktów`);
    }
    console.log('✅ Gotowe!\n');

    await mongoose.connection.close();
    console.log('👋 Rozłączono z bazą danych');
    process.exit(0);

  } catch (error) {
    console.error('❌ Błąd:', error.message);
    try { await mongoose.connection.close(); } catch {}
    process.exit(1);
  }
}

fixProductNames();
