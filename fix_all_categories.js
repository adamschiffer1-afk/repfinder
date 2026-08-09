/**
 * Fix All Product Categories Script
 * 
 * Analyzes all products in the database and corrects miscategorized items
 * Run with: node fix_all_categories.js
 */

const mongoose = require('mongoose');
const { detectCategory } = require('./src/utils/categoryHelper.js');

// MongoDB connection (password URL-encoded: _ stays as _)
const MONGODB_URI = 'mongodb+srv://repfinder:kutasA321_%40@repfinder.vejrrn.mongodb.net/repfinder?retryWrites=true&w=majority';

// Product Schema (copy from your model)
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['shoes', 'hoodies', 't-shirts', 'pants', 'shorts', 'jackets', 'sets', 'accessories'],
    default: 't-shirts'
  },
  batch: { 
    type: String, 
    enum: ['best', 'budget', 'random', 'popular'],
    default: 'best'
  },
  link: { type: String, required: true },
  clicks: { type: Number, default: 0 },
  isPinned: { type: Boolean, default: false },
  pinnedOrder: { type: Number, default: 999999 }
}, { timestamps: true });

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

async function fixAllCategories() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('📦 Fetching all products...');
    const products = await Product.find({});
    console.log(`Found ${products.length} products\n`);

    let fixed = 0;
    let unchanged = 0;
    const changes = [];

    console.log('🔍 Analyzing categories...\n');

    for (const product of products) {
      const currentCategory = product.category;
      const correctCategory = detectCategory(product.name);

      if (currentCategory !== correctCategory) {
        console.log(`❌ WRONG: "${product.name}"`);
        console.log(`   Was: ${currentCategory} → Should be: ${correctCategory}`);
        
        product.category = correctCategory;
        await product.save();
        
        changes.push({
          name: product.name,
          oldCategory: currentCategory,
          newCategory: correctCategory
        });
        
        fixed++;
      } else {
        unchanged++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total products: ${products.length}`);
    console.log(`✅ Fixed: ${fixed}`);
    console.log(`✓ Already correct: ${unchanged}`);
    console.log('='.repeat(60));

    if (changes.length > 0) {
      console.log('\n📋 DETAILED CHANGES:\n');
      changes.forEach((change, index) => {
        console.log(`${index + 1}. "${change.name}"`);
        console.log(`   ${change.oldCategory} → ${change.newCategory}\n`);
      });
    }

    await mongoose.connection.close();
    console.log('\n✅ Done! Database connection closed.');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
fixAllCategories();
