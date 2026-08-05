const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/data/productsData.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove all categoriesData declarations
content = content.replace(/export const categoriesData = \[[\s\S]*?\];/g, '');

// 2. Ensure productsData is properly closed
// Find the last product entry
const lastProductMarker = 'link: "https://www.kakobuy.com/item/details?url=https%3A%2F%2Fweidian.com%2Fitem.html%3FitemID%3D7508111279&affcode=xfrostyy"';
const lastIndex = content.lastIndexOf(lastProductMarker);

if (lastIndex === -1) {
    console.error('❌ Could not find products.');
    process.exit(1);
}

let closingBraceIndex = content.indexOf('}', lastIndex);
let beforePart = content.slice(0, closingBraceIndex + 1);

const finalFile = beforePart + '\n];\n\nexport const categoriesData = [\n  \'shoes\',\n  \'hoodies\',\n  \'t-shirts\',\n  \'pants\',\n  \'shorts\',\n  \'accessories\'\n];';

fs.writeFileSync(filePath, finalFile);
console.log('✅ Database file fixed for real this time.');
