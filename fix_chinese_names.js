require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

const ProductSchema = new mongoose.Schema({
  name: String,
  isPinned: Boolean
}, { timestamps: true });

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

// Chinese to English brand mapping
const CHINESE_BRAND_MAP = {
  '香奈儿': 'Chanel',
  '香 奈 儿': 'Chanel',
  '迪奥': 'Dior',
  '迪 奥': 'Dior',
  '蔻驰': 'Coach',
  '蔻 驰': 'Coach',
  '芬迪': 'Fendi',
  '芬 迪': 'Fendi',
  '古驰': 'Gucci',
  '古 驰': 'Gucci',
  '巴黎世家': 'Balenciaga',
  '巴 黎 世 家': 'Balenciaga',
  '圣罗兰': 'YSL',
  '圣 罗 兰': 'YSL',
  '路铂廷': 'Louboutin',
  '路 铂 廷': 'Louboutin',
  '爱马仕': 'Hermès',
  '爱 马 仕': 'Hermès',
  '华伦天奴': 'Valentino',
  '华 伦 天 奴': 'Valentino',
  '万斯': 'Vans',
  '万 斯': 'Vans',
  '天梭': 'Tissot',
  '安德玛': 'Under Armour',
  '安 德 玛': 'Under Armour',
  '亚瑟士': 'Asics',
  '亚 瑟 士': 'Asics',
  '马吉拉': 'Margiela',
  '马 吉 拉': 'Margiela',
  '欧米茄': 'Omega',
  '欧 米 茄': 'Omega',
  '普瑞米亚达': 'Premiata',
  '普 瑞 米 亚 达': 'Premiata',
  '埃米尔': 'Amiri',
  '埃 米 尔': 'Amiri',
  '勃肯': 'Birkenstock',
  '勃 肯': 'Birkenstock',
  '西班牙': 'Spain',
  '西 班 牙': 'Spain',
  '小蜜蜂': 'Bee',
};

// Chinese product type mapping
const CHINESE_TYPE_MAP = {
  '耳环': 'Earrings',
  '项链': 'Necklace',
  '书包': 'Backpack',
  '鞋子': 'Shoes',
  '休闲鞋': 'Casual Shoes',
  '渔夫帽': 'Bucket Hat',
  '包': 'Bag',
  '包包': 'Bag',
  '人字拖': 'Flip Flops',
  '短袖': 'T-shirt',
  '靴子': 'Boots',
  '卡包': 'Card Holder',
  '乐福鞋': 'Loafers',
  '拖鞋': 'Slippers',
  '高跟鞋': 'High Heels',
  '弹簧鞋': 'Spring Shoes',
  '旅行包': 'Travel Bag',
  '手表': 'Watch',
  '手镯': 'Bracelet',
  '运动鞋': 'Sneakers',
  '铆钉红宝石运动鞋': 'Studded Ruby Sneakers',
  '单肩包': 'Shoulder Bag',
  '运动套装': 'Tracksuit',
  '高帮鞋': 'High-top Shoes',
  '风衣': 'Trench Coat',
  '低帮鞋': 'Low-top Shoes',
  '连帽衫': 'Hoodie',
  '外套': 'Jacket',
  '闪钻拖鞋': 'Rhinestone Slippers',
  '鲨鱼': 'Shark',
  '卫星': 'Satellite',
};

function cleanChineseName(name) {
  let cleaned = name;
  
  // Replace Chinese brands
  for (const [chinese, english] of Object.entries(CHINESE_BRAND_MAP)) {
    const regex = new RegExp(chinese, 'g');
    cleaned = cleaned.replace(regex, english);
  }
  
  // Replace Chinese product types
  for (const [chinese, english] of Object.entries(CHINESE_TYPE_MAP)) {
    const regex = new RegExp(chinese, 'g');
    cleaned = cleaned.replace(regex, english);
  }
  
  // Remove any remaining Chinese characters
  cleaned = cleaned.replace(/[\u4e00-\u9fa5]/g, '');
  
  // Clean up extra spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // If the result is empty or too short, return a generic name
  if (cleaned.length < 3) {
    cleaned = 'Product';
  }
  
  return cleaned;
}

async function fixChineseNames() {
  try {
    console.log('🔌 Łączenie z MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Połączono z MongoDB\n');

    // Get all products
    const allProducts = await Product.find({ 
      $or: [{ isPinned: false }, { isPinned: { $exists: false } }]
    });
    
    const chineseRegex = /[\u4e00-\u9fa5]/;
    const productsWithChinese = allProducts.filter(p => chineseRegex.test(p.name));

    console.log(`🔍 Znaleziono ${productsWithChinese.length} produktów z chińskimi znakami\n`);

    let fixedCount = 0;

    for (const product of productsWithChinese) {
      const newName = cleanChineseName(product.name);
      
      if (newName !== product.name) {
        await Product.updateOne(
          { _id: product._id },
          { $set: { name: newName } }
        );
        console.log(`✅ [${fixedCount + 1}/${productsWithChinese.length}] "${product.name}" → "${newName}"`);
        fixedCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Naprawiono: ${fixedCount} produktów`);
    console.log('='.repeat(60));

    await mongoose.connection.close();
    console.log('\n✅ Gotowe!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Błąd:', error.message);
    console.error(error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
}

fixChineseNames();
