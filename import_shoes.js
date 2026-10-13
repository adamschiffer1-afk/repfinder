// Import shoes from Google Sheets
const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');
const fs = require('fs');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const SUPABASE_URL = 'https://qgzmpjbdwwlmhtsrnbaj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnem1wamJkd3dsbWh0c3JuYmFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0MDA1NjMsImV4cCI6MjEwNTk3NjU2M30.v87uKHb7zYlTyPfw7jBpgwiF4vUgRiwSxpgkI7f4uGU';

const START = parseInt(process.argv[2] || '0');
const COUNT = parseInt(process.argv[3] || '50');

async function scrape(itemId, customName) {
  const url = `https://weidian.com/item.html?itemID=${itemId}`;
  try {
    const res = await axios.get(url, { 
      headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15' },
      timeout: 15000
    });
    const $ = cheerio.load(res.data);
    const scriptTag = $('#__rocker-render-inject__');
    if (scriptTag.length === 0) throw new Error('No data');
    
    const data = JSON.parse(scriptTag.attr('data-obj'));
    const itemInfo = data?.result?.default_model?.item_info;
    if (!itemInfo) throw new Error('No item info');

    const price = parseFloat(itemInfo.origin_price) || 299;
    const skuProperties = data?.result?.default_model?.sku_properties;
    let image = itemInfo.item_head;

    if (skuProperties?.attr_list) {
      const imageAttr = skuProperties.attr_list.find(attr => attr.attr_values?.some(v => v.img));
      if (imageAttr?.attr_values?.[0]?.img) {
        image = imageAttr.attr_values[0].img;
      }
    }

    if (image) {
      image = image.replace(/\?.*$/g, '');
      if (!image.startsWith('http')) image = 'https:' + image;
      image = image + '?w=800&h=800';
    }

    return { id: itemId, name: customName, price, image, link: url };
  } catch (e) {
    throw e;
  }
}

async function supabasePost(data) {
  return new Promise((ok, fail) => {
    const json = JSON.stringify(data);
    const req = https.request({
      hostname: 'qgzmpjbdwwlmhtsrnbaj.supabase.co',
      path: '/rest/v1/products',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': json.length,
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'resolution=merge-duplicates'
      }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => ok({ status: res.statusCode, data }));
    });
    req.on('error', fail);
    req.write(json);
    req.end();
  });
}

async function run() {
  console.log(`\nBatch ${START}-${START+COUNT}\n`);

  const csv = fs.readFileSync('./shoes_products.csv', 'utf8');
  const lines = csv.split('\n').filter(l => l.trim()).slice(1);

  const all = [];
  for (const line of lines) {
    const parts = line.split(',');
    if (parts.length < 3) continue;
    
    const name = parts[0].replace(/"/g, '').trim();
    const id = parts[2].replace(/"/g, '').trim();
    
    if (name && id) all.push({ name, id });
  }

  const unique = {};
  for (const p of all) unique[p.id] = p;
  const products = Object.values(unique).slice(START, START + COUNT);

  console.log(`Scraping ${products.length} shoes...\n`);

  const scraped = [];
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    process.stdout.write(`[${i+1}/${products.length}] ${p.name.slice(0,30)}... `);
    
    try {
      const data = await scrape(p.id, p.name);
      scraped.push({
        id: p.id,
        name: p.name,
        price: data.price,
        image: data.image || '',
        category: 'Shoes',
        seller: 'Weidian',
        currency: 'CNY',
        link: data.link
      });
      console.log(`✅`);
    } catch (e) {
      console.log(`❌ ${e.message}`);
    }
    
    // Delay to avoid blocking
    if (i < products.length - 1) {
      await new Promise(r => setTimeout(r, 1500 + Math.random() * 1000));
    }
  }

  if (scraped.length > 0) {
    console.log(`\nSaving ${scraped.length} products...`);
    try {
      const res = await supabasePost(scraped);
      if (res.status < 300) {
        const withImg = scraped.filter(p => p.image).length;
        console.log(`✅ Saved (${withImg} with images)\n`);
      }
    } catch (e) {
      console.log(`❌ ${e.message}\n`);
    }
  }
}

run();
