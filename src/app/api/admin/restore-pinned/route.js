/**
 * Restore Pinned Products API Route
 * 
 * GET /api/admin/restore-pinned?secret=restore-now
 * 
 * Restores the 55 pinned products from hardcoded list
 */

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { detectCategory } from '@/utils/categoryHelper';

const USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15';
const AFFILIATE_CODE = 'xfrostyy';

const PINNED_ITEMS = [
  '7812389157', '7815391260', '7812410917', '7812414801', '7812456179',
  '7812377245', '7815468100', '7815381508', '7812434455', '7815422808',
  '7815493702', '7812464131', '7815466346', '7815403232', '7815495696',
  '7815452400', '7812402979', '7815450492', '7812401111', '7812373321',
  '7815440488', '7815418922', '7815383320', '7812369455', '7815397278',
  '7815448408', '7815440474', '7812462079', '7815497656', '7812365455',
  '7812460103', '7815387242', '7812485693', '7815383556', '7815468302',
  '7812444383', '7812414797', '7812420757', '7812379253', '7815393274',
  '7812399157', '7815391268', '7815379472', '7815440508', '7812426015',
  '7812491641', '7815440514', '7812401129', '7812383447', '7812444627',
  '7815293360', '7812373497', '7812438485', '7812283347', '7815293348'
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeProduct(itemId) {
  const url = `https://weidian.com/item.html?itemID=${itemId}`;
  
  try {
    const response = await axios.get(url, {
      headers: { 'User-Agent': USER_AGENT, 'Referer': 'https://weidian.com/' },
      timeout: 20000
    });

    const $ = cheerio.load(response.data);
    const scriptTag = $('#__rocker-render-inject__');
    if (!scriptTag.length) throw new Error('No data');

    const data = JSON.parse(scriptTag.attr('data-obj'));
    const itemInfo = data?.result?.default_model?.item_info;
    if (!itemInfo) throw new Error('No item info');

    const name = String(itemInfo.item_name || 'Product').replace(/\s+/g, ' ').trim().slice(0, 60);
    const price = Number((Number.parseFloat(itemInfo.origin_price) * 0.14).toFixed(2));
    const image = itemInfo.item_head;
    const category = detectCategory(name);

    return { name, price, image: `${image}?w=400&h=400`, category };
  } catch (error) {
    throw new Error(`Scrape failed: ${error.message}`);
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get('secret') !== 'restore-now') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    
    console.log(`🔄 Restoring ${PINNED_ITEMS.length} pinned products...`);
    
    let created = 0;
    let failed = 0;
    const results = [];

    for (let i = 0; i < PINNED_ITEMS.length; i++) {
      const itemId = PINNED_ITEMS[i];
      console.log(`[${i + 1}/${PINNED_ITEMS.length}] Processing ${itemId}...`);
      
      try {
        if (i > 0) await sleep(200); // Rate limiting
        
        const data = await scrapeProduct(itemId);
        const link = `https://www.kakobuy.com/item/details?url=${encodeURIComponent(`https://weidian.com/item.html?itemID=${itemId}`)}&affcode=${AFFILIATE_CODE}`;
        
        const existing = await Product.findOne({ link: new RegExp(`itemID(?:%3D|=)${itemId}`, 'i') });
        
        if (existing) {
          existing.name = data.name;
          existing.price = data.price;
          existing.image = data.image;
          existing.category = data.category;
          existing.isPinned = true;
          existing.pinnedOrder = i + 1;
          await existing.save();
          results.push({ status: 'updated', name: data.name });
        } else {
          await Product.create({
            ...data,
            link,
            batch: 'best',
            clicks: 0,
            isPinned: true,
            pinnedOrder: i + 1
          });
          results.push({ status: 'created', name: data.name });
        }
        
        created++;
        console.log(`✅ [${i + 1}/${PINNED_ITEMS.length}] ${data.name}`);
      } catch (error) {
        failed++;
        console.error(`❌ [${i + 1}/${PINNED_ITEMS.length}] Failed: ${error.message}`);
        results.push({ status: 'error', itemId, error: error.message });
      }
    }

    console.log(`\n✅ Done! Created/Updated: ${created}, Failed: ${failed}`);
    
    return NextResponse.json({
      success: true,
      total: PINNED_ITEMS.length,
      created,
      failed,
      results: results.slice(0, 20)
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
