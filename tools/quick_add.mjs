#!/usr/bin/env node
/**
 * Quick Add Tool - Szybko dodaj produkt do bazy
 * 
 * Użycie:
 *   node quick_add.mjs "Nazwa produktu" "https://weidian.com/item.html?itemID=123456"
 *   node quick_add.mjs "Nike Hoodie" "https://weidian.com/item.html?itemID=7507616560"
 */

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const AFFILIATE_CODE = 'xfrostyy';
const USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15';

// === UTILITY FUNCTIONS ===

function generateSlug(name, itemId) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 100);
  return `${slug}-${itemId}`;
}

function detectCategory(name) {
  const nameLower = name.toLowerCase();
  
  if (nameLower.includes('hoodie') || nameLower.includes('hooded')) return 'hoodies';
  if (nameLower.includes('pant') || nameLower.includes('jean') || nameLower.includes('trouser') || nameLower.includes('short') || nameLower.includes('cargo')) return 'pants';
  if (nameLower.includes('sweatshirt') || nameLower.includes('sweater') || nameLower.includes('cardigan')) return 'hoodies';
  if (nameLower.includes('t-shirt') || nameLower.includes('tee') || nameLower.includes('polo') || nameLower.includes('shirt')) return 't-shirts';
  if (nameLower.includes('jacket') || nameLower.includes('coat') || nameLower.includes('puffer') || nameLower.includes('windbreaker')) return 'jackets';
  if (nameLower.includes('set') || nameLower.includes('suit') || nameLower.includes('tracksuit')) return 'sets';
  if (nameLower.includes('shoe') || nameLower.includes('sneaker') || nameLower.includes('trainer')) return 'shoes';
  if (nameLower.includes('bag') || nameLower.includes('backpack') || nameLower.includes('pouch')) return 'bags';
  
  return 'accessories';
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

// === SCRAPE WEIDIAN ===

async function scrapeWeidian(weidianUrl) {
  try {
    console.log(`📡 Scrapuję: ${weidianUrl}`);
    
    const response = await axios.get(weidianUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Referer': 'https://weidian.com/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 20000
    });

    const $ = cheerio.load(response.data);
    const scriptTag = $('#__rocker-render-inject__');

    if (scriptTag.length === 0) throw new Error('Nie znaleziono danych produktu');

    const data = JSON.parse(scriptTag.attr('data-obj'));
    const itemInfo = data?.result?.default_model?.item_info;
    
    if (!itemInfo) throw new Error('Brak informacji o produkcie');

    const priceCny = Number.parseFloat(itemInfo.origin_price);
    const priceUsd = Number.isFinite(priceCny) ? Number((priceCny * 0.14).toFixed(2)) : 10.00;
    const image = formatImageUrl(itemInfo.item_head);

    return { price: priceUsd, image, scraped: true };
  } catch (error) {
    console.log(`⚠️  Błąd scrapowania: ${error.message}`);
    console.log(`⚠️  Używam danych fallback`);
    return {
      price: 10.00,
      image: 'https://via.placeholder.com/400x400?text=No+Image',
      scraped: false
    };
  }
}

// === MAIN ===

async function quickAdd() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║           🚀 QUICK ADD TOOL                          ║
╚═══════════════════════════════════════════════════════╝

Użycie:
  node quick_add.mjs "Nazwa produktu" "Link Weidian" [kategoria]

Przykład (automatyczna kategoria):
  node quick_add.mjs "Nike Hoodie" "https://weidian.com/item.html?itemID=7507616560"

Przykład (ręczna kategoria):
  node quick_add.mjs "Nike Hoodie" "https://weidian.com/item.html?itemID=7507616560" hoodies

Dostępne kategorie:
  • shoes       - Buty
  • hoodies     - Bluzy z kapturem
  • t-shirts    - Koszulki
  • pants       - Spodnie
  • shorts      - Szorty
  • jackets     - Kurtki
  • sets        - Zestawy/Dresy
  • accessories - Akcesoria
  • bags        - Torby

Automatyczna detekcja kategorii:
  • hoodie → hoodies
  • pants/jeans → pants  
  • jacket → jackets
  • t-shirt → t-shirts
  • sweatshirt → hoodies
  • set/suit → sets
  • shoe → shoes
  • bag → bags
  • inne → accessories
`);
    process.exit(1);
  }

  const [name, url, manualCategory] = args;
  
  console.log('\n' + '='.repeat(60));
  console.log('🚀 QUICK ADD - Dodawanie produktu');
  console.log('='.repeat(60));
  console.log(`📝 Nazwa: ${name}`);
  console.log(`🔗 Link:  ${url}`);
  if (manualCategory) {
    console.log(`🏷️  Kategoria (ręczna): ${manualCategory}`);
  }
  console.log();

  try {
    // Extract itemID
    const itemIdMatch = url.match(/itemID[=%](\d+)|\/item\/(\d+)/i);
    if (!itemIdMatch) {
      console.error('❌ Nieprawidłowy link Weidian!');
      process.exit(1);
    }

    const itemId = itemIdMatch[1] || itemIdMatch[2];
    const weidianUrl = `https://weidian.com/item.html?itemID=${itemId}`;
    
    // Scrape
    const scrapedData = await scrapeWeidian(weidianUrl);
    
    // Detect or use manual category
    const category = manualCategory || detectCategory(name);
    
    // Validate category
    const validCategories = ['shoes', 'hoodies', 't-shirts', 'pants', 'shorts', 'jackets', 'sets', 'accessories', 'bags'];
    if (!validCategories.includes(category)) {
      console.log(`⚠️  Nieprawidłowa kategoria: ${category}`);
      console.log(`   Dostępne: ${validCategories.join(', ')}`);
      process.exit(1);
    }
    
    console.log(`🏷️  Kategoria: ${category} ${manualCategory ? '(ręczna)' : '(auto)'}`);
    
    // Check if exists
    const { data: existing } = await supabase
      .from('products')
      .select('id, name')
      .ilike('link', `%itemID%${itemId}%`)
      .limit(1);
    
    if (existing && existing.length > 0) {
      console.log(`\n⚠️  Produkt już istnieje: ${existing[0].name}`);
      console.log(`   ID: ${existing[0].id}`);
      process.exit(0);
    }
    
    // Add to database
    const productData = {
      name,
      slug: generateSlug(name, itemId),
      price: scrapedData.price,
      image: scrapedData.image,
      category,
      batch: 'best',
      link: getAffiliateLink(weidianUrl),
      clicks: 0,
      is_pinned: false,
      pinned_order: 999999
    };
    
    console.log(`💰 Cena:     $${productData.price}`);
    console.log(`🖼️  Obrazek:  ${scrapedData.scraped ? 'Scrapowany' : 'Fallback'}`);
    
    const { data, error } = await supabase
      .from('products')
      .insert([productData])
      .select();
    
    if (error) throw error;
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ SUKCES - Produkt dodany!');
    console.log('='.repeat(60));
    console.log(`ID: ${data[0].id}`);
    console.log(`Slug: ${data[0].slug}`);
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n❌ BŁĄD:', error.message);
    process.exit(1);
  }
}

quickAdd();
