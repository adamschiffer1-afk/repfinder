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

function categorizeAccessory(name) {
  const nameLower = name.toLowerCase();
  
  // Headwear
  if (nameLower.includes('hat') || nameLower.includes('cap') || 
      nameLower.includes('beanie') || nameLower.includes('czapka')) {
    return 'Headwear';
  }
  
  // Belts
  if (nameLower.includes('belt') || nameLower.includes('pasek')) {
    return 'Belts';
  }
  
  // Bags & backpacks
  if (nameLower.includes('bag') || nameLower.includes('backpack') || 
      nameLower.includes('duffle') || nameLower.includes('tote') ||
      nameLower.includes('wallet') || nameLower.includes('portfel')) {
    return 'Bags & backpacks';
  }
  
  // Electronics
  if (nameLower.includes('airpod') || nameLower.includes('speaker') ||
      nameLower.includes('beats') || nameLower.includes('charger') ||
      nameLower.includes('phone case') || nameLower.includes('watch') ||
      nameLower.includes('zegarek')) {
    return 'Electronics';
  }
  
  // Jackets (some Descente items)
  if (nameLower.includes('jacket') || nameLower.includes('kurtka') ||
      nameLower.includes('down jacket')) {
    return 'Jackets';
  }
  
  // Keep as Accessories for: socks, jewelry, sunglasses, perfumes, etc.
  return 'Accessories';
}

async function run() {
  console.log('Fixing categories...\n');
  
  // 1. Fix Clothing → Sets
  console.log('1. Clothing → Sets');
  const clothing = await getProducts('Clothing');
  for (const p of clothing) {
    await updateCategory(p.id, 'Sets');
    console.log(`  ✅ ${p.name}: Clothing → Sets`);
  }
  
  // 2. Fix Sweaters → Longsleeve
  console.log('\n2. Sweaters → Longsleeve');
  const sweaters = await getProducts('Sweaters');
  for (const p of sweaters) {
    await updateCategory(p.id, 'Longsleeve');
    console.log(`  ✅ ${p.name}: Sweaters → Longsleeve`);
  }
  
  // 3. Fix Bags → Bags & backpacks
  console.log('\n3. Bags → Bags & backpacks');
  const bags = await getProducts('Bags');
  for (const p of bags) {
    await updateCategory(p.id, 'Bags & backpacks');
    console.log(`  ✅ ${p.name}: Bags → Bags & backpacks`);
  }
  
  // 4. Recategorize Accessories
  console.log('\n4. Recategorizing Accessories (156 products)');
  const accessories = await getProducts('Accessories');
  for (const p of accessories) {
    const newCat = categorizeAccessory(p.name);
    if (newCat !== 'Accessories') {
      await updateCategory(p.id, newCat);
      console.log(`  ✅ ${p.name}: Accessories → ${newCat}`);
    }
  }
  
  console.log('\n✅ Done!');
}

run();
