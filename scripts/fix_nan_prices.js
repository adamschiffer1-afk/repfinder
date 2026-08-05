const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/data/productsData.js');
let content = fs.readFileSync(filePath, 'utf8');

// Replace "price: NaN" with "price: 0" (or a fallback)
// Also replace "price: 0" with a fallback if it's 0.00
content = content.replace(/price: NaN/g, 'price: 49.00');

fs.writeFileSync(filePath, content);
console.log('✅ Replaced all NaN prices with $49.00');
