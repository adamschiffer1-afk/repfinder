const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: Number,
  category: String,
  link: String,
  image: String,
  batch: String,
  createdAt: { type: Date, default: Date.now },
});

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

async function importFromLocalFile() {
  try {
    console.log('🔗 Łączenie z MongoDB...');
    await mongoose.connect(MONGODB_URI);
    
    const filePath = path.join(__dirname, '../src/data/productsData.js');
    console.log('📖 Czytanie pliku productsData.js...');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Wyciągamy tablicę produktów za pomocą Regexa
    const match = fileContent.match(/export const productsData = (\[[\s\S]*?\]);/);
    if (!match) {
        console.error('❌ Nie znaleziono tablicy productsData w pliku.');
        return;
    }
    
    // Bezpieczne parsowanie (usuwamy export i inne rzeczy, zamieniamy na JSON-like)
    let jsonContent = match[1]
        .replace(/_id: \w+,/g, '') // Usuwamy stare ID, MongoDB wygeneruje nowe
        .replace(/(\w+):/g, '"$1":') // Dodajemy cudzysłowy do kluczy
        .replace(/'/g, '"') // Zamieniamy pojedyncze cudzysłowy na podwójne
        .replace(/,\s*]/g, ']') // Usuwamy przecinki na końcu tablic
        .replace(/,\s*}/g, '}'); // Usuwamy przecinki na końcu obiektów

    // Czasem w pliku są błędy (np. nieescapowane cudzysłowy), użyjemy prostszego podejścia:
    // Zamiast eval() spróbujemy oczyścić dane
    const products = eval(match[1]);
    
    console.log(`📦 Znaleziono ${products.length} produktów w pliku.`);

    // Sprawdzamy czy już są w bazie (po linku), żeby nie dublować
    const existingLinks = new Set(await Product.find({}, 'link').then(docs => docs.map(d => d.link)));
    
    const newProducts = products.filter(p => !existingLinks.has(p.link));
    console.log(`🆕 Do dodania: ${newProducts.length} nowych produktów.`);

    if (newProducts.length > 0) {
        // Mapujemy, żeby usunąć stare _id jeśli istnieją
        const toInsert = newProducts.map(p => {
            const { _id, ...rest } = p;
            return rest;
        });
        await Product.insertMany(toInsert);
        console.log('✅ Import zakończony sukcesem!');
    } else {
        console.log('ℹ️ Wszystkie produkty z pliku są już w bazie.');
    }

    process.exit(0);
  } catch (err) {
    console.error('💥 BŁĄD IMPORTU:', err);
    process.exit(1);
  }
}

importFromLocalFile();
