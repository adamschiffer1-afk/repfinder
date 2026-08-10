/**
 * Test script to add products via Template Import API
 * Run: node add_products_test.js
 */

const links = [
  'https://weidian.com/item.html?itemID=7812389157',
  'https://weidian.com/item.html?itemID=7815391260',
  'https://weidian.com/item.html?itemID=7812410917',
  'https://weidian.com/item.html?itemID=7812414801',
  'https://weidian.com/item.html?itemID=7812456179',
  'https://weidian.com/item.html?itemID=7812377245',
  'https://weidian.com/item.html?itemID=7815468100',
  'https://weidian.com/item.html?itemID=7815381508',
  'https://weidian.com/item.html?itemID=7812434455',
  'https://weidian.com/item.html?itemID=7815422808',
  'https://weidian.com/item.html?itemID=7815493702',
  'https://weidian.com/item.html?itemID=7812464131',
  'https://weidian.com/item.html?itemID=7815466346',
  'https://weidian.com/item.html?itemID=7815403232',
  'https://weidian.com/item.html?itemID=7815495696',
  'https://weidian.com/item.html?itemID=7815452400',
  'https://weidian.com/item.html?itemID=7812402979',
  'https://weidian.com/item.html?itemID=7815450492',
  'https://weidian.com/item.html?itemID=7812401111',
  'https://weidian.com/item.html?itemID=7812373321',
  'https://weidian.com/item.html?itemID=7815440488',
  'https://weidian.com/item.html?itemID=7815418922',
  'https://weidian.com/item.html?itemID=7815383320',
  'https://weidian.com/item.html?itemID=7812369455',
  'https://weidian.com/item.html?itemID=7815397278',
  'https://weidian.com/item.html?itemID=7815448408',
  'https://weidian.com/item.html?itemID=7815440474',
  'https://weidian.com/item.html?itemID=7812462079',
  'https://weidian.com/item.html?itemID=7815497656',
  'https://weidian.com/item.html?itemID=7812365455',
  'https://weidian.com/item.html?itemID=7812460103',
  'https://weidian.com/item.html?itemID=7815387242',
  'https://weidian.com/item.html?itemID=7812485693',
  'https://weidian.com/item.html?itemID=7815383556',
  'https://weidian.com/item.html?itemID=7815468302',
  'https://weidian.com/item.html?itemID=7812444383',
  'https://weidian.com/item.html?itemID=7812414797',
  'https://weidian.com/item.html?itemID=7812420757',
  'https://weidian.com/item.html?itemID=7812379253',
  'https://weidian.com/item.html?itemID=7815393274',
  'https://weidian.com/item.html?itemID=7812399157',
  'https://weidian.com/item.html?itemID=7815391268',
  'https://weidian.com/item.html?itemID=7815379472',
  'https://weidian.com/item.html?itemID=7815440508',
  'https://weidian.com/item.html?itemID=7812426015',
  'https://weidian.com/item.html?itemID=7812491641',
  'https://weidian.com/item.html?itemID=7815440514',
  'https://weidian.com/item.html?itemID=7812401129',
  'https://weidian.com/item.html?itemID=7812383447',
  'https://weidian.com/item.html?itemID=7812444627',
  'https://weidian.com/item.html?itemID=7815293360',
  'https://weidian.com/item.html?itemID=7812373497',
  'https://weidian.com/item.html?itemID=7812438485',
  'https://weidian.com/item.html?itemID=7812283347',
  'https://weidian.com/item.html?itemID=7815293348'
];

const products = links.map((url, i) => ({
  name: `Product ${i + 1}`,
  url: url
}));

async function testTemplateImport() {
  console.log(`Testing Template Import API with ${products.length} products...`);
  
  try {
    const response = await fetch('https://repfinder.xyz/api/admin/scrape/template', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // You need to add your auth cookie here
      },
      body: JSON.stringify({
        products: products,
        replaceMode: 'none',
        batch: 'best',
        pin: false,
        startOrder: 1
      })
    });

    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log(`\n✅ Success! Created: ${data.created}, Updated: ${data.updated}, Failed: ${data.failures}`);
    } else {
      console.log(`\n❌ Error: ${data.error}`);
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

testTemplateImport();
