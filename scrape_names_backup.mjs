import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

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

async function scrapeName(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    
    let name = $('.goods_name').text().trim() || 
                $('h1.title').text().trim() || 
                $('.itemInfoTitle').text().trim() ||
                'Unknown Product';
    
    let priceText = $('.goods_price').text().trim() || 
                    $('.price').text().trim() ||
                    '0';
    let price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;
    
    return { name, price };
  } catch (error) {
    console.error(`Failed: ${url}`);
    return { name: 'Failed to scrape', price: 0 };
  }
}

async function main() {
  console.log('🔍 Scraping 30 product names...\n');
  
  const products = [];
  
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const itemId = url.match(/itemID=(\d+)/)[1];
    
    console.log(`[${i + 1}/30] Scraping ${itemId}...`);
    
    const { name, price } = await scrapeName(url);
    
    products.push({
      id: i + 1,
      itemId,
      name,
      price,
      url,
      batch: 'popular'
    });
    
    console.log(`  ✓ ${name}`);
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n📝 Creating backup file...\n');
  
  // Create markdown backup
  let markdown = `# 🔖 BACKUP - 30 Produktów "Popular" (Z NAZWAMI)

**Data utworzenia**: ${new Date().toLocaleDateString('pl-PL')}
**Batch**: popular
**Status**: Przypięte (pinned)

---

## 📋 Lista produktów z nazwami

`;

  products.forEach(p => {
    markdown += `### ${p.id}. ${p.name}
- **Cena**: ${p.price} ¥
- **URL**: ${p.url}
- **Item ID**: ${p.itemId}
- **Batch**: popular

`;
  });
  
  markdown += `---

## 📝 Szybki Import (Copy-Paste dla Template Import)

\`\`\`
`;

  products.forEach(p => {
    markdown += `${p.url}\t${p.name}\tpopular\n`;
  });
  
  markdown += `\`\`\`

---

## 🔗 Same linki (dla Bulk Scraper)

\`\`\`
`;

  products.forEach(p => {
    markdown += `${p.url}\n`;
  });
  
  markdown += `\`\`\`

---

**Backup utworzony automatycznie przez scraping Weidian**
`;

  await fs.writeFile('BACKUP_30_POPULAR_WITH_NAMES.md', markdown);
  
  // Create JSON backup
  await fs.writeFile('BACKUP_30_POPULAR_WITH_NAMES.json', JSON.stringify(products, null, 2));
  
  // Create CSV backup
  let csv = 'ID,Item ID,Name,Price,URL,Batch\n';
  products.forEach(p => {
    csv += `${p.id},${p.itemId},"${p.name}",${p.price},${p.url},${p.batch}\n`;
  });
  await fs.writeFile('BACKUP_30_POPULAR_WITH_NAMES.csv', csv);
  
  console.log('✅ Backup files created:');
  console.log('   - BACKUP_30_POPULAR_WITH_NAMES.md');
  console.log('   - BACKUP_30_POPULAR_WITH_NAMES.json');
  console.log('   - BACKUP_30_POPULAR_WITH_NAMES.csv\n');
  
  console.log('🎉 Done!');
}

main().catch(console.error);
