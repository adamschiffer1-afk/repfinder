import * as fs from 'fs';

// Read the jackets mapping file
const content = fs.readFileSync('jackets_discord_mapping.txt', 'utf-8');

// Extract product entries
const lines = content.split('\n');
const products = [];
const polishMappings = [];

for (const line of lines) {
  // Skip comments and empty lines
  if (line.startsWith('//') || line.trim() === '') continue;
  
  // Match: "key": "url",  // Name
  const match = line.match(/"([^"]+)":\s*"([^"]+)",\s*\/\/\s*(.+)/);
  if (match) {
    const [, key, url, name] = match;
    products.push({ key, url, name });
    
    // Generate Polish mappings
    const lowerName = name.toLowerCase();
    const lowerKey = key.toLowerCase();
    
    // Add Polish variations
    if (lowerName.includes('jacket')) {
      polishMappings.push(`"${key.replace(' jacket', ' kurtka')}": "${key}",`);
      polishMappings.push(`"${key.replace(' jacket', ' kurtki')}": "${key}",`);
    }
    if (lowerName.includes('down jacket')) {
      polishMappings.push(`"${key.replace('down jacket', 'puchowka')}": "${key}",`);
      polishMappings.push(`"${key.replace('down jacket', 'puchówka')}": "${key}",`);
    }
    if (lowerName.includes('coat')) {
      polishMappings.push(`"${key.replace(' coat', ' płaszcz')}": "${key}",`);
      polishMappings.push(`"${key.replace(' coat', ' plaszcz')}": "${key}",`);
    }
    if (lowerName.includes('puffer')) {
      polishMappings.push(`"${key.replace('puffer', 'puchowka')}": "${key}",`);
    }
    if (lowerName.includes('vest')) {
      polishMappings.push(`"${key.replace('vest', 'kamizelka')}": "${key}",`);
    }
    if (lowerName.includes('suit')) {
      polishMappings.push(`"${key.replace('suit', 'garnitur')}": "${key}",`);
    }
  }
}

console.log(`✅ Found ${products.length} jackets\n`);

// Generate products section
let output = '// ============ JACKETS (124 ITEMS) ============\n';
for (const { key, url, name } of products) {
  output += `"${key}": "${url}",  // ${name}\n`;
}

output += '\n\n';
output += '// ============ POLISH JACKET MAPPINGS ============\n';
output += '// Add these to polishToEnglish object:\n';
for (const mapping of [...new Set(polishMappings)]) {
  output += `  ${mapping}\n`;
}

// Save to file
fs.writeFileSync('jackets_for_discord_bot.txt', output);

console.log('✅ Saved to jackets_for_discord_bot.txt');
console.log(`📦 Generated ${products.length} product entries`);
console.log(`🇵🇱 Generated ${polishMappings.length} Polish mappings`);
