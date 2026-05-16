const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: String,
  category: String,
  purchaseLink: String,
  qcLink: String,
  image: String,
  createdAt: { type: Date, default: Date.now },
});

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

const CSV_URL = `https://docs.google.com/spreadsheets/d/e/2PACX-1vSpG4WBPhQTOtr-TrtXwW9mXA0sCgIfKfVHOI9W7wIcdANCkamp8wISpATxFpsrogGEwX80EPoWM7NB/pub?output=csv`;

async function scrape() {
  console.log('🚀 Rozpoczynam zaawansowane pobieranie danych (Wersja 2.0)...');
  
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Połączono z MongoDB');

    // CZYŚCIMY TYLKO JEŚLI CHCEMY OD ZERA (zalecane teraz)
    await Product.deleteMany({});
    console.log('🧹 Baza wyczyszczona dla poprawnego importu.');

    const response = await axios.get(CSV_URL);
    const csvData = response.data;
    
    // Używamy regexu do dzielenia linii, aby nie zepsuć danych w cudzysłowach
    const rows = csvData.match(/(".*?"|[^",\n]+|(?<=,|^)(?=,|$))/g);
    
    // Ponieważ match zwraca płaską tablicę komórek, musimy ją podzielić na wiersze (ok. 21 komórek na wiersz)
    const lineCount = csvData.split('\n').length;
    const rawLines = csvData.split('\n');
    
    let addedCount = 0;
    let currentCategory = 'General';

    console.log(`📊 Przetwarzam ok. ${rawLines.length} wierszy...`);

    rawLines.forEach((line, index) => {
      // Dzielimy linię na komórki (prosty podział, ale bierzemy pod uwagę strukturę Twojego arkusza)
      const cells = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));

      // Wykrywanie kategorii w nagłówkach (np. LEGO, SHOES, T-SHIRTS)
      if (cells.some(c => c.includes('🧩') || c === 'Accessories' || c === 'shoes')) {
         // To są wiersze nagłówkowe, możemy spróbować wyciągnąć z nich kategorię
         console.log(`📍 Linia nagłówkowa wykryta (wiersz ${index + 1})`);
      }

      // Twoja struktura ma 4 bloki produktów po 5 kolumn każdy:
      // Blok 1: cells[1-5], Blok 2: cells[6-10], Blok 3: cells[11-15], Blok 4: cells[16-20]
      const blocks = [
        { name: cells[1], link: cells[2], price: cells[3], qc: cells[4], img: cells[5], cat: 'Shoes/General' },
        { name: cells[6], link: cells[7], price: cells[8], qc: cells[9], img: cells[10], cat: 'T-Shirts/Hoodies' },
        { name: cells[11], link: cells[12], price: cells[13], qc: cells[14], img: cells[15], cat: 'Jackets/Pants' },
        { name: cells[16], link: cells[17], price: cells[18], qc: cells[19], img: cells[20], cat: 'Accessories' }
      ];

      blocks.forEach(block => {
        if (block.name && block.name !== 'PRODUCTO' && block.name.length > 3 && block.link === 'LINK') {
          // Naprawiamy cenę (usuwamy entery)
          const cleanPrice = block.price ? block.price.replace(/\n/g, ' ').trim() : '';
          
          Product.create({
            name: block.name.replace(/\n/g, ' ').trim(),
            price: cleanPrice,
            category: block.cat,
            purchaseLink: block.link === 'LINK' ? 'https://www.kakobuy.com/register?inviteCode=REJESTRACJA' : block.link, // Placeholder or real
            qcLink: block.qc === 'QC' ? '#' : block.qc,
            image: block.img || ''
          }).catch(e => {});
          
          addedCount++;
        }
      });
    });

    // Czekamy chwilę na zapisy
    setTimeout(() => {
      console.log(`\n✨ GOTOWE! Przetworzono arkusz.`);
      console.log(`📦 Sprawdź teraz panel admina.`);
      process.exit(0);
    }, 5000);

  } catch (error) {
    console.error('❌ BŁĄD:', error.message);
    process.exit(1);
  }
}

scrape();
