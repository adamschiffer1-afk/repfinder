import dbConnect from "@/lib/mongodb";
import Stat from "@/models/Stat";
import Product from "@/models/Product";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import mongoose from "mongoose";

function getRangeDate(range, customFrom, customTo) {
  const now = new Date();
  if (range === "custom" && customFrom && customTo) {
    return { from: new Date(customFrom), to: new Date(customTo) };
  }
  const map = {
    "6h":  6 * 60 * 60 * 1000,
    "12h": 12 * 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "48h": 48 * 60 * 60 * 1000,
    "7d":  7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
  };
  const ms = map[range] || map["24h"];
  return { from: new Date(now - ms), to: now };
}

function getBucketInterval(range) {
  if (range === "6h")  return { unit: "hour", every: 1 };
  if (range === "12h") return { unit: "hour", every: 2 };
  if (range === "24h") return { unit: "hour", every: 4 };
  if (range === "48h") return { unit: "hour", every: 6 };
  if (range === "7d")  return { unit: "day", every: 1 };
  if (range === "30d") return { unit: "day", every: 1 };
  return { unit: "hour", every: 4 };
}

// Global ex-post bot regex filter (excludes error logs so we always get all error logs)
const botExcludeRegex = /bot|spider|crawler|scraper|yandex|baidu|slurp|duckduckgo|sogou|exabot|facebot|ia_archiver|facebookexternalhit|twitterbot|linkedinbot|embedly|redditbot|applebot|whatsapp|flipboard|tumblr|bitlybot|discordbot|lighthouse|telegrambot|screaming|semrush|ahrefs|mj12bot|dotbot|curl|wget|python|urllib|axios|fetch|go-client/i;
const cleanFilter = {
  $or: [
    { type: 'error_log' }, // Always keep errors
    { userAgent: null },
    { userAgent: "" },
    { userAgent: { $not: botExcludeRegex } }
  ]
};

