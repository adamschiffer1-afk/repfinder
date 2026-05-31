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
    'seo', 'semrush', 'ahrefs', 'moz', 'mj12bot', 'dotbot', 'uipresence', 'coccocbot'
  ];

  if (botKeywords.some(keyword => lowerUa.includes(keyword))) {
    return true;
  }

  // Developer automated clients and headless libraries
  const libRegex = /(?:curl|wget|python|requests|urllib|axios|fetch|go-http-client|postman|playwright|puppeteer|selenium|headless|phantomjs|client)/i;
  if (libRegex.test(lowerUa)) {
    return true;
  }

  return false;
}

// Global ex-post bot regex filter for database queries
const botExcludeRegex = /bot|spider|crawler|scraper|yandex|baidu|slurp|duckduckgo|sogou|exabot|facebot|ia_archiver|facebookexternalhit|twitterbot|linkedinbot|embedly|redditbot|applebot|whatsapp|flipboard|tumblr|bitlybot|discordbot|lighthouse|telegrambot|screaming|semrush|ahrefs|moz|mj12bot|dotbot|curl|wget|python|urllib|axios|fetch|go-client/i;
const cleanFilter = {
  $or: [
    { userAgent: null },
    { userAgent: "" },
    { userAgent: { $not: botExcludeRegex } }
  ]
};

export async function POST(req) {
  try {
    let { productId, type, agent, userAgent, path } = await req.json();
    
    // Normalize type
    if (type === 'click') type = 'product_click';
    
    // Skip logging for admin paths
    if (path && path.startsWith('/admin-99x-hsd')) {
      return NextResponse.json({ success: true, message: 'Skipped admin path' });
    }

    // Resolve userAgent from headers if client did not supply it
    const finalUserAgent = userAgent || req.headers.get('user-agent') || '';

    // 1. Strict Bot Filtering
    if (!finalUserAgent || finalUserAgent.length < 15 || isBot(finalUserAgent)) {
      return NextResponse.json({ success: true, message: 'Skipped automated bot/junk traffic' });
    }

    // 2. Admin Self-Logging Exclusion
    const session = await auth();
    if (session && session.user?.email === "kakobuybs209@gmail.com") {
      return NextResponse.json({ success: true, message: 'Skipped administrator test activity' });
    }

    await dbConnect();

    // 3. Action Deduplication (15 seconds cooldown for identical event)
    const cooldownTime = new Date(Date.now() - 15000);
    const existingStat = await Stat.findOne({
      type: type || 'product_click',
      productId: productId || null,
      path: path || null,
      userAgent: finalUserAgent,
      timestamp: { $gte: cooldownTime }
    });

    if (existingStat) {
      return NextResponse.json({ success: true, message: 'Skipped duplicate event (cooldown)' });
    }

    await Stat.create({
      type: type || 'product_click',
      productId: productId || null,
      agent: agent || null,
      userAgent: finalUserAgent,
      path: path || null,
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
    const recentActivityRaw = await Stat.find(cleanFilter)
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();

    const recentActivity = await Promise.all(recentActivityRaw.map(async (act) => {
      if (act.productId && mongoose.Types.ObjectId.isValid(act.productId)) {
        act.productId = await Product.findById(act.productId).select('name image').lean();
      }
      return act;
    }));

    return NextResponse.json({
      totalVisits,
      totalClicks,
      topProducts,
      topAgents,
      topBrowsers,
      recentActivity
    });
  } catch (error) {
    console.error("Fetch stats error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
