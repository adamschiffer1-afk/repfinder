// Test script to add realistic statistics to the database
import { supabaseAdmin } from '../src/lib/supabase.js';

const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

const countries = ['PL', 'US', 'DE', 'GB', 'FR', 'NL', 'ES'];
const paths = ['/', '/products', '/converter', '/guide', '/faq'];
const agents = ['pandabuy', 'kakobuy', 'cssbuy', 'sugargoo', 'wegobuy'];
const referrers = ['https://google.com', 'https://facebook.com', 'https://reddit.com', null, null, null];
const utmSources = ['google', 'facebook', 'instagram', 'reddit', null, null, null, null];

async function addRealisticStats() {
  console.log('🎯 Dodawanie realistycznych statystyk...\n');

  const stats = [];
  const now = Date.now();
  
  // Generate 50 page views from 20 unique visitors over last 24h
  const uniqueVisitors = Array.from({ length: 20 }, (_, i) => `visitor-${Math.random().toString(36).substr(2, 9)}`);
  
  for (let i = 0; i < 50; i++) {
    const timestamp = new Date(now - Math.random() * 24 * 60 * 60 * 1000); // Random within 24h
    stats.push({
      type: 'page_view',
      visitor_id: uniqueVisitors[Math.floor(Math.random() * uniqueVisitors.length)],
      user_agent: userAgents[Math.floor(Math.random() * userAgents.length)],
      path: paths[Math.floor(Math.random() * paths.length)],
      country: countries[Math.floor(Math.random() * countries.length)],
      referrer: referrers[Math.floor(Math.random() * referrers.length)],
      utm_source: utmSources[Math.floor(Math.random() * utmSources.length)],
      timestamp: timestamp.toISOString()
    });
  }

  // Generate 30 product clicks
  for (let i = 0; i < 30; i++) {
    const timestamp = new Date(now - Math.random() * 24 * 60 * 60 * 1000);
    const productId = (Math.floor(Math.random() * 50) + 1).toString(); // IDs 1-50
    stats.push({
      type: 'product_click',
      product_id: productId,
      visitor_id: uniqueVisitors[Math.floor(Math.random() * uniqueVisitors.length)],
      user_agent: userAgents[Math.floor(Math.random() * userAgents.length)],
      path: `/product/${productId}`,
      agent: agents[Math.floor(Math.random() * agents.length)],
      country: countries[Math.floor(Math.random() * countries.length)],
      timestamp: timestamp.toISOString()
    });
  }

  // Generate 15 engagement events
  for (let i = 0; i < 15; i++) {
    const timestamp = new Date(now - Math.random() * 24 * 60 * 60 * 1000);
    stats.push({
      type: 'engagement',
      visitor_id: uniqueVisitors[Math.floor(Math.random() * uniqueVisitors.length)],
      user_agent: userAgents[Math.floor(Math.random() * userAgents.length)],
      path: paths[Math.floor(Math.random() * paths.length)],
      time_spent: Math.floor(Math.random() * 300) + 10, // 10-310 seconds
      scroll_depth: Math.floor(Math.random() * 100), // 0-100%
      country: countries[Math.floor(Math.random() * countries.length)],
      timestamp: timestamp.toISOString()
    });
  }

  console.log(`📝 Przygotowano ${stats.length} statystyk do zapisania...`);

  // Insert in batches
  const batchSize = 20;
  for (let i = 0; i < stats.length; i += batchSize) {
    const batch = stats.slice(i, i + batchSize);
    const { error } = await supabaseAdmin.from('stats').insert(batch);
    
    if (error) {
      console.error(`❌ Błąd w batch ${i}-${i+batchSize}:`, error);
    } else {
      console.log(`✅ Dodano batch ${i}-${Math.min(i+batchSize, stats.length)}/${stats.length}`);
    }
  }

  console.log('\n✨ Gotowe! Statystyki zostały dodane do bazy.');
  console.log(`\n👥 Unikalni użytkownicy: ${uniqueVisitors.length}`);
  console.log(`👁️  Wyświetlenia strony: ${stats.filter(s => s.type === 'page_view').length}`);
  console.log(`🖱️  Kliknięcia produktów: ${stats.filter(s => s.type === 'product_click').length}`);
  console.log(`⏱️  Engagement events: ${stats.filter(s => s.type === 'engagement').length}`);
  console.log(`\n🎯 Sprawdź panel: http://localhost:3000/admin-99x-hsd/stats`);
}

addRealisticStats().catch(console.error);
