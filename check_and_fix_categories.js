require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Kategorie które mamy w UI
const AVAILABLE_CATEGORIES = [
  'shoes', 'hoodies', 't-shirts', 'pants', 'shorts', 
  'sets', 'jackets', 'accessories'
];

// Inteligentne dopasowanie kategorii na podstawie nazwy
function detectCategory(productName) {
  const name = productName.toLowerCase();
  
  // SHOES - wszystkie buty
  if (name.includes('jordan') || name.includes('nike') && (name.includes('af1') || name.includes('air force') || name.includes('dunk')) ||
      name.includes('yeezy') || name.includes('new balance') || name.includes('nb ') ||
      name.includes('salomon') || name.includes('shoe') || name.includes('sneaker') ||
      name.includes('slide') || name.includes('foam runner') || name.includes('crocs') ||
      name.includes('converse') || name.includes('vans') || name.includes('balenciaga') ||
      name.includes('air max') || name.includes('tn ')) {
    return 'shoes';
  }
  
  // HOODIES
  if (name.includes('hoodie') || name.includes('bluza')) {
    return 'hoodies';
  }
  
  // T-SHIRTS
  if (name.includes('t-shirt') || name.includes('tee') || name.includes('polo') ||
      (name.includes('essentials') && !name.includes('hoodie') && !name.includes('pants'))) {
    return 't-shirts';
  }
  
  // JACKETS
  if (name.includes('jacket') || name.includes('kurtka') || name.includes('bomber') ||
      name.includes('puffer') || name.includes('windbreaker') || name.includes('moncler') ||
      name.includes('north face') || name.includes('arcteryx')) {
    return 'jackets';
  }
  
  // PANTS
  if (name.includes('pants') || name.includes('jeans') || name.includes('cargo') ||
      name.includes('spodnie') || name.includes('tech fleece pant')) {
    return 'pants';
  }
  
  // SHORTS
  if (name.includes('shorts') || name.includes('spodenki')) {
    return 'shorts';
  }
  
  // SETS (dresy)
  if (name.includes('tracksuit') || name.includes('set') || name.includes('dres')) {
    return 'sets';
  }
  
  // ACCESSORIES (domyślnie dla rzeczy typu czapka, torba itp)
  return 'accessories';
}

async function analyzeAndFixCategories() {
  console.log('📊 Pobieram produkty z bazy...\n');
  
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, category')
    .order('name');
  
  if (error) {
    console.error('❌ Błąd:', error);
    return;
  }
  
  console.log(`✅ Znaleziono ${products.length} produktów\n`);
  
  // Statystyki
  const categoryStats = {};
  const needsUpdate = [];
  
  products.forEach(product => {
    const detectedCategory = detectCategory(product.name);
    const currentCategory = product.category || 'brak';
    
    // Zlicz statystyki
    categoryStats[currentCategory] = (categoryStats[currentCategory] || 0) + 1;
    
    // Jeśli kategoria jest błędna lub nie istnieje
    if (currentCategory !== detectedCategory) {
      needsUpdate.push({
        id: product.id,
        name: product.name,
        currentCategory,
        suggestedCategory: detectedCategory
      });
    }
  });
  
  // Pokaż obecne statystyki
  console.log('📈 OBECNE KATEGORIE:');
  console.log('═══════════════════════════════════════');
  Object.entries(categoryStats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      console.log(`${cat.padEnd(20)} → ${count} produktów`);
    });
  
  console.log('\n🔧 PRODUKTY DO ZMIANY: ' + needsUpdate.length);
  console.log('═══════════════════════════════════════\n');
  
  if (needsUpdate.length > 0) {
    // Pokaż pierwsze 10 przykładów
    console.log('📝 Przykłady zmian (pierwsze 10):');
    needsUpdate.slice(0, 10).forEach((item, i) => {
      console.log(`${i+1}. "${item.name}"`);
      console.log(`   ${item.currentCategory} → ${item.suggestedCategory}\n`);
    });
    
    if (needsUpdate.length > 10) {
      console.log(`   ... i ${needsUpdate.length - 10} innych\n`);
    }
    
    // Statystyki zmian
    const changeStats = {};
    needsUpdate.forEach(item => {
      const key = `${item.currentCategory} → ${item.suggestedCategory}`;
      changeStats[key] = (changeStats[key] || 0) + 1;
    });
    
    console.log('\n📊 PODSUMOWANIE ZMIAN:');
    console.log('═══════════════════════════════════════');
    Object.entries(changeStats)
      .sort((a, b) => b[1] - a[1])
      .forEach(([change, count]) => {
        console.log(`${change.padEnd(35)} → ${count}x`);
      });
    
    console.log('\n');
    console.log('💾 Chcesz wykonać te zmiany? (tak/nie)');
    console.log('   Uruchom: node apply_category_changes.js');
    
    // Zapisz zmiany do pliku
    require('fs').writeFileSync(
      'category_updates.json',
      JSON.stringify(needsUpdate, null, 2)
    );
    console.log('✅ Zapisano zmiany do: category_updates.json');
  } else {
    console.log('✅ Wszystkie kategorie są prawidłowe!');
  }
}

analyzeAndFixCategories().catch(console.error);
