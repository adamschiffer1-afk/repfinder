const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/data/productsData.js');
let content = fs.readFileSync(filePath, 'utf8');

// Find the start and end of productsData array
const startMarker = 'export const productsData = [';
const endMarker = '];'; // This might be tricky if there are multiple ];

// A safer way: parse the file content as a string and filter lines
// Since the file is huge, I'll use a regex approach to remove blocks

const lines = content.split('\n');
let filteredLines = [];
let inLvSkateBlock = false;
let currentBlock = [];

for (let line of lines) {
    if (line.includes('{') && !line.includes('export const')) {
        currentBlock = [line];
        inLvSkateBlock = false;
    } else if (line.includes('}')) {
        currentBlock.push(line);
        // Check if the current block we just finished contains "Lv Skate"
        const blockText = currentBlock.join('\n');
        if (!blockText.includes('Lv Skate')) {
            filteredLines.push(...currentBlock);
        } else {
            console.log('🗑️ Deleted block:', currentBlock.find(l => l.includes('name:'))?.trim());
        }
        currentBlock = [];
    } else if (currentBlock.length > 0) {
        currentBlock.push(line);
    } else {
        filteredLines.push(line);
    }
}

fs.writeFileSync(filePath, filteredLines.join('\n'));
console.log('✅ Removed all old Lv Skate products.');
