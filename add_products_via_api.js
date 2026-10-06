const axios = require('axios');
const cheerio = require('cheerio');

// Your local development server
const API_BASE = 'http://localhost:3000';
const AFFILIATE_CODE = 'xfrostyy';

const urls = [
  'https://weidian.com/item.html?itemID=7834112554&spider_token=7a08',
  'https://weidian.com/item.html?itemID=7833981948&spider_token=0ca5',
  'https://weidian.com/item.html?itemID=7831144185&spider_token=8f47',
  'https://weidian.com/item.html?itemID=7831078907&spider_token=80e0',
  'https://weidian.com/item.html?itemID=7830908323&spider_token=e6a4',
  'https://weidian.com/item.html?itemID=7831146261&spider_token=7e07',
  'https://weidian.com/item.html?itemID=7834069264&spider_token=0511',
  'https://weidian.com/item.html?itemID=7834098740&spider_token=3c2a',
  'https://weidian.com/item.html?itemID=7834173806&spider_token=bb45',
  'https://weidian.com/item.html?itemID=7834144280&spider_token=321f',
  'https://weidian.com/item.html?itemID=7831142233&spider_token=118f',
  'https://weidian.com/item.html?itemID=7831098699&spider_token=ba47',
  'https://weidian.com/item.html?itemID=7831057317&spider_token=c004',
  'https://weidian.com/item.html?itemID=7834138320&spider_token=8348',
  'https://weidian.com/item.html?itemID=7831165807&spider_token=1206',
  'https://weidian.com/item.html?itemID=7831122475&spider_token=0938',
  'https://weidian.com/item.html?itemID=7830940093&spider_token=2275',
  'https://weidian.com/item.html?itemID=7831106567&spider_token=dafa',
  'https://weidian.com/item.html?itemID=7834071178&spider_token=6fb1',
  'https://weidian.com/item.html?itemID=7831104557&spider_token=030b',
  'https://weidian.com/item.html?itemID=7831078911&spider_token=2adc',
  'https://weidian.com/item.html?itemID=7831148189&spider_token=6206',
  'https://weidian.com/item.html?itemID=7834090886&spider_token=eccc',
  'https://weidian.com/item.html?itemID=7831136245&spider_token=d729',
  'https://weidian.com/item.html?itemID=7831124371&spider_token=05eb',
  'https://weidian.com/item.html?itemID=7833916324&spider_token=aac4',
  'https://weidian.com/item.html?itemID=7831065057&spider_token=0754',
  'https://weidian.com/item.html?itemID=7831090737&spider_token=4a1f',
  'https://weidian.com/item.html?itemID=7831082917&spider_token=54be',
  'https://weidian.com/item.html?itemID=7831066997&spider_token=3221',
];

async function main() {
  console.log('🚀 Adding 30 new products via bulk scraper API...\n');
  console.log('⚠️  Make sure your dev server is running (npm run dev)\n');
  
  try {
    // Use the bulk scraper API endpoint
    const response = await axios.post(`${API_BASE}/api/admin/scrape/bulk`, {
      urls: urls.join('\n'),
      replaceMode: 'add', // Add mode - will pin new products
      pinned: true, // Pin all new products
      startOrder: 1 // Start from order 1
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 300000 // 5 minutes
    });
    
    console.log('✅ Success!');
    console.log(`   Added: ${response.data.succeeded} products`);
    console.log(`   Failed: ${response.data.failed} products`);
    
    if (response.data.errors && response.data.errors.length > 0) {
      console.log('\n❌ Errors:');
      response.data.errors.forEach(err => {
        console.log(`   - ${err.url}: ${err.error}`);
      });
    }
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Cannot connect to dev server!');
      console.error('   Make sure you run: npm run dev');
      console.error('   Then try again.');
    } else {
      console.error('❌ Error:', error.response?.data || error.message);
    }
  }
}

main();
