/**
 * Template Import API Route
 * 
 * POST /api/admin/scrape/template
 * 
 * Handles bulk product import from template data (spreadsheets, CSV, etc)
 * Supports 3 modes:
 * - Add/Refresh: Adds new products or updates existing
 * - Replace Pinned: Deletes pinned products first, then imports
 * - Replace All: Deletes all products first, then imports
 * 
 * NOTE: This file is for Next.js App Router
 * Place at: /src/app/api/admin/scrape/template/route.js
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as cheerio from 'cheerio';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';

/**
 * Scrapes product data from Weidian URL
 * @param {string} weidianUrl - Weidian product URL
 * @returns {Promise<{name: string, price: number, image: string, category: string}>}
 */
async function scrapeWeidianProduct(weidianUrl) {
  try {
    const response = await axios.get(weidianUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Referer': 'https://weidian.com/'
      },
      timeout: 12000
    });

    const $ = cheerio.load(response.data);
    const scriptTag = $('#__rocker-render-inject__');

    if (scriptTag.length === 0) {
      throw new Error('Could not find product data. Weidian may be blocking this item.');
    }

    let data;
    try {
      data = JSON.parse(scriptTag.attr('data-obj'));
    } catch {
      throw new Error('Could not parse product data.');
    }

    const itemInfo = data?.result?.default_model?.item_info;
    if (!itemInfo) {
      throw new Error('Product payload is missing item information.');
    }

    const baseName = (itemInfo.item_name || 'Weidian Product').replace(/\s+/g, ' ').trim();
    const priceCny = Number.parseFloat(itemInfo.origin_price);
    const priceUsd = Number.isFinite(priceCny) ? Number((priceCny * 0.14).toFixed(2)) : 0;

    // Get image - prefer variant image, fallback to main image
    let image = itemInfo.item_head;
    const skuProperties = data?.result?.default_model?.sku_properties;

    if (skuProperties?.attr_list) {
      const imageAttr = skuProperties.attr_list.find((attr) =>
        attr.attr_values?.some((value) => value.img)
      );

      if (imageAttr?.attr_values && imageAttr.attr_values[0]?.img) {
        image = imageAttr.attr_values[0].img;
      }
    }

    // Format image URL
    const absoluteUrl = image.startsWith('http') ? image : `https:${image}`;
    const separator = absoluteUrl.includes('?') ? '&' : '?';
    const formattedImage = `${absoluteUrl}${separator}w=400&h=400`;

    // Simple category detection (customize based on your needs)
    const category = detectCategory(baseName);

    return {
      name: baseName,
      price: priceUsd,
      image: formattedImage,
      category
    };
  } catch (error) {
    throw new Error(`Scraping failed: ${error.message}`);
  }
}

/**
 * Simple category detection based on product name
 * @param {string} name - Product name
 * @returns {string} Detected category
 */
function detectCategory(name) {
  const lowerName = name.toLowerCase();
  
  if (lowerName.includes('shoe') || lowerName.includes('sneaker') || lowerName.includes('jordan')) return 'shoes';
  if (lowerName.includes('short')) return 'shorts';
  if (lowerName.includes('pant') || lowerName.includes('jean') || lowerName.includes('trouser')) return 'pants';
  if (lowerName.includes('tee') || lowerName.includes('t-shirt') || lowerName.includes('tshirt')) return 't-shirts';
  if (lowerName.includes('hoodie') || lowerName.includes('sweatshirt')) return 'hoodies';
  if (lowerName.includes('jacket') || lowerName.includes('coat')) return 'jackets';
  if (lowerName.includes('longsleeve') || lowerName.includes('long sleeve')) return 'longsleeve';
  if (lowerName.includes('electronic') || lowerName.includes('phone') || lowerName.includes('laptop')) return 'electronics';
  if (lowerName.includes('hat') || lowerName.includes('cap') || lowerName.includes('beanie')) return 'headwear';
  if (lowerName.includes('bag') || lowerName.includes('backpack')) return 'bags-backpacks';
  if (lowerName.includes('belt')) return 'belts';
  
  return 'accessories';
}

/**
 * Generates a unique slug for the product
 * @param {string} name - Product name
 * @param {string|null} productId - Existing product ID (for updates)
 * @returns {Promise<string>} Unique slug
 */
