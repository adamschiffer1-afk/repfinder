require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function testPicksly(itemID) {
  const apiKey = process.env.PICKSLY_API_KEY;
  const cleanUrl = `https://weidian.com/item.html?itemID=${itemID}`;
  const apiUrl = `https://partner.picks.ly/api/qc/search?url=${encodeURIComponent(cleanUrl)}`;
  
  try {
    const response = await fetch(apiUrl, {
      headers: {
        'X-API-Key': apiKey,
        'Accept': 'application/json',
      }
    });
    const data = await response.json();
    if (data.success && data.albums?.length > 0) {
       console.log(`Success! Item ID ${itemID} -> Found ${data.albums?.length} albums.`);
       return true;
    }
  } catch(err) {
  }
  return false;
}

async function checkPickslyDB() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Product = mongoose.models.Product || mongoose.model('Product', new mongoose.Schema({}, { strict: false }));
  
  const products = await Product.find({ link: /weidian\.com/ }).limit(50);
  console.log(`Testing ${products.length} products from DB against Picks.ly...`);
  
  let found = 0;
  for (const product of products) {
    const match = product.link.match(/itemID=(\d+)/);
    if (match && match[1]) {
       const hasQC = await testPicksly(match[1]);
       if (hasQC) found++;
       if (found > 3) break; // just find a few
    }
  }
  
  if (found === 0) console.log("None of the tested products had QC on Picks.ly.");
  await mongoose.connection.close();
}

checkPickslyDB();
