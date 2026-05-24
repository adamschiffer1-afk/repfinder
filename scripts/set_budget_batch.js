const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
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

const ProductSchema = new mongoose.Schema({
  name: String,
  price: Number,
  category: String,
  link: String,
  image: String,
  batch: { type: String, enum: ['best', 'budget', 'random'], default: 'random' },
  isPinned: Boolean,
  clicks: Number,
  qcImages: [String],
}, { timestamps: true });

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Połączono z MongoDB');

  let updated = 0;
  for (const itemId of weidianItemIds) {
    const kakobuyLink = `https://www.kakobuy.com/item/details?url=${encodeURIComponent(`https://weidian.com/item.html?itemID=${itemId}`)}&affcode=${AFFCODE}`;
    const result = await Product.updateOne({ link: kakobuyLink }, { $set: { batch: 'budget' } });
    if (result.modifiedCount > 0) {
      console.log(`  ✅ batch=budget: itemID ${itemId}`);
      updated++;
    } else {
      console.log(`  ⚠️  Nie znaleziono: itemID ${itemId}`);
    }
  }

  console.log(`\n✨ Zaktualizowano ${updated}/${weidianItemIds.length} produktów → batch: budget`);
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
