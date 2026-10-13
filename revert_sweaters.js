const https = require('https');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnem1wamJkd3dsbWh0c3JuYmFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0MDA1NjMsImV4cCI6MjEwNTk3NjU2M30.v87uKHb7zYlTyPfw7jBpgwiF4vUgRiwSxpgkI7f4uGU';

async function updateAllCategories(oldCat, newCat) {
  return new Promise((ok, fail) => {
    const json = JSON.stringify({ category: newCat });
    const req = https.request({
      hostname: 'qgzmpjbdwwlmhtsrnbaj.supabase.co',
      path: `/rest/v1/products?category=eq.${encodeURIComponent(oldCat)}`,
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
  console.log('Reverting Longsleeve → Sweaters...');
  await updateAllCategories('Longsleeve', 'Sweaters');
  console.log('✅ Done! All Longsleeve products changed to Sweaters');
}

run();
