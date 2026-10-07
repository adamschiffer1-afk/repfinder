import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { config } from 'dotenv';
import { readFileSync } from 'fs';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const CSV_FILE = 'jackets_import.csv'; // Local CSV file
const AFFILIATE_CODE = 'xfrostyy';
const USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';

// Delays
const REQUEST_DELAY = 1500; // 1.5 seconds between requests
const BATCH_DELAY = 5000; // 5 seconds between batches
const BATCH_SIZE = 15; // Process 15 products at a time

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-')         // Spaces to hyphens
    .replace(/-+/g, '-')          // Multiple hyphens to single
    .trim()
    .substring(0, 100);           // Limit length
}

function cleanName(name) {
  const fallback = 'Weidian Product';
  const normalized = String(name || fallback).replace(/\s+/g, ' ').trim() || fallback;
  if (normalized.length <= 60) return normalized;
  return `${normalized.slice(0, 57).trimEnd()}...`;
}

function formatImageUrl(imageUrl) {
  if (!imageUrl) return 'https://via.placeholder.com/400x400?text=No+Image';
  const absoluteUrl = imageUrl.startsWith('http') ? imageUrl : `https:${imageUrl}`;
  const separator = absoluteUrl.includes('?') ? '&' : '?';
  return `${absoluteUrl}${separator}w=400&h=400`;
}

function getAffiliateLink(weidianUrl) {
  return `https://www.kakobuy.com/item/details?url=${encodeURIComponent(weidianUrl)}&affcode=${AFFILIATE_CODE}`;
}

// All products in jackets_import.csv are jackets
function detectCategory(name) {
  return 'jackets';
}

async function scrapeWeidianProduct(weidianUrl, retryCount = 0) {
  try {
    console.log(`  📡 Scraping: ${weidianUrl}`);
    
    const response = await axios.get(weidianUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Referer': 'https://weidian.com/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache'
      },
      timeout: 20000,
      maxRedirects: 5
    });

    const $ = cheerio.load(response.data);
    const scriptTag = $('#__rocker-render-inject__');

    if (scriptTag.length === 0) {
      throw new Error('Could not find product data');
    }

    const data = JSON.parse(scriptTag.attr('data-obj'));
    const itemInfo = data?.result?.default_model?.item_info;
    
    if (!itemInfo) {
      throw new Error('Missing item info');
    }

    const priceCny = Number.parseFloat(itemInfo.origin_price);
    const priceUsd = Number.isFinite(priceCny) ? Number((priceCny * 0.14).toFixed(2)) : 10.00;
    const image = formatImageUrl(itemInfo.item_head);

    return {
      price: priceUsd,
      image,
      scraped: true
    };
  } catch (error) {
    if (retryCount < 2) {
      console.log(`  ⚠️  Retry ${retryCount + 1}/2: ${error.message}`);
      await sleep(3000);
      return scrapeWeidianProduct(weidianUrl, retryCount + 1);
    }
    
    console.log(`  ⚠️  Using fallback data: ${error.message}`);
    return {
      price: 10.00,
      image: 'https://via.placeholder.com/400x400?text=No+Image',
      scraped: false
    };
  }
}

async function fetchLocalCSV() {
  console.log(`📥 Reading local CSV file: ${CSV_FILE}\n`);
  
  const csvContent = readFileSync(CSV_FILE, 'utf-8');
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  const products = [];
  for (let i = 1; i < lines.length; i++) { // Skip header
    const [name, link] = lines[i].split(',').map(s => s.trim().replace(/^"|"$/g, ''));
    if (name && link && link.includes('weidian.com')) {
      products.push({ name, url: link });
    }
  }
  
  console.log(`✅ Found ${products.length} products in CSV\n`);
  return products;
}

async function importProducts() {
  console.log('🚀 STARTING IMPORT OF JACKETS FROM LOCAL CSV\n');
  console.log('='.repeat(60));
  
  try {
    const products = await fetchLocalCSV();
    
    let created = 0;
    let updated = 0;
    let failures = 0;
    
    // Process in batches
    for (let batchStart = 0; batchStart < products.length; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, products.length);
      const batch = products.slice(batchStart, batchEnd);
      const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(products.length / BATCH_SIZE);
      
      console.log(`\n📦 BATCH ${batchNum}/${totalBatches} (Products ${batchStart + 1}-${batchEnd})`);
      console.log('-'.repeat(60));
      
      for (let i = 0; i < batch.length; i++) {
        const product = batch[i];
        const globalIndex = batchStart + i;
        
        try {
          console.log(`\n[${globalIndex + 1}/${products.length}] ${product.name}`);
          
          // Extract itemID
          const itemIdMatch = product.url.match(/itemID[=%](\d+)|\/item\/(\d+)/i);
          if (!itemIdMatch) {
            console.log('  ❌ Invalid URL format');
            failures++;
            continue;
          }
          
          const itemId = itemIdMatch[1] || itemIdMatch[2];
          const weidianUrl = `https://weidian.com/item.html?itemID=${itemId}`;
          
          // Scrape product data
          const scrapedData = await scrapeWeidianProduct(weidianUrl);
          
          // Prepare product data
          const affiliateLink = getAffiliateLink(weidianUrl);
          const category = detectCategory(product.name);
          
          // Check if exists
          const { data: existingProducts } = await supabase
            .from('products')
            .select('*')
            .ilike('link', `%itemID%${itemId}%`)
            .limit(1);
          
          const productData = {
            name: product.name,
            slug: generateSlug(product.name) + '-' + itemId, // Unique slug with itemID
            price: scrapedData.price,
            image: scrapedData.image,
            category,
            batch: 'best',
            link: affiliateLink,
            clicks: 0,
            is_pinned: false,
            pinned_order: 999999
          };
          
          if (existingProducts && existingProducts.length > 0) {
            // Update existing
            const { error } = await supabase
              .from('products')
              .update({ ...productData, updated_at: new Date().toISOString() })
              .eq('id', existingProducts[0].id);
            
            if (error) throw error;
            console.log(`  ✅ Updated (${scrapedData.scraped ? 'scraped' : 'fallback'})`);
            updated++;
          } else {
            // Create new
            const { error } = await supabase
              .from('products')
              .insert([productData]);
            
            if (error) throw error;
            console.log(`  ✅ Created (${scrapedData.scraped ? 'scraped' : 'fallback'})`);
            created++;
          }
          
          // Delay between products
          if (i < batch.length - 1) {
            await sleep(REQUEST_DELAY);
          }
          
        } catch (error) {
          console.log(`  ❌ Error: ${error.message}`);
          failures++;
        }
      }
      
      // Delay between batches
      if (batchEnd < products.length) {
        console.log(`\n⏸️  Waiting ${BATCH_DELAY/1000} seconds before next batch...`);
        await sleep(BATCH_DELAY);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✨ IMPORT COMPLETED');
    console.log('='.repeat(60));
    console.log(`✅ Created: ${created}`);
    console.log(`🔄 Updated: ${updated}`);
    console.log(`❌ Failed: ${failures}`);
    console.log(`📊 Total: ${products.length}`);
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    process.exit(1);
  }
}

// Run import
importProducts();
