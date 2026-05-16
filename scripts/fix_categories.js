const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { detectCategory } = require('../src/utils/categoryHelper');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
const PRODUCTS_DATA_PATH = path.join(__dirname, '../src/data/productsData.js');

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: Number,
  category: String,
  link: String,
  image: String,
  batch: String,
  createdAt: { type: Date, default: Date.now },
});
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

async function run() {
    console.log('🚀 Starting Category Fix Migration...');

    // 1. Fix productsData.js
    console.log(`📖 Reading ${PRODUCTS_DATA_PATH}...`);
    let content = fs.readFileSync(PRODUCTS_DATA_PATH, 'utf8');
    
    // Extract productsData array
    const match = content.match(/export const productsData = (\[[\s\S]*?\]);/);
    if (!match) {
        console.error('❌ Could not find productsData array in file.');
    } else {
        console.log('🔄 Re-categorizing products in file...');
        // We use eval to get the array easily (it's a trusted internal file)
        const products = eval(match[1]);
        let updateCount = 0;

        const updatedProducts = products.map(p => {
            if (!p || !p.name) return p;
            const newCat = detectCategory(p.name);
            if (newCat !== p.category) {
                updateCount++;
                return { ...p, category: newCat };
            }
            return p;
        });

        if (updateCount > 0) {
            console.log(`✨ Found ${updateCount} products with incorrect categories in file.`);
            // Format back to string (pretty print)
            const updatedContent = content.replace(
                /export const productsData = \[[\s\S]*?\];/,
                `export const productsData = ${JSON.stringify(updatedProducts, null, 2)};`
            );
            fs.writeFileSync(PRODUCTS_DATA_PATH, updatedContent);
            console.log('✅ productsData.js updated!');
        } else {
            console.log('ℹ️ No changes needed in productsData.js.');
        }
    }

    // 2. Fix MongoDB
    if (MONGODB_URI) {
        try {
            console.log('🔗 Connecting to MongoDB...');
            await mongoose.connect(MONGODB_URI);
            console.log('✅ Connected!');

            const dbProducts = await Product.find({});
            console.log(`📦 Found ${dbProducts.length} products in database.`);
            
            let dbUpdateCount = 0;
            for (const doc of dbProducts) {
                const newCat = detectCategory(doc.name);
                if (newCat !== doc.category) {
                    doc.category = newCat;
                    await doc.save();
                    dbUpdateCount++;
                }
            }

            console.log(`✅ Updated ${dbUpdateCount} products in MongoDB.`);
        } catch (err) {
            console.error('💥 MongoDB Error:', err.message);
        } finally {
            await mongoose.disconnect();
        }
    } else {
        console.warn('⚠️ MONGODB_URI not found in .env.local, skipping DB update.');
    }

    console.log('\n🎉 Migration complete!');
    process.exit(0);
}

run();
