const https = require('https');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnem1wamJkd3dsbWh0c3JuYmFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0MDA1NjMsImV4cCI6MjEwNTk3NjU2M30.v87uKHb7zYlTyPfw7jBpgwiF4vUgRiwSxpgkI7f4uGU';

async function getProducts(category) {
  return new Promise((ok, fail) => {
    const req = https.request({
      hostname: 'qgzmpjbdwwlmhtsrnbaj.supabase.co',
      path: `/rest/v1/products?select=id,name,category&category=eq.${encodeURIComponent(category)}`,
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => ok(JSON.parse(data)));
    });
    req.on('error', fail);
    req.end();
  });
}

async function run() {
  console.log('=== ACCESSORIES (156 produktów) ===\n');
  const accessories = await getProducts('Accessories');
  accessories.slice(0, 20).forEach(p => {
    console.log(`- ${p.name}`);
  });
  
  console.log('\n=== CLOTHING (15 produktów) ===\n');
  const clothing = await getProducts('Clothing');
  clothing.forEach(p => {
    console.log(`- ${p.name}`);
  });
}

run();
