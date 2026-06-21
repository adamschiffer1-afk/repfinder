require('dotenv').config({ path: '.env.local' });

async function testPicksly() {
  const apiKey = process.env.PICKSLY_API_KEY;
  // A popular Weidian link (e.g., VT batch dunks)
  const links = [
    'https://weidian.com/item.html?itemID=5608879229', // VT Dunks very popular
    'https://item.taobao.com/item.htm?id=693338371077', 
    'https://weidian.com/item.html?itemID=4428977916', // LJR Jordan 1
  ];

  for (const url of links) {
    console.log(`Testing: ${url}`);
    const apiUrl = `https://partner.picks.ly/api/qc/search?url=${encodeURIComponent(url)}`;
    try {
      const response = await fetch(apiUrl, {
        headers: {
          'X-API-Key': apiKey,
          'Accept': 'application/json',
        }
      });
      const data = await response.json();
      if (data.success) {
        console.log(`✅ Success! Found ${data.albums?.length} albums.`);
      } else {
        console.log(`❌ Failed: ${data.error}`);
      }
    } catch(err) {
      console.error(err);
    }
  }
}

testPicksly();
