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

async function updateCategory(id, newCategory) {
  return new Promise((ok, fail) => {
    const json = JSON.stringify({ category: newCategory });
    const req = https.request({
      hostname: 'qgzmpjbdwwlmhtsrnbaj.supabase.co',
      path: `/rest/v1/products?id=eq.${id}`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': json.length,
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => ok({ status: res.statusCode }));
    });
    req.on('error', fail);
    req.write(json);
    req.end();
  });
}

async function run() {
  console.log('Extracting perfumes from Accessories...\n');
  
  const accessories = await getProducts('Accessories');
  
  for (const p of accessories) {
    const nameLower = p.name.toLowerCase();
    if (nameLower.includes('perfume') || nameLower.includes('parfum') || 
        nameLower.includes('cologne') || nameLower.includes('fragrance')) {
      await updateCategory(p.id, 'Perfume');
      console.log(`  ✅ ${p.name}: Accessories → Perfume`);
    }
  }
  
  console.log('\n✅ Done!');
}

run();
