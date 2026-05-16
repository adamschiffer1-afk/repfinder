const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/data/productsData.js');

if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Regex to find "name: \"Base Name - Variant\"" and replace with "name: \"Base Name\""
    // It looks for everything after the dash until the closing quote
    const cleanedContent = content.replace(/name: "(.*?) - .*?"/g, 'name: "$1"');
    
    fs.writeFileSync(filePath, cleanedContent);
    console.log(`✅ Successfully cleaned names in ${filePath}!`);
} else {
    console.error('❌ File not found!');
}
