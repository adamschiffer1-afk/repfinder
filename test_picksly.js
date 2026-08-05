require('dotenv').config({ path: '.env.local' });

async function testPicksly() {
  const apiKey = process.env.PICKSLY_API_KEY;
  const cleanUrl = 'https://weidian.com/item.html?itemID=7615309681';
  const apiUrl = `https://partner.picks.ly/api/qc/search?url=${encodeURIComponent(cleanUrl)}`;
  console.log("Fetching:", apiUrl);
  
  try {
    const response = await fetch(apiUrl, {
      headers: {
        'X-API-Key': apiKey,
        'Accept': 'application/json',
      }
    });
    const data = await response.json();
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch(err) {
    console.error(err);
  }
}

testPicksly();
