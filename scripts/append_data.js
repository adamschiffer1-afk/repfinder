const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '../scratch/scraped_multi_variants.js');
const destPath = path.join(__dirname, '../src/data/productsData.js');

if (fs.existsSync(srcPath) && fs.existsSync(destPath)) {
    const srcContent = fs.readFileSync(srcPath, 'utf8');
    let destContent = fs.readFileSync(destPath, 'utf8');
    
    // Extract items from source (everything between [ and ])
    const match = srcContent.match(/\[([\s\S]*?)\];/);
    if (match) {
        const newItems = match[1].trim();
        
        // Insert new items into the destination array (at the beginning of the list)
        destContent = destContent.replace('export const productsData = [', 'export const productsData = [\n' + newItems + ',');
        
        fs.writeFileSync(destPath, destContent);
        console.log(`✅ Successfully added new products to ${destPath}!`);
    } else {
        console.error('❌ Could not parse source items!');
    }
} else {
    console.error('❌ Source or destination file not found!');
}
