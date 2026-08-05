const fs = require('fs');
const path = require('path');

const PRODUCTS_DATA_PATH = path.join(__dirname, '../src/data/productsData.js');
const SCRAPED_RESULTS_PATH = path.join(__dirname, '../scratch/scraped_results.json');

function merge() {
    if (!fs.existsSync(SCRAPED_RESULTS_PATH)) {
        console.error('No scraped results found!');
        return;
    }

    const scrapedData = JSON.parse(fs.readFileSync(SCRAPED_RESULTS_PATH, 'utf8'));
    let productsFileContent = fs.readFileSync(PRODUCTS_DATA_PATH, 'utf8');

    console.log(`Merging ${scrapedData.length} items...`);

    // Find the end of the productsData array correctly
    const productsDataStart = productsFileContent.indexOf('export const productsData = [');
    if (productsDataStart === -1) {
        console.error('Could not find productsData start!');
        return;
    }
    
    const arrayEndIndex = productsFileContent.indexOf('];', productsDataStart);
    
    if (arrayEndIndex === -1) {
        console.error('Could not find the end of productsData array!');
        return;
    }

    // Format new items as strings
    const newItemsStrings = scrapedData.map(item => {
        return `  {
    _id: "${item._id}",
    name: "${item.name}",
    price: ${item.price},
    image: "${item.image}",
    category: "${item.category}",
    batch: "${item.batch}",
    link: "${item.link}"
  }`;
    }).join(',\n');

    // Insert before the last ];
    // Check if the last item has a comma
    let prefix = '';
    const textBeforeEnd = productsFileContent.substring(0, arrayEndIndex).trim();
    if (!textBeforeEnd.endsWith(',')) {
        prefix = ',\n';
    } else {
        prefix = '\n';
    }

    const newContent = productsFileContent.substring(0, arrayEndIndex).trimEnd() + 
                       prefix + newItemsStrings + '\n' + 
                       productsFileContent.substring(arrayEndIndex);

    fs.writeFileSync(PRODUCTS_DATA_PATH, newContent);
    console.log('✅ Merge complete!');
}

merge();
