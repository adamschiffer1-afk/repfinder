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
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { detectCategory } from '@/utils/categoryHelper';

const AFFILIATE_CODE = process.env.KAKOBUY_AFFILIATE_CODE || 'xfrostyy';
const USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';

/**
 * Helper functions
 */
function getWeidianUrl(itemId) {
  return `https://weidian.com/item.html?itemID=${itemId}`;
}

function getAffiliateLink(weidianUrl) {
  return `https://www.kakobuy.com/item/details?url=${encodeURIComponent(weidianUrl)}&affcode=${AFFILIATE_CODE}`;
}

function cleanName(name) {
  const fallback = 'Weidian Product';
  const normalized = String(name || fallback).replace(/\s+/g, ' ').trim() || fallback;
  
  if (normalized.length <= 60) return normalized;
  return `${normalized.slice(0, 57).trimEnd()}...`;
}

function formatImageUrl(imageUrl) {
  if (!imageUrl) return '';
  
  const absoluteUrl = imageUrl.startsWith('http') ? imageUrl : `https:${imageUrl}`;
  const separator = absoluteUrl.includes('?') ? '&' : '?';
  return `${absoluteUrl}${separator}w=400&h=400`;
}

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

    const baseName = cleanName(itemInfo.item_name || 'Weidian Product');
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

    const formattedImage = formatImageUrl(image);
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
 * Main POST handler for template import
 */
export async function POST(request) {
  console.log('Template import POST request received');
  
  // Check authentication
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    await dbConnect();
    
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
    let updated = 0;
    let failures = 0;
    let deletedCount = 0;

    // Handle replacement modes
    if (replaceMode === 'all') {
      console.log('Deleting all products...');
      const deleteResult = await Product.deleteMany({});
      deletedCount = deleteResult.deletedCount || 0;
      console.log('Deleted', deletedCount, 'products');
    } else if (replaceMode === 'pinned') {
      console.log('Deleting pinned products...');
      const deleteResult = await Product.deleteMany({ isPinned: true });
      deletedCount = deleteResult.deletedCount || 0;
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
        const weidianUrl = getWeidianUrl(itemId);
        
        // Scrape product data from Weidian
        const scrapedData = await scrapeWeidianProduct(weidianUrl);

        // Use name from spreadsheet (user's custom name)
        const finalName = product.name;
        
        // Get affiliate link
        const affiliateLink = getAffiliateLink(weidianUrl);
        
        // Check if product with this link already exists
        const existingProduct = await Product.findOne({
          link: new RegExp(`itemID(?:%3D|=)${itemId}`, 'i')
        });

        if (existingProduct) {
          // Update existing product
          existingProduct.name = finalName;
          existingProduct.price = scrapedData.price;
          existingProduct.image = scrapedData.image;
          existingProduct.category = scrapedData.category;
          existingProduct.batch = batch || 'best';
          existingProduct.link = affiliateLink;
          
          if (pin) {
            existingProduct.isPinned = true;
            if (startOrder !== undefined) {
              existingProduct.pinnedOrder = startOrder + i;
            }
          }

          await existingProduct.save();
          
          results.push({
            status: 'success',
            action: 'updated',
            name: finalName,
            url: product.url,
            itemId: existingProduct._id.toString()
          });
          updated++;
          console.log(`✅ [${i + 1}/${products.length}] Updated: ${finalName} (ID: ${existingProduct._id})`);
        } else {
          // Create new product
          const productData = {
            name: finalName,
            price: scrapedData.price,
            image: scrapedData.image,
            category: scrapedData.category,
            batch: batch || 'best',
            link: affiliateLink,
            clicks: 0,
            isPinned: pin || false,
            pinnedOrder: (pin && startOrder !== undefined) ? (startOrder + i) : 999999
          };

          const newProduct = await Product.create(productData);
          
          results.push({
            status: 'success',
            action: 'created',
            name: finalName,
            url: product.url,
            itemId: newProduct._id.toString()
          });
          created++;
          console.log(`✅ [${i + 1}/${products.length}] Created: ${finalName} (ID: ${newProduct._id})`);
        }

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

    console.log(`\n✨ TEMPLATE IMPORT COMPLETED: Created ${created} | Updated ${updated} | Failed ${failures}\n`);

    return NextResponse.json({
      success: true,
      total: products.length,
      created,
      updated,
      failures,
      deletedCount,
      successes: created + updated,
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
