require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

// Konfiguracja
const BATCH_SIZE = 10;
const MAX_RETRIES = 3;

async function generateEmbeddings() {
  console.log("🚀 Rozpoczynam wektoryzację produktów...");
  const { pipeline, env } = await import('@xenova/transformers');
  env.allowLocalModels = false;
  
  console.log("Ładowanie modelu CLIP (może to zająć chwilę za pierwszym razem)...");
  const extractor = await pipeline('image-feature-extraction', 'Xenova/clip-vit-base-patch32');
  
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ Połączono z MongoDB");
  
  const ProductSchema = new mongoose.Schema({}, { strict: false });
  const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
  
  // Szukamy produktów, które mają obrazek, ale NIE MAJĄ jeszcze imageVector
  // Lub po prostu nadpiszmy te co nie mają.
  const productsToProcess = await Product.find({ 
    image: { $exists: true, $ne: "" },
    imageVector: { $exists: false }
  });
  
  console.log(`📦 Do przetworzenia pozostało: ${productsToProcess.length} produktów.`);
  
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < productsToProcess.length; i += BATCH_SIZE) {
    const batch = productsToProcess.slice(i, i + BATCH_SIZE);
    console.log(`Przetwarzanie paczki ${i} - ${i + batch.length} z ${productsToProcess.length}...`);
    
    const promises = batch.map(async (product) => {
      let attempts = 0;
      while (attempts < MAX_RETRIES) {
        try {
          // Pobranie i wygenerowanie wektora
          const output = await extractor(product.image);
          const vector = Array.from(output.data);
          
          // Zapis do bazy (używamy updateOne by obejść schema validation na innych polach, na wszelki wypadek)
          await Product.updateOne(
            { _id: product._id },
            { $set: { imageVector: vector } }
          );
          return true; // sukces
        } catch (error) {
          attempts++;
          if (attempts === MAX_RETRIES) {
            console.error(`❌ Nie udało się wektoryzować: ${product.name} (${product.image}) - ${error.message}`);
            return false; // porażka
          }
          // Krótkie opóźnienie przed ponowną próbą
          await new Promise(res => setTimeout(res, 1000));
        }
      }
    });

    const results = await Promise.all(promises);
    successCount += results.filter(r => r).length;
    failCount += results.filter(r => !r).length;
    
    console.log(`✅ Postęp: ${successCount} wektorów zrobionych, ❌ ${failCount} błędów.`);
  }

  console.log("🎉 Zakończono proces generowania wektorów.");
  process.exit(0);
}

generateEmbeddings().catch(console.error);
