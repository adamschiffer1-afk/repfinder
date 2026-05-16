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
  // Returns bucket grouping for chart timeline
  if (range === "6h")  return { unit: "hour", every: 1 };
  if (range === "12h") return { unit: "hour", every: 2 };
  if (range === "24h") return { unit: "hour", every: 4 };
  if (range === "48h") return { unit: "hour", every: 6 };
  if (range === "7d")  return { unit: "day", every: 1 };
  if (range === "30d") return { unit: "day", every: 1 };
  return { unit: "hour", every: 4 };
}

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

    // --- Core counts ---
    const [totalVisits, totalClicks, totalVisitsAll, totalClicksAll] = await Promise.all([
      Stat.countDocuments({ type: "page_view", ...dateFilter }),
      Stat.countDocuments({ type: "product_click", ...dateFilter }),
      Stat.countDocuments({ type: "page_view" }),
      Stat.countDocuments({ type: "product_click" }),
    ]);

    // --- Top Products ---
    const topProducts = await Stat.aggregate([
      { $match: { type: "product_click", productId: { $ne: null, $ne: "" }, ...dateFilter } },
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
          pipeline: [{ $match: { $expr: { $eq: ["$_id", "$$cid"] } } }],
          as: "productInfo"
        }
      },
      { $unwind: { path: "$productInfo", preserveNullAndEmptyArrays: true } }
    ]);

    // --- Top Agents ---
    const topAgents = await Stat.aggregate([
      { $match: { type: "product_click", agent: { $ne: null }, ...dateFilter } },
      { $group: { _id: "$agent", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 }
    ]);

    // --- Top Browsers ---
    const topBrowsers = await Stat.aggregate([
      { $match: { userAgent: { $ne: null }, ...dateFilter } },
      { $group: { _id: "$userAgent", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // --- Top Pages ---
    const topPages = await Stat.aggregate([
      { $match: { type: "page_view", path: { $ne: null }, ...dateFilter } },
      { $group: { _id: "$path", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // --- Recent Activity ---
    const recentActivityRaw = await Stat.find({ ...dateFilter })
      .sort({ timestamp: -1 })
      .limit(30)
      .lean();

    const recentActivity = await Promise.all(
      recentActivityRaw.map(async (act) => {
        if (act.productId && mongoose.Types.ObjectId.isValid(act.productId)) {
          act.productInfo = await Product.findById(act.productId).select("name image").lean();
        }
        return act;
      })
    );

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
      { $match: { ...dateFilter } },
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
      totalClicks,
      totalVisitsAll,
      totalClicksAll,
      topProducts,
      topAgents,
      topBrowsers,
      topPages,
      recentActivity,
      timeline
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