async function generateUniqueSlug(name, productId = null) {
  let baseSlug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  
  if (!baseSlug) baseSlug = "product";
  
  let slug = baseSlug;
  let counter = 1;
  
  while (true) {
    let query = supabase.from('products').select('id').eq('slug', slug);
    
    if (productId) {
      query = query.neq('id', productId);
    }
    
    const { data } = await query.single();
    
    if (!data) break;
    
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
}

/**
 * Main POST handler for template import
 */
export async function POST(request) {
  console.log('Template import POST request received');
  try {
    const body = await request.json();
    console.log('Request body parsed:', body);
    
    const { products, replaceMode, confirm, batch, pin, startOrder } = body;
    console.log('Extracted params:', { products: products?.length, replaceMode, batch, pin });

    if (!products || !Array.isArray(products) || products.length === 0) {
      console.log('No products provided error');
      return NextResponse.json({ error: 'No products provided' }, { status: 400 });
    }

    // Validate replace mode confirmation
    if (replaceMode !== 'none' && confirm !== 'REPLACE') {
      console.log('Replace confirmation required error');
      return NextResponse.json({ error: 'Replace confirmation required' }, { status: 400 });
    }

    console.log('Starting template import process...');
    
    const results = [];
    let created = 0;
    let failures = 0;
    let deletedCount = 0;

    // Handle replacement modes
    if (replaceMode === 'all') {
      console.log('Deleting all products...');
      const { count, error } = await supabase
        .from('products')
        .delete()
        .neq('id', 0); // Delete all products
      
      if (error) {
        console.error('Error deleting all products:', error);
        throw error;
      }
      deletedCount = count || 0;
      console.log('Deleted', deletedCount, 'products');
    } else if (replaceMode === 'pinned') {
      console.log('Deleting pinned products...');
      const { count, error } = await supabase
        .from('products')
        .delete()
        .eq('is_pinned', true);
        
      if (error) {
        console.error('Error deleting pinned products:', error);
        throw error;
      }
      deletedCount = count || 0;
      console.log('Deleted', deletedCount, 'pinned products');
    }

    // Process each product
    console.log(`\n📦 STARTING TEMPLATE IMPORT: ${products.length} products\n`);
    
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      console.log(`[${i + 1}/${products.length}] Processing: ${product.name}`);
      
      try {
        // Extract itemID from Weidian URL
        const itemIdMatch = product.url.match(/itemID[=%](\d+)|\/item\/(\d+)/i);
        if (!itemIdMatch) {
          results.push({
            status: 'error',
            message: `Invalid Weidian URL: ${product.url}`,
            name: product.name
          });
          failures++;
          continue;
        }

        const itemId = itemIdMatch[1] || itemIdMatch[2];
        const weidianUrl = `https://weidian.com/item.html?itemID=${itemId}`;
        
        // Scrape product data from Weidian
        const scrapedData = await scrapeWeidianProduct(weidianUrl);

        // Use name from spreadsheet (user's custom name)
        const finalName = product.name;
        
        // Generate unique slug
        const slug = await generateUniqueSlug(finalName);

        // Get affiliate link from database (or use default)
        const { data: affiliateData } = await supabase
          .from('affiliate_codes')
          .select('code')
          .eq('agent', 'kakobuy')
          .single();
        
        const affiliateCode = affiliateData?.code || 'default-code';
        const affiliateLink = `https://www.kakobuy.com/item/details?url=${encodeURIComponent(weidianUrl)}&affcode=${affiliateCode}`;
        
        // Create product data with scraped information
        const productData = {
          name: finalName,
          slug: slug,
          price: scrapedData.price,
          image: scrapedData.image,
          category: scrapedData.category,
          batch: batch || 'best',
          link: affiliateLink,
          clicks: 0,
          is_pinned: pin || false,
          pinned_order: (pin && startOrder !== undefined) ? (startOrder + i) : null
        };

        // Create new product
        const { data: insertedData, error: insertError } = await supabase
          .from('products')
          .insert([productData])
          .select()
          .single();

        if (insertError) {
          console.error(`❌ [${i + 1}/${products.length}] Failed to create ${finalName}:`, insertError.message);
          results.push({
            status: 'error',
            message: `Insert error: ${insertError.message}`,
            name: finalName,
            url: product.url
          });
          failures++;
          continue;
        }
        
        results.push({
          status: 'success',
          action: 'created',
          name: finalName,
          url: product.url,
          itemId: insertedData?.id
        });
        created++;
        console.log(`✅ [${i + 1}/${products.length}] Created: ${finalName} (ID: ${insertedData?.id})`);

      } catch (error) {
        console.error(`❌ [${i + 1}/${products.length}] Error processing ${product.name}:`, error.message);
        results.push({
          status: 'error',
          message: error.message,
          name: product.name,
          url: product.url
        });
        failures++;
      }
    }

    console.log(`\n✨ TEMPLATE IMPORT COMPLETED: Created ${created} | Failed ${failures}\n`);

    return NextResponse.json({
      success: true,
      total: products.length,
      created,
      updated: 0,
      failures,
      deletedCount,
      successes: created,
      results
    });

  } catch (error) {
    console.error('Template import error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}