export async function GET(req) {
  try {
    const session = await auth();
    if (!session || session.user.email !== "kakobuybs209@gmail.com") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "24h";
    const customFrom = searchParams.get("from");
    const customTo = searchParams.get("to");

    await dbConnect();

    const { from, to } = getRangeDate(range, customFrom, customTo);
    const dateFilter = { timestamp: { $gte: from, $lte: to } };

    // Combine date filter with strict bot filter for clean stats!
    const queryWithClean = { ...dateFilter, ...cleanFilter };

    // --- Core counts (exclude error_log counts from visits and clicks to keep dashboard KPIs strictly accurate) ---
    const [totalVisits, totalClicks, totalVisitsAll, totalClicksAll] = await Promise.all([
      Stat.countDocuments({ type: "page_view", ...queryWithClean }),
      Stat.countDocuments({ type: "product_click", ...queryWithClean }),
      Stat.countDocuments({ type: "page_view", ...cleanFilter }),
      Stat.countDocuments({ type: "product_click", ...cleanFilter }),
    ]);

    // --- Top Products ---
    const topProducts = await Stat.aggregate([
      { $match: { type: "product_click", productId: { $nin: [null, ""] }, ...queryWithClean } },
      { $group: { _id: "$productId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
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
          pipeline: [{ $match: { $expr: { $eq: ["$_id", "$$cid"] } } }],
          as: "productInfo"
        }
      },
      { $unwind: "$productInfo" },
      { $limit: 15 }
    ]);

    // --- Top Agents ---
    const topAgents = await Stat.aggregate([
      { $match: { type: "product_click", agent: { $ne: null }, ...queryWithClean } },
      { $group: { _id: "$agent", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 }
    ]);

    // --- Top Browsers ---
    const topBrowsers = await Stat.aggregate([
      { $match: { userAgent: { $ne: null, $ne: "" }, type: { $ne: "error_log" }, ...queryWithClean } },
      { $group: { _id: "$userAgent", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 15 }
    ]);

    // --- Top Pages ---
    const topPages = await Stat.aggregate([
      { $match: { type: "page_view", path: { $ne: null }, ...queryWithClean } },
      { $group: { _id: "$path", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 12 }
    ]);

    // --- Recent Activity ---
    const recentActivityRaw = await Stat.find({ type: { $ne: "error_log" }, ...queryWithClean })
      .sort({ timestamp: -1 })
      .limit(40)
      .lean();

    const recentActivity = await Promise.all(
      recentActivityRaw.map(async (act) => {
        if (act.productId && mongoose.Types.ObjectId.isValid(act.productId)) {
          act.productInfo = await Product.findById(act.productId).select("name image").lean();
        }
        return act;
      })
    );

    // --- Top Countries ---
    const topCountries = await Stat.aggregate([
      { $match: { country: { $ne: null, $ne: "" }, ...queryWithClean } },
      { $group: { _id: "$country", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 15 }
    ]);

    // --- Recent Error Logs ---
    const recentErrors = await Stat.find({ type: "error_log", ...dateFilter })
      .sort({ timestamp: -1 })
      .limit(40)
      .lean();

    // --- Enterprise Analytics: Unique Visitors ---
    const uniqueVisitorsRaw = await Stat.distinct("visitorId", { ...queryWithClean, visitorId: { $ne: null } });
    const uniqueVisitors = uniqueVisitorsRaw.length;

    // --- Enterprise Analytics: Top Sources ---
    const topSources = await Stat.aggregate([
      { $match: { utmSource: { $ne: null, $ne: "" }, ...queryWithClean } },
      { $group: { _id: "$utmSource", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const topReferrers = await Stat.aggregate([
      { $match: { referrer: { $ne: null, $ne: "" }, ...queryWithClean } },
      { $group: { _id: "$referrer", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // --- Enterprise Analytics: Engagement ---
    const engagementStats = await Stat.aggregate([
      { $match: { type: "engagement", ...queryWithClean } },
      { $group: { 
          _id: null, 
          avgTimeSpent: { $avg: "$timeSpent" }, 
          avgScrollDepth: { $avg: "$scrollDepth" } 
        } 
      }
    ]);
    const engagement = engagementStats[0] || { avgTimeSpent: 0, avgScrollDepth: 0 };

    // --- Timeline chart data (hourly/daily buckets) ---
    const bucketInfo = getBucketInterval(range);
    let dateGroupExpr;
    if (bucketInfo.unit === "hour") {
      dateGroupExpr = {
        year:   { $year: "$timestamp" },
        month:  { $month: "$timestamp" },
        day:    { $dayOfMonth: "$timestamp" },
        hour:   { $multiply: [{ $floor: { $divide: [{ $hour: "$timestamp" }, bucketInfo.every] } }, bucketInfo.every] }
      };
    } else {
      dateGroupExpr = {
        year:  { $year: "$timestamp" },
        month: { $month: "$timestamp" },
        day:   { $dayOfMonth: "$timestamp" },
      };
    }

    const timelineRaw = await Stat.aggregate([
      { $match: { type: { $nin: ["error_log", "engagement"] }, ...queryWithClean } },
      {
        $group: {
          _id: { type: "$type", date: dateGroupExpr },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.date.year": 1, "_id.date.month": 1, "_id.date.day": 1, "_id.date.hour": 1 } }
    ]);

    // Build timeline map
    const timelineMap = {};
    for (const entry of timelineRaw) {
      const d = entry._id.date;
      const key = bucketInfo.unit === "hour"
        ? `${d.year}-${String(d.month).padStart(2,'0')}-${String(d.day).padStart(2,'0')}T${String(d.hour).padStart(2,'0')}:00`
        : `${d.year}-${String(d.month).padStart(2,'0')}-${String(d.day).padStart(2,'0')}`;
      if (!timelineMap[key]) timelineMap[key] = { views: 0, clicks: 0 };
      if (entry._id.type === "page_view") timelineMap[key].views = entry.count;
      if (entry._id.type === "product_click") timelineMap[key].clicks = entry.count;
    }

    const timeline = Object.entries(timelineMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, data]) => ({ label, ...data }));

    return NextResponse.json({
      range,
      from: from.toISOString(),
      to: to.toISOString(),
      totalVisits,
      uniqueVisitors,
      engagement,
      topSources,
      topReferrers,
      totalClicks,
      totalVisitsAll,
      totalClicksAll,
      topProducts,
      topAgents,
      topBrowsers,
      topPages,
      recentActivity,
      topCountries,
      recentErrors,
      timeline
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
