// Używa lokalnego API endpoint
const http = require('http');

function callLocalApi(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    
    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

// Classifier (ta sama logika)
function classifyProduct(productName) {
  const name = productName.toLowerCase().trim();
  
  // SHOES
  if (name.match(/jordan|nike.*(af1|air force|dunk|air max)|yeezy|new balance|salomon|shoe|sneaker|slide|foam runner|crocs|converse|vans/)) {
    return 'shoes';
  }
  
  // HOODIES
  if (name.includes('hoodie')) return 'hoodies';
  
  // LONGSLEEVE
  if (name.match(/longsleeve|long sleeve|crewneck|sweatshirt/) && !name.includes('hoodie')) {
    return 'longsleeve';
  }
  
  // T-SHIRTS
  if (name.match(/t-shirt|tee|polo/) && !name.includes('hoodie') && !name.includes('long')) {
    return 't-shirts';
  }
  
  // JACKETS
  if (name.match(/jacket|bomber|puffer|windbreaker|moncler|north face/)) {
    return 'jackets';
  }
  
  // PANTS
  if (name.match(/pants|jeans|cargo|jogger/) && !name.includes('short')) {
    return 'pants';
  }
  
  // SHORTS
  if (name.match(/shorts|short/) && !name.includes('shirt')) {
    return 'shorts';
  }
  
  // SETS
  if (name.match(/tracksuit|set.*tech|tech.*set/)) {
    return 'sets';
  }
  
  // HEADWEAR
  if (name.match(/cap|hat|beanie|czapka|balaclava|bucket/)) {
    return 'headwear';
  }
  
  // BAGS
  if (name.match(/bag|backpack|plecak|torba|duffle/)) {
    return 'bags-backpacks';
  }
  
  // BELTS
  if (name.match(/belt|pasek/)) {
    return 'belts';
  }
  
  // ELECTRONICS
  if (name.match(/phone|airpod|speaker|charger|cable|watch.*smart/)) {
    return 'electronics';
  }
  
  return 'accessories';
}

async function fixCategories() {
  console.log('🔍 Sprawdzam czy serwer działa na localhost:3000...\n');
  
  try {
    const products = await callLocalApi('/api/products?limit=10000');
    
    if (!Array.isArray(products)) {
      console.error('❌ Nie mogę pobrać produktów. Czy serwer działa? (npm run dev)');
      process.exit(1);
    }
    
    console.log(`✅ Pobrano ${products.length} produktów\n`);
    
    // Analiza
    const updates = [];
    products.forEach(p => {
      const suggested = classifyProduct(p.name);
      if (p.category !== suggested) {
        updates.push({ id: p.id, name: p.name, from: p.category, to: suggested });
      }
    });
    
    console.log(`🔧 Produkty do zmiany: ${updates.length}\n`);
    
    if (updates.length === 0) {
      console.log('✅ Wszystkie kategorie OK!');
      return;
    }
    
    // Pokaż przykłady
    updates.slice(0, 10).forEach((u, i) => {
      console.log(`${i+1}. "${u.name}"`);
      console.log(`   ${u.from} → ${u.to}\n`);
    });
    
    console.log('\n💡 Aby zastosować zmiany, uruchom endpoint:');
    console.log('   POST /api/admin/fix-categories');
    
  } catch (err) {
    console.error('❌ Błąd:', err.message);
    console.log('\n💡 Uruchom najpierw serwer: npm run dev');
  }
}

fixCategories();
