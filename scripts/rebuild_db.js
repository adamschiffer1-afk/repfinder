const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/data/productsData.js');
let content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
let filteredLines = [];
let inProductsData = false;
let products = [];
let currentProduct = null;

// Better approach: regex to find all products
// Actually, I'll just find where productsData array ends.

let productsDataEndIndex = content.lastIndexOf('];');
// But there are multiple ];
// I'll look for the last product block.

const lastProductMarker = 'link: "https://www.kakobuy.com/item/details?url=https%3A%2F%2Fweidian.com%2Fitem.html%3FitemID%3D7508111279&affcode=xfrostyy"';
const lastIndex = content.lastIndexOf(lastProductMarker);

if (lastIndex === -1) {
    console.error('❌ Could not find the products.');
    process.exit(1);
}

// Find the closing } of this product
let closingBraceIndex = content.indexOf('}', lastIndex);
let finalClosingBracketIndex = content.indexOf('];', closingBraceIndex);

// Everything before the first "export const productsData = ["
const startMarker = 'export const productsData = [';
const startIndex = content.indexOf(startMarker);

// Everything between startIndex and finalClosingBracketIndex + 2 is our productsData
const cleanProductsData = content.slice(startIndex, finalClosingBracketIndex + 2);

const finalFile = cleanProductsData + '\n\nexport const categoriesData = [\n  \'shoes\',\n  \'hoodies\',\n  \'t-shirts\',\n  \'pants\',\n  \'shorts\',\n  \'accessories\'\n];';

fs.writeFileSync(filePath, finalFile);
console.log('✅ Database file rebuilt from scratch perfectly.');
