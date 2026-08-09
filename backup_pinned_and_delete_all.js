/**
 * Backup Pinned Products & Delete All Products
 * 
 * This script:
 * 1. Exports all pinned products to a JSON backup file
 * 2. Deletes ALL products from the database
 * 
 * Usage: node backup_pinned_and_delete_all.js
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env.local');
  process.exit(1);
}

// Product Schema (simplified)
const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  image: String,
  category: String,
  batch: String,
  link: String,
  clicks: Number,
  isPinned: Boolean,
  pinnedOrder: Number,
  qcImages: [{
    url: String,
    colorway: String,
    addedAt: Date
  }],
  createdAt: Date,
  updatedAt: Date
}, { timestamps: true });

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

async function main() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Find and export pinned products
    console.log('📦 Fetching pinned products...');
    const pinnedProducts = await Product.find({ isPinned: true }).sort({ pinnedOrder: 1 }).lean();
    
    console.log(`✅ Found ${pinnedProducts.length} pinned products\n`);

    if (pinnedProducts.length > 0) {
      // Create backup directory if it doesn't exist
      const backupDir = path.join(__dirname, 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir);
      }

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
      const backupFilename = `pinned_products_backup_${timestamp}.json`;
      const backupPath = path.join(backupDir, backupFilename);

      // Write to file
      fs.writeFileSync(backupPath, JSON.stringify(pinnedProducts, null, 2), 'utf-8');
      console.log(`💾 Backup saved to: ${backupPath}`);
      console.log(`📊 Backup contains ${pinnedProducts.length} pinned products\n`);

      // Show preview of backed up products
      console.log('📋 Preview of backed up products:');
      pinnedProducts.slice(0, 5).forEach((product, index) => {
        console.log(`   ${index + 1}. ${product.name} (Order: ${product.pinnedOrder})`);
      });
      if (pinnedProducts.length > 5) {
        console.log(`   ... and ${pinnedProducts.length - 5} more products`);
      }
      console.log('');
    } else {
      console.log('ℹ️  No pinned products found to backup\n');
    }

    // Step 2: Confirm deletion
    console.log('⚠️  WARNING: This will delete ALL products from the database!');
    console.log('⚠️  This action CANNOT be undone!\n');
    
    // Count all products
    const totalProducts = await Product.countDocuments();
    console.log(`📊 Total products in database: ${totalProducts}`);
    console.log(`   - Pinned: ${pinnedProducts.length}`);
    console.log(`   - Unpinned: ${totalProducts - pinnedProducts.length}\n`);

    // Auto-confirm (you can comment this out if you want manual confirmation)
    console.log('🗑️  Proceeding with deletion...\n');

    // Delete all products
    console.log('🗑️  Deleting all products...');
    const deleteResult = await Product.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} products\n`);

    // Verify deletion
    const remainingProducts = await Product.countDocuments();
    console.log(`📊 Remaining products: ${remainingProducts}`);

    if (remainingProducts === 0) {
      console.log('\n✨ SUCCESS! All products have been deleted.');
      if (pinnedProducts.length > 0) {
        console.log(`💾 Backup of ${pinnedProducts.length} pinned products saved in ./backups/`);
      }
    } else {
      console.log('\n⚠️  WARNING: Some products may still remain in the database!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

main();
