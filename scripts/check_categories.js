const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const AFFCODE = 'xfrostyy';
const weidianItemIds = [
  '7768964356', '7765938955', '7765944855', '7768974132', '7769003888',
  '7768970284', '7768893560', '7765954171', '7765942871', '7768913208',
  '7765915371', '7768974134', '7766003953', '7769003890', '7768964372',
  '7766007905', '7765948737', '7768950510', '7768905364', '7766005793',
  '7765851545', '7768988102', '7768901436', '7765925131', '7766015881',
  '7768925008', '7765942883', '7768962396', '7765948743', '7768913216',
  '7765972395', '7766025667', '7765990147', '7765915365', '7765911439',
  '7768980152', '7765970411', '7768970294', '7769013674', '7765851553',
  '7769009736', '7768917118', '7768950518', '7768923046'
];

const PS = new mongoose.Schema({ name: String, category: String, link: String }, { timestamps: true });
const Product = mongoose.models.Product || mongoose.model('Product', PS);

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  for (let i = 0; i < weidianItemIds.length; i++) {
    const id = weidianItemIds[i];
    const link = `https://www.kakobuy.com/item/details?url=${encodeURIComponent(`https://weidian.com/item.html?itemID=${id}`)}&affcode=${AFFCODE}`;
    const p = await Product.findOne({ link });
    if (p) {
      console.log(`[${String(i+1).padStart(2)}] ${p.name.substring(0,45).padEnd(45)} | ${p.category}`);
    } else {
      console.log(`[${String(i+1).padStart(2)}] itemID ${id} → NOT FOUND`);
    }
  }
  process.exit(0);
}
run();
