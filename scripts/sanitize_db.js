const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/data/productsData.js');
let content = fs.readFileSync(filePath, 'utf8');

// Remove everything from the first categoriesData occurrence to the end
const catMarker = 'export const categoriesData';
const catIndex = content.indexOf(catMarker);

let baseContent = content;
if (catIndex !== -1) {
    baseContent = content.slice(0, catIndex);
}

// Ensure it ends with ];
baseContent = baseContent.trim();
if (baseContent.endsWith('}')) {
    baseContent += '\n];';
} else if (!baseContent.endsWith('];')) {
    // Look for last }
    const lastBrace = baseContent.lastIndexOf('}');
    baseContent = baseContent.slice(0, lastBrace + 1) + '\n];';
}

const finalFile = baseContent + '\n\nexport const categoriesData = [\n  \'shoes\',\n  \'hoodies\',\n  \'t-shirts\',\n  \'pants\',\n  \'shorts\',\n  \'accessories\'\n];';

fs.writeFileSync(filePath, finalFile);
console.log('✅ Database file sanitized.');
