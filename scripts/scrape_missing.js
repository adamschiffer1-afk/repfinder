const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const PRODUCTS_DATA_PATH = path.join(__dirname, '../src/data/productsData.js');

// List of missing items (extracted from your scratch files)
const missingItems = [
    {id: '7651099070', name: 'Arcteryx Hat'},
    {id: '7509914080', name: 'Burberry Pants'},
    {id: '7509028109', name: 'Adidas campus'},
    {id: '7511566024', name: 'Burberry slide'},
    {id: '7511375544', name: 'Adidas samba'},
    // ... I will load the full list from find-missing-full.js if possible, 
    // but for now I'll use the ones I saw in the logs.
];

// Better: let's load the full list from the scratch file dynamically.
function getFullMissingList() {
    try {
        const content = fs.readFileSync(path.join(__dirname, '../scratch/find-missing-full.js'), 'utf8');
        // Simple extraction of the userList array from the script
        const match = content.match(/const userList = (\[[\s\S]*?\]);/);
        if (match) {
            const list = eval(match[1]); // Safe enough for internal scripts
            
            // Re-run the filter against current productsData to be sure
            const productsDataFile = fs.readFileSync(PRODUCTS_DATA_PATH, 'utf8');
            const existingIds = new Set();
            const idRegex = /itemID=(\d+)/g;
            let m;
            while ((m = idRegex.exec(productsDataFile)) !== null) {
                existingIds.add(m[1]);
            }
            
            const missing = list.filter(item => !existingIds.has(item.id));
            return Array.from(new Map(missing.map(item => [item.id, item])).values());
        }
    } catch (e) {
        console.error('Error loading missing list:', e.message);
    }
    return [];
}

const { detectCategory } = require('../src/utils/categoryHelper');

async function scrapeWeidian(itemId) {
    const url = `https://weidian.com/item.html?itemID=${itemId}`;
    try {
        const res = await axios.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
                'Referer': 'https://weidian.com/'
            }
        });
        
        const html = res.data;
        const $ = cheerio.load(html);
        
        // Extract Image
        let image = '';
        const imgMatches = html.match(/https:\/\/si\.geilicdn\.com\/[\w-]+\.(?:jpg|png|webp)/g);
        if (imgMatches) {
            // Find the first image that is likely a product image (not passport/avatar/icon)
            const productImg = imgMatches.find(img => 
                !img.includes('passport') && 
                !img.includes('logo') && 
                !img.includes('icon') &&
                !img.includes('96_52') &&
                !img.includes('45_45')
            );
            if (productImg) {
                image = productImg;
            } else {
                image = imgMatches[0]; // fallback
            }
        }
        
        // Extract Price (CNY)
        let priceCNY = 0;
        const priceMatch = html.match(/&#34;price&#34;:&#34;([\d.]+)&#34;/); // From JSON in script
        if (priceMatch) {
            priceCNY = parseFloat(priceMatch[1]);
        } else {
            // Fallback: search for cur-price class in skeleton or actual html
            const curPriceMatch = html.match(/cur-price\\&#34;&gt;\\n([\d.]+)/);
            if (curPriceMatch) priceCNY = parseFloat(curPriceMatch[1]);
        }
        
        return { image, priceCNY };
    } catch (e) {
        console.error(`Failed to scrape ${itemId}: ${e.message}`);
        return null;
    }
}

function generateId() {
    return Math.random().toString(36).substr(2, 20);
}

async function start() {
    const itemsToProcess = getFullMissingList();
    console.log(`Starting scraper for ${itemsToProcess.length} items...`);
    
    const results = [];
    
    // Process in batches to avoid rate limiting
    for (let i = 0; i < itemsToProcess.length; i++) {
        const item = itemsToProcess[i];
        console.log(`[${i+1}/${itemsToProcess.length}] Processing ${item.name} (${item.id})...`);
        
        const data = await scrapeWeidian(item.id);
        if (data && data.image && data.priceCNY) {
            const priceUSD = (data.priceCNY * 0.157).toFixed(2);
            
            const product = {
                _id: generateId(),
                name: item.name,
                price: parseFloat(priceUSD),
                image: `${data.image}?w=400&h=400`,
                category: detectCategory(item.name),
                batch: 'best',
                link: `https://weidian.com/item.html?itemID=${item.id}`
            };
            
            results.push(product);
            console.log(`✅ Success: ${item.name} - $${priceUSD}`);
        } else {
            console.log(`❌ Failed: Could not get data for ${item.id}`);
        }
        
        // Wait a bit
        await new Promise(r => setTimeout(r, 1500));
        
        // Partial save every 10 items to avoid losing progress
        if (results.length > 0 && results.length % 10 === 0) {
            saveResults(results);
        }
    }
    
    saveResults(results);
    console.log('Done!');
}

function saveResults(results) {
    if (results.length === 0) return;
    
    const filePath = path.join(__dirname, '../scratch/scraped_results.json');
    fs.writeFileSync(filePath, JSON.stringify(results, null, 2));
    console.log(`Saved ${results.length} results to ${filePath}`);
}

start();
