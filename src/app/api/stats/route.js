import dbConnect from "@/lib/mongodb";
import Stat from "@/models/Stat";
import Product from "@/models/Product";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import mongoose from "mongoose";

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

// Global ex-post bot regex filter for database queries (excluding error logs so we always get errors if any)
const botExcludeRegex = /bot|spider|crawler|scraper|yandex|baidu|slurp|duckduckgo|sogou|exabot|facebot|ia_archiver|facebookexternalhit|twitterbot|linkedinbot|embedly|redditbot|applebot|whatsapp|flipboard|tumblr|bitlybot|discordbot|lighthouse|telegrambot|screaming|semrush|ahrefs|mj12bot|dotbot|curl|wget|python|urllib|axios|fetch|go-client/i;
const cleanFilter = {
  $or: [
    { type: 'error_log' }, // Always keep errors
    { userAgent: null },
    { userAgent: "" },
    { userAgent: { $not: botExcludeRegex } }
  ]
};

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

    // Connect to DB first (needed for dedup check and session checks)
    await dbConnect();

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
      const existingStat = await Stat.findOne({
        type: eventType,
        productId: productId || null,
        agent: agent || null,
        path: path || null,
        userAgent: finalUserAgent,
        visitorId: visitorId || null,
        timestamp: { $gte: cooldownTime }
      });

      if (existingStat) {
        return NextResponse.json({ success: true, message: 'Skipped duplicate event (cooldown)' });
      }
    }

    await Stat.create({
      type: type || 'product_click',
      productId: productId || null,
      agent: agent || null,
      visitorId: visitorId || null,
      userAgent: finalUserAgent,
      path: path || null,
      country: country || 'PL',
      referrer: referrer || null,
      utmSource: utmSource || null,
      utmCampaign: utmCampaign || null,
      scrollDepth: scrollDepth || null,
      timeSpent: timeSpent || null,
      errorMessage: errorMessage || null,
      errorStack: errorStack || null,
      breadcrumbs: breadcrumbs || null,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Tracking error:", error);
    return NextResponse.json({ error: "Failed to track stat" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.email !== "kakobuybs209@gmail.com") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // 1. Total Visits
    const totalVisits = await Stat.countDocuments({ type: 'page_view', ...cleanFilter });

    // 2. Total Product Clicks
    const totalClicks = await Stat.countDocuments({ type: 'product_click', ...cleanFilter });

    // 3. Top Products
    const topProducts = await Stat.aggregate([
      { $match: { type: 'product_click', productId: { $ne: null, $ne: "" }, ...cleanFilter } },
      { $group: { _id: "$productId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $addFields: {
          convertedId: {
            $cond: {
              if: { $regexMatch: { input: "$_id", regex: /^[0-9a-fA-F]{24}$/ } },
              then: { $toObjectId: "$_id" },
              else: "$_id"
            }
          }
        }
      },
      {
        $lookup: {
          from: "products",
          let: { cid: "$convertedId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$cid"] } } }
          ],
          as: "productInfo"
        }
      },
      { $unwind: { path: "$productInfo", preserveNullAndEmptyArrays: true } }
    ]);

    // 4. Top Agents
    const topAgents = await Stat.aggregate([
      { $match: { type: 'product_click', agent: { $ne: null }, ...cleanFilter } },
      { $group: { _id: "$agent", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    // 5. Top Browsers
    const topBrowsers = await Stat.aggregate([
      { $match: { userAgent: { $ne: null, $ne: "" }, ...cleanFilter } },
      { $group: { _id: "$userAgent", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // 6. Recent Activity
    const recentActivityRaw = await Stat.find({ type: { $ne: 'error_log' }, ...cleanFilter })
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();

    const recentActivity = await Promise.all(recentActivityRaw.map(async (act) => {
      if (act.productId && mongoose.Types.ObjectId.isValid(act.productId)) {
        act.productId = await Product.findById(act.productId).select('name image').lean();
      }
      return act;
    }));

    // 7. Top Countries
    const topCountries = await Stat.aggregate([
      { $match: { country: { $ne: null, $ne: "" }, ...cleanFilter } },
      { $group: { _id: "$country", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // 8. Recent Errors
    const recentErrors = await Stat.find({ type: 'error_log' })
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();

    return NextResponse.json({
      totalVisits,
      totalClicks,
      topProducts,
      topAgents,
      topBrowsers,
      recentActivity,
      topCountries,
      recentErrors
    });
  } catch (error) {
    console.error("Fetch stats error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
