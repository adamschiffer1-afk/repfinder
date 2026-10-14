import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase";

// Comprehensive bot and crawler check helper
function isBot(ua) {
  if (!ua) return true;
  const lowerUa = ua.toLowerCase();
  
  const botKeywords = [
    'bot', 'spider', 'crawler', 'scraper', 'yandex', 'baidu', 'googlebot', 'bingbot', 
    'slurp', 'duckduckgo', 'baiduspider', 'yandexbot', 'sogou', 'exabot', 'facebot', 'ia_archiver',
    'facebookexternalhit', 'twitterbot', 'rogerbot', 'linkedinbot', 'embedly', 'quora link preview',
    'showyoubot', 'outbrain', 'pinterest', 'slackbot', 'vkshare', 'w3c_validator', 'redditbot',
    'applebot', 'whatsapp', 'flipboard', 'tumblr', 'bitlybot', 'gsa-crawler', 'skypeuripreview',
    'nuzzel', 'discordbot', 'google page speed', 'qwantify', 'pinterestbot', 'bitrix link preview',
    'xing-content-collector', 'chrome-lighthouse', 'lighthouse', 'telegrambot', 'screaming frog',
    'seo', 'semrush', 'ahrefs', 'mj12bot', 'dotbot', 'uipresence', 'coccocbot'
  ];

  if (botKeywords.some(keyword => lowerUa.includes(keyword))) {
    return true;
  }

  const libRegex = /(?:curl|wget|python|requests|urllib|axios|fetch|go-http-client|postman|playwright|puppeteer|selenium|headless|phantomjs|client)/i;
  if (libRegex.test(lowerUa)) {
    return true;
  }

  return false;
}

const duplicateCooldownByType = {
  product_click: 60 * 1000,
  page_view: 15 * 1000,
};

export async function POST(req) {
  try {
    let rawBody = await req.text();
    if (!rawBody) return NextResponse.json({ success: true });
    
    let data = JSON.parse(rawBody);
    let { 
      productId, type, agent, userAgent, path, 
      errorMessage, errorStack, visitorId, referrer, 
      utmSource, utmCampaign, scrollDepth, timeSpent, breadcrumbs 
    } = data;
    
    // Normalize type
    if (type === 'click') type = 'product_click';
    
    // Skip logging for admin paths
    if (path && path.startsWith('/admin-99x-hsd')) {
      return NextResponse.json({ success: true, message: 'Skipped admin path' });
    }

    // Resolve userAgent and country headers
    const finalUserAgent = userAgent || req.headers.get('user-agent') || '';
    const country = req.headers.get('x-vercel-ip-country') || req.headers.get('cf-ipcountry') || 'PL';

    // 1. Strict Bot Filtering (only for regular traffic to prevent clogging, let errors bypass unless heavy bot)
    if (type !== 'error_log') {
      if (!finalUserAgent || finalUserAgent.length < 15 || isBot(finalUserAgent)) {
        return NextResponse.json({ success: true, message: 'Skipped automated bot/junk traffic' });
      }
    }

    // 2. Admin Self-Logging Exclusion (wrap in try-catch so auth errors don't kill tracking)
    if (type !== 'error_log') {
      try {
        const session = await auth();
        if (session && session.user?.email === "kakobuybs209@gmail.com") {
          return NextResponse.json({ success: true, message: 'Skipped administrator test activity' });
        }
      } catch (authErr) {
        // Auth error - don't block tracking, just log and continue
        console.warn('Auth check failed during stats tracking (continuing):', authErr?.message);
      }
    }

    // 3. Action Deduplication for identical non-error, non-engagement events
    if (type !== 'error_log' && type !== 'engagement') {
      const eventType = type || 'product_click';
      const cooldownMs = duplicateCooldownByType[eventType] || 15000;
      const cooldownTime = new Date(Date.now() - cooldownMs);
      
      // Check for duplicate in Supabase
      const { data: existingStats } = await supabaseAdmin
        .from('stats')
        .select('id')
        .eq('type', eventType)
        .eq('product_id', productId || null)
        .eq('agent', agent || null)
        .eq('path', path || null)
        .eq('user_agent', finalUserAgent)
        .eq('visitor_id', visitorId || null)
        .gte('timestamp', cooldownTime.toISOString())
        .limit(1);

      if (existingStats && existingStats.length > 0) {
        return NextResponse.json({ success: true, message: 'Skipped duplicate event (cooldown)' });
      }
    }

    // Insert into Supabase stats table
    const { error: insertError } = await supabaseAdmin
      .from('stats')
      .insert({
        type: type || 'product_click',
        product_id: productId || null,
        agent: agent || null,
        visitor_id: visitorId || null,
        user_agent: finalUserAgent,
        path: path || null,
        country: country || 'PL',
        referrer: referrer || null,
        utm_source: utmSource || null,
        utm_campaign: utmCampaign || null,
        scroll_depth: scrollDepth || null,
        time_spent: timeSpent || null,
        error_message: errorMessage || null,
        error_stack: errorStack || null,
        breadcrumbs: breadcrumbs || null,
        timestamp: new Date().toISOString()
      });

    if (insertError) {
      console.error("Supabase insert error:", insertError);
      return NextResponse.json({ error: "Failed to track stat" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Tracking error:", error);
    return NextResponse.json({ error: "Failed to track stat" }, { status: 500 });
  }
}
