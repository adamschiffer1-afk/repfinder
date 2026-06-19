// Analyze brand codes from missing products
const fs = require('fs');

const missingProducts = JSON.parse(fs.readFileSync('missing_products.json', 'utf-8'));

// Extract all brand codes (words with dots like a.b.c or a.b)
const brandCodes = new Set();

missingProducts.forEach(p => {
  const original = p.original;
  
  // Match patterns like a.b.c or A.B.C (brand codes)
  const matches = original.match(/\b[a-zA-Z](\.[a-zA-Z])+\b/g);
  if (matches) {
    matches.forEach(code => brandCodes.add(code));
  }
  
  // Also match full dotted words like C.h.a.n.e.l
  const fullMatches = original.match(/\b([A-Z]\.[a-z]\.)+[a-z]\b/g);
  if (fullMatches) {
    fullMatches.forEach(code => brandCodes.add(code));
  }
});

// Sort by frequency
const codeFrequency = {};
missingProducts.forEach(p => {
  const original = p.original;
  brandCodes.forEach(code => {
    const regex = new RegExp('\\b' + code.replace(/\./g, '\\.') + '\\b', 'i');
    if (regex.test(original)) {
      codeFrequency[code] = (codeFrequency[code] || 0) + 1;
    }
  });
});

// Sort by frequency
const sorted = Object.entries(codeFrequency).sort((a, b) => b[1] - a[1]);

console.log('Brand codes found in missing products:');
console.log('='.repeat(60));
sorted.forEach(([code, freq]) => {
  console.log(`${code.padEnd(30)} (${freq} times)`);
});

// Also find potential new codes not in the current BRAND_MAP
console.log('\n\nPotential new brand codes to add:');
console.log('='.repeat(60));

// These are codes that appear frequently and might need mapping
const frequentCodes = sorted.filter(([code, freq]) => freq >= 3).map(([code]) => code);
frequentCodes.forEach(code => {
  const examples = missingProducts
    .filter(p => p.original.toLowerCase().includes(code.toLowerCase()))
    .slice(0, 3)
    .map(p => `  - ${p.original} → ${p.decoded}`);
  
  console.log(`\n${code}:`);
  examples.forEach(ex => console.log(ex));
});
