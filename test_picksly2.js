require('dotenv').config({ path: '.env.local' });

async function testPicksly() {
  const apiKey = process.env.PICKSLY_API_KEY;
  const kakobuyUrl = 'https://www.kakobuy.com/item/details?url=https%3A%2F%2Fweidian.com%2Fitem.html%3FitemID%3D7615309681&affcode=xfrostyy';
  const weidianUrl = 'https://weidian.com/item.html?itemID=7615309681';
  
  console.log("Testing Kakobuy URL...");
  try {
    const res1 = await fetch(`https://partner.picks.ly/api/qc/search?url=${encodeURIComponent(kakobuyUrl)}`, { headers: { 'X-API-Key': apiKey, 'Accept': 'application/json' } });
    console.log("Kakobuy Result:", await res1.json());
  } catch(e) { console.error(e) }

  console.log("\nTesting Weidian URL...");
  try {
    const res2 = await fetch(`https://partner.picks.ly/api/qc/search?url=${encodeURIComponent(weidianUrl)}`, { headers: { 'X-API-Key': apiKey, 'Accept': 'application/json' } });
    console.log("Weidian Result:", await res2.json());
  } catch(e) { console.error(e) }
}

testPicksly();
