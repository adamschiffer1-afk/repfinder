const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in .env.local');
  process.exit(1);
}

// Define compatible schema matching Next.js Product model
const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String, required: true },
  category: { type: String, required: true },
  batch: { type: String, default: 'random' },
  link: { type: String, required: true },
  clicks: { type: Number, default: 0 },
  isPinned: { type: Boolean, default: false },
  qcImages: { type: [String], default: [] }
}, {
  timestamps: true
});

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
const { detectCategory } = require('../src/utils/categoryHelper');

// Helper to extract original Weidian/Taobao/1688 link from agent link
function extractOriginalLink(agentUrl) {
  if (!agentUrl) return null;
  try {
    const parsed = new URL(agentUrl);
    // Common query params for original URL
    const params = ['url', 'itemurl', 'link', 'id'];
    for (const param of params) {
      const val = parsed.searchParams.get(param);
      if (val) {
        const decoded = decodeURIComponent(val);
        if (
          decoded.includes('weidian.com') ||
          decoded.includes('taobao.com') ||
          decoded.includes('1688.com') ||
          decoded.includes('tmall.com')
        ) {
          return decoded;
        }
      }
    }
  } catch (e) {
    // Not a valid URL
  }
  return null;
}

async function scrapeTelegramChannel(pages = 3) {
  console.log(`🚀 Starting Telegram scraper for @smilebuyofficial (fetching ${pages} pages)...`);
  
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clean up bad product entries from previous runs (bad parses containing 'Price:')
    await Product.deleteMany({ name: { $regex: 'Price:' } });
    console.log('🧹 Cleaned up previously imported bad product entries.');

    let currentUrl = 'https://t.me/s/smilebuyofficial';
    const allParsedProducts = [];

    for (let pageNum = 0; pageNum < pages; pageNum++) {
      console.log(`📄 Fetching page ${pageNum + 1}: ${currentUrl}`);
      const response = await axios.get(currentUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      
      const $ = cheerio.load(response.data);
      const messages = $('.tgme_widget_message_wrap').toArray();
      
      if (messages.length === 0) {
        console.log('⚠️ No messages found on this page.');
        break;
      }

      let currentProduct = null;

      // Parse messages sequentially to properly group media groups
      for (const msgEl of messages) {
        const $msg = $(msgEl);
        
        // Replace <br> with newlines inside cheerio before extracting text
        $msg.find('.tgme_widget_message_text br').replaceWith('\n');
        const text = $msg.find('.tgme_widget_message_text').text() || '';
        
        // Find all photos in this message
        const messagePhotos = [];
        $msg.find('.tgme_widget_message_photo_wrap').each((i, photoEl) => {
          const style = $(photoEl).attr('style') || '';
          const match = style.match(/background-image:\s*url\(['"]?(.*?)['"]?\)/i);
          if (match && match[1]) {
            messagePhotos.push(match[1]);
          }
        });

        // 1. Detect if this is a new product listing (contains "Article:" or "Article :")
        if (text.includes('Article:')) {
          // If we had a previous product, save it to our parsed list
          if (currentProduct) {
            allParsedProducts.push(currentProduct);
          }

          // Parse new product details
          const nameMatch = text.match(/Article:\s*([^\n\r]+)/i);
          const priceMatch = text.match(/Price:\s*([\d.]+)/i);
          
          const productName = nameMatch ? nameMatch[1].trim() : 'Unknown Product';
          const productPrice = priceMatch ? parseFloat(priceMatch[1]) : 0;

          // Find purchase links inside the text
          let originalLink = null;
          $msg.find('.tgme_widget_message_text a').each((i, linkEl) => {
            const href = $(linkEl).attr('href');
            const extracted = extractOriginalLink(href);
            if (extracted) {
              originalLink = extracted;
            }
          });

          // If no original link was found in agent URLs, fallback to any raw link inside the message text
          if (!originalLink) {
            $msg.find('.tgme_widget_message_text a').each((i, linkEl) => {
              const href = $(linkEl).attr('href') || '';
              if (
                href.includes('weidian.com') ||
                href.includes('taobao.com') ||
                href.includes('1688.com') ||
                href.includes('tmall.com')
              ) {
                originalLink = href;
              }
            });
          }

          currentProduct = {
            name: productName,
            price: productPrice,
            category: detectCategory(productName),
            link: originalLink || 'https://weidian.com', // fallback
            qcImages: messagePhotos,
            image: messagePhotos[0] || '/placeholder.png' // default preview image
          };

        } else if (currentProduct && messagePhotos.length > 0 && !text.includes('Article:')) {
          // 2. This is an adjacent media group message belonging to the active product
          currentProduct.qcImages = [...currentProduct.qcImages, ...messagePhotos];
          if (currentProduct.image === '/placeholder.png' && messagePhotos[0]) {
            currentProduct.image = messagePhotos[0];
          }
        }
      }

      // Add the last parsed product on this page
      if (currentProduct) {
        allParsedProducts.push(currentProduct);
      }

      // Find the URL for the previous page (older messages)
      const prevLinkEl = $('link[rel="prev"]');
      if (prevLinkEl.length > 0 && prevLinkEl.attr('href')) {
        const href = prevLinkEl.attr('href');
        currentUrl = href.startsWith('http') ? href : `https://t.me${href}`;
      } else {
        console.log('ℹ️ No previous page link found, stopping page iteration.');
        break;
      }
    }

    console.log(`📊 Scraped total of ${allParsedProducts.length} potential product listings.`);

    // 5. Upsert products into MongoDB database
    let addedCount = 0;
    let updatedCount = 0;

    for (const parsed of allParsedProducts) {
      // Validate that the product has QC images
      if (parsed.qcImages.length === 0) {
        continue;
      }

      // Check if product with this link already exists in the database
      const existingProduct = await Product.findOne({ link: parsed.link });

      if (existingProduct) {
        // Update existing product with Telegram QC images
        existingProduct.qcImages = parsed.qcImages;
        // If it doesn't have a valid preview image, update it
        if (!existingProduct.image || existingProduct.image === '/placeholder.png' || existingProduct.image.startsWith('/')) {
          existingProduct.image = parsed.image;
        }
        await existingProduct.save();
        updatedCount++;
      } else {
        // Create a new product record
        await Product.create(parsed);
        addedCount++;
        console.log(`➕ Added new product: ${parsed.name} (${parsed.price}$)`);
      }
    }

    console.log('\n✨ SCRAPING COMPLETED!');
    console.log(`📦 Added new products: ${addedCount}`);
    console.log(`🔄 Updated existing products: ${updatedCount}`);
    process.exit(0);

  } catch (error) {
    console.error('❌ Scraper failed with error:', error);
    process.exit(1);
  }
}

// Run scraper for the last 3 pages of the channel
scrapeTelegramChannel(3);
