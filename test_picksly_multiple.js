require('dotenv').config({ path: '.env.local' });

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
    console.log(`Item ID ${itemID} ->`, data.success ? `Success! Found ${data.albums?.length} albums.` : `Failed: ${data.error}`);
  } catch(err) {
    console.error(err);
  }
}

async function testAll() {
  await testPicksly('7639236380');
  await testPicksly('7636362639');
  await testPicksly('7639335040');
  await testPicksly('7650249015');
}

testAll();
