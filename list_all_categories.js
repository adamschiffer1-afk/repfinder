const https = require('https');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnem1wamJkd3dsbWh0c3JuYmFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0MDA1NjMsImV4cCI6MjEwNTk3NjU2M30.v87uKHb7zYlTyPfw7jBpgwiF4vUgRiwSxpgkI7f4uGU';

async function getCategories() {
  return new Promise((ok, fail) => {
    const req = https.request({
      hostname: 'qgzmpjbdwwlmhtsrnbaj.supabase.co',
      path: '/rest/v1/products?select=category',
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const products = JSON.parse(data);
        const cats = {};
        products.forEach(p => {
          cats[p.category] = (cats[p.category] || 0) + 1;
        });
        ok(cats);
      });
    });
    req.on('error', fail);
    req.end();
  });
}

async function run() {
  const cats = await getCategories();
  console.log('All categories:\n');
  let total = 0;
  Object.entries(cats).sort((a,b) => b[1] - a[1]).forEach(([cat, count]) => {
    console.log(`${cat}: ${count}`);
    total += count;
  });
  console.log(`\nTotal: ${total}`);
}

run();
