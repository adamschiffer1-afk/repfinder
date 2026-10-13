const https = require('https');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnem1wamJkd3dsbWh0c3JuYmFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0MDA1NjMsImV4cCI6MjEwNTk3NjU2M30.v87uKHb7zYlTyPfw7jBpgwiF4vUgRiwSxpgkI7f4uGU';

async function countByCategory(category) {
  return new Promise((ok, fail) => {
    const req = https.request({
      hostname: 'qgzmpjbdwwlmhtsrnbaj.supabase.co',
      path: `/rest/v1/products?select=count&category=eq.${encodeURIComponent(category)}`,
      method: 'HEAD',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'count=exact'
      }
    }, res => {
      const total = res.headers['content-range']?.split('/')[1] || '0';
      ok(total);
    });
    req.on('error', fail);
    req.end();
  });
}

async function run() {
  const categories = ['Shoes', 'T-Shirts', 'Shorts', 'Pants', 'Hoodies', 'Jackets', 
                     'Electronics', 'Hats', 'Belts', 'Bags', 'Jewelry', 'Sunglasses', 
                     'Socks', 'Scarves', 'Accessories', 'Wallets', 'Handbags', 'Watches'];
  
  console.log('Products by category:\n');
  let total = 0;
  for (const cat of categories) {
    const count = await countByCategory(cat);
    if (count > 0) {
      console.log(`${cat}: ${count}`);
      total += parseInt(count);
    }
  }
  console.log(`\nTotal: ${total}`);
}

run();
