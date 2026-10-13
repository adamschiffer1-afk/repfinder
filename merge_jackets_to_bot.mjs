import * as fs from 'fs';

console.log('🔧 Integrowanie kurtek do bota Discord...\n');

// Read jackets mapping
const jacketsContent = fs.readFileSync('jackets_discord_mapping.txt', 'utf-8');
const lines = jacketsContent.split('\n');

let productsToAdd = '';
let polishMappings = '';

// Extract products
const products = [];
const polishMaps = new Set();

for (const line of lines) {
  if (line.startsWith('//') || line.trim() === '') continue;
  
  const match = line.match(/"([^"]+)":\s*"([^"]+)",\s*\/\/\s*(.+)/);
  if (match) {
    const [, key, url, name] = match;
    products.push({ key, url, name });
    
    // Generate products entry
    productsToAdd += `  "${key}": "${url}",  // ${name}\n`;
    
    // Generate Polish mappings
    const lowerKey = key.toLowerCase();
    const brand = name.split(' ')[0].toLowerCase();
    
    // Jacket variations
    if (key.includes('jacket')) {
      polishMaps.add(`  "${key.replace('jacket', 'kurtka')}": "${key}",`);
      polishMaps.add(`  "${key.replace('jacket', 'kurtki')}": "${key}",`);
      polishMaps.add(`  "${key.replace('jacket', 'kurtkę')}": "${key}",`);
      polishMaps.add(`  "${key.replace('jacket', 'kurtke')}": "${key}",`);
    }
    
    // Down jacket variations
    if (key.includes('down jacket')) {
      polishMaps.add(`  "${key.replace('down jacket', 'puchowka')}": "${key}",`);
      polishMaps.add(`  "${key.replace('down jacket', 'puchówka')}": "${key}",`);
      polishMaps.add(`  "${key.replace('down jacket', 'puchowke')}": "${key}",`);
      polishMaps.add(`  "${key.replace('down jacket', 'puchówkę')}": "${key}",`);
    }
    
    // Coat variations
    if (key.includes('coat')) {
      polishMaps.add(`  "${key.replace('coat', 'płaszcz')}": "${key}",`);
      polishMaps.add(`  "${key.replace('coat', 'plaszcz')}": "${key}",`);
      polishMaps.add(`  "${key.replace('coat', 'płaszcza')}": "${key}",`);
    }
    
    // Puffer variations
    if (key.includes('puffer')) {
      polishMaps.add(`  "${key.replace('puffer', 'puchowka')}": "${key}",`);
      polishMaps.add(`  "${key.replace('puffer', 'puchówka')}": "${key}",`);
    }
    
    // Vest variations
    if (key.includes('vest')) {
      polishMaps.add(`  "${key.replace('vest', 'kamizelka')}": "${key}",`);
      polishMaps.add(`  "${key.replace('vest', 'kamizelki')}": "${key}",`);
      polishMaps.add(`  "${key.replace('vest', 'kamizelkę')}": "${key}",`);
    }
    
    // Suit variations
    if (key.includes('suit')) {
      polishMaps.add(`  "${key.replace('suit', 'garnitur')}": "${key}",`);
      polishMaps.add(`  "${key.replace('suit', 'garnitury')}": "${key}",`);
      polishMaps.add(`  "${key.replace('suit', 'garniturze')}": "${key}",`);
    }
    
    // Brand-specific shortcuts
    if (brand === 'moncler' && key.includes('down')) {
      polishMaps.add(`  "moncler puchowka": "${key}",`);
      polishMaps.add(`  "moncler puchówka": "${key}",`);
    }
    if (brand === 'canada' && key.includes('down')) {
      polishMaps.add(`  "canada goose puchowka": "${key}",`);
      polishMaps.add(`  "canada goose puchówka": "${key}",`);
      polishMaps.add(`  "canada goose": "${key}",`);
    }
    if (brand === 'north' && key.includes('down')) {
      polishMaps.add(`  "tnf puchowka": "${key}",`);
      polishMaps.add(`  "tnf puchówka": "${key}",`);
      polishMaps.add(`  "north face puchowka": "${key}",`);
    }
  }
}

polishMappings = Array.from(polishMaps).join('\n');

// Create output file
let output = `// ============================================
// JACKETS FOR DISCORD BOT - READY TO PASTE
// Generated: ${new Date().toISOString()}
// Total: ${products.length} jackets
// ============================================

// ============ STEP 1: ADD TO products OBJECT ============
// Find the "products" constant and add these entries:

${productsToAdd}

// ============ STEP 2: ADD TO polishToEnglish OBJECT ============
// Find the "polishToEnglish" constant and add these entries:

${polishMappings}

// ============================================
// DONE! You can now search for jackets in Polish and English!
// Examples:
//   - "daj tnf puchowke" → finds North Face down jacket
//   - "moncler kurtka" → finds Moncler jacket
//   - "canada goose" → finds Canada Goose down jacket
// ============================================
`;

fs.writeFileSync('jackets_ready_to_paste.txt', output);

console.log('✅ Generated jackets_ready_to_paste.txt');
console.log(`📦 Products: ${products.length}`);
console.log(`🇵🇱 Polish mappings: ${polishMaps.size}`);
console.log('\n📝 Instructions:');
console.log('1. Open your Discord bot file');
console.log('2. Find the "products" object');
console.log('3. Copy STEP 1 section and paste into products');
console.log('4. Find the "polishToEnglish" object');
console.log('5. Copy STEP 2 section and paste into polishToEnglish');
console.log('6. Save and restart your bot!');
