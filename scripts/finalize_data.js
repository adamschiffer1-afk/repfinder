const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '../scratch/scraped_multi_variants.js');
const destPath = path.join(__dirname, '../src/data/productsData.js');

if (fs.existsSync(srcPath)) {
    let content = fs.readFileSync(srcPath, 'utf8');
    
    // Replace variable name
    content = content.replace('export const scrapedProducts =', 'export const productsData =');
    
    // Add header comment
    const header = "// src/data/productsData.js\n\n";
    
    fs.writeFileSync(destPath, header + content);
    console.log(`✅ Successfully updated ${destPath} with ${content.split('{').length - 1} products!`);
} else {
    console.error('❌ Source file not found!');
}
