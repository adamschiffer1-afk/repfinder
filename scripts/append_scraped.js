const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../src/data/productsData.js');
const scrapedPath = path.join(__dirname, '../scratch/scraped_multi_variants.json');

const scrapedData = JSON.parse(fs.readFileSync(scrapedPath, 'utf8'));
let currentContent = fs.readFileSync(dataPath, 'utf8');

// Find the start of categoriesData array
const marker = 'export const categoriesData';
const lastBracketIndex = currentContent.indexOf(marker);

if (lastBracketIndex === -1) {
    console.error('❌ Could not find the categoriesData marker.');
    process.exit(1);
}

// We want to insert before the marker, but after the last ]; of productsData
const searchRange = currentContent.slice(0, lastBracketIndex);
const realInsertionPoint = searchRange.lastIndexOf('];');

if (realInsertionPoint === -1) {
    console.error('❌ Could not find the end of productsData array.');
    process.exit(1);
}

const newEntries = scrapedData.map(p => {
    return `  {
    _id: "${p._id}",
    name: "${p.name}",
    price: ${p.price},
    image: "${p.image}",
    category: "${p.category}",
    batch: "best",
    link: "${p.link}"
  }`;
}).join(',\n');

const updatedContent = currentContent.slice(0, realInsertionPoint) + (currentContent.slice(0, realInsertionPoint).trim().endsWith('[') ? '' : ',\n') + newEntries + '\n' + currentContent.slice(realInsertionPoint);

fs.writeFileSync(dataPath, updatedContent);
console.log(`✅ Successfully appended ${scrapedData.length} products to productsData.js`);
