const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: String,
  category: String,
  purchaseLink: String,
  qcLink: String,
  image: String,
  createdAt: { type: Date, default: Date.now },
});

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
const { detectCategory } = require('../src/utils/categoryHelper');

const scrapedData = [
  {
    "category": "SHOES",
    "name": "AJ1 High-1",
    "purchaseLink": "https://www.kakobuy.com/item/details?url=https%3A%2F%2Fweidian.com%2Fitem.html%3FitemID%3D7505718665&affcode=xfrostyy",
    "price": "55.39$ / 50.69€",
    "qcLink": "https://t.me/smilebuyofficial/21204"
  },
  {
    "category": "SHOES",
    "name": "OG Batch Air Jordan 1 High Retro",
    "purchaseLink": "https://www.kakobuy.com/item/details?url=https%3A%2F%2Fweidian.com%2Fitem.html%3FitemID%3D7510823296&affcode=xfrostyy",
    "price": "83.00$ / 76.50€",
    "qcLink": "https://t.me/smilebuyofficial/33893"
  },
  {
    "category": "SHOES",
    "name": "LV sneakers",
    "purchaseLink": "https://www.kakobuy.com/item/details?url=https%3A%2F%2Fweidian.com%2Fitem.html%3FitemID%3D7504435211&affcode=xfrostyy",
    "price": "38.70$ / 37.34€",
    "qcLink": null
  },
  {
    "category": "T-shirt and shorts",
    "name": "Ami T-shirt",
    "purchaseLink": "https://www.kakobuy.com/item/details?url=https%3A%2F%2Fweidian.com%2Fitem.html%3FitemID%3D7508083563&affcode=xfrostyy",
    "price": "20.11$ / 19.33€",
    "qcLink": null
  },
  {
    "category": "Hoodies and Pants",
    "name": "AMI Hoodie",
    "purchaseLink": "https://www.kakobuy.com/item/details?url=https%3A%2F%2Fweidian.com%2Fitem.html%3FitemID%3D7510689781&affcode=xfrostyy",
    "price": "28.41$ / 27.07€",
    "qcLink": "https://t.me/smilebuyofficial/22874"
  },
  {
    "category": "Coats and Jackets",
    "name": "Moncler Down Jacket",
    "purchaseLink": "https://www.kakobuy.com/item/details?url=https%3A%2F%2Fweidian.com%2Fitem.html%3FitemID%3D7508772356&affcode=xfrostyy",
    "price": "52.40$ / 50.77€",
    "qcLink": "https://t.me/smilebuyofficial/22059"
  },
  {
    "category": "Accessories",
    "name": "Dior hat",
    "purchaseLink": "https://www.kakobuy.com/item/details?url=https%3A%2F%2Fweidian.com%2Fitem.html%3FitemID%3D7506393818&affcode=xfrostyy",
    "price": "14.70$ / 14.25€",
    "qcLink": "https://t.me/smilebuyofficial/20389"
  }
];

async function runImport() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Połączono z MongoDB');
  
  // Czyścimy bazę z niepełnych produktów (bez linków)
  await Product.deleteMany({ purchaseLink: "LINK" });
  await Product.deleteMany({ name: { $regex: /€/ } });
  
  for (const item of scrapedData) {
    const exists = await Product.findOne({ name: item.name });
    if (!exists) {
      const normalizedItem = {
        ...item,
        category: detectCategory(item.name)
      };
      await Product.create(normalizedItem);
      console.log(`📦 Zaimportowano: ${item.name} (${normalizedItem.category})`);
    }
  }
  
  console.log('✨ Import zakończony!');
  process.exit(0);
}

runImport();
