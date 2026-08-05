const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/data/productsData.js');
let content = fs.readFileSync(filePath, 'utf8');

// The file might be messy now.
// I'll look for the last valid product block and then properly close it.

const lines = content.split('\n');
let lastProductLineIndex = -1;

for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].includes('link: "https://www.kakobuy.com/item/details?url=https%3A%2F%2Fweidian.com%2Fitem.html%3FitemID%3D7508111279&affcode=xfrostyy"')) {
        // Found the last product. It should end with } a few lines later.
        for (let j = i; j < lines.length; j++) {
            if (lines[j].trim() === '}') {
                lastProductLineIndex = j;
                break;
            }
        }
        break;
    }
}

if (lastProductLineIndex !== -1) {
    const fixedContent = lines.slice(0, lastProductLineIndex + 1).join('\n') + '\n];\n\nexport const categoriesData = [\n  \'shoes\',\n  \'hoodies\',\n  \'t-shirts\',\n  \'pants\',\n  \'shorts\',\n  \'accessories\'\n];';
    fs.writeFileSync(filePath, fixedContent);
    console.log('✅ Database file fixed successfully.');
} else {
    console.error('❌ Could not find the last product to fix the file.');
}
