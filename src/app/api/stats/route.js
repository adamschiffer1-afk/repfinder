import dbConnect from "@/lib/mongodb";
import Stat from "@/models/Stat";
import Product from "@/models/Product"; // Import Product for population fallback
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import mongoose from "mongoose";

export async function POST(req) {
  try {
    let { productId, type, agent, userAgent, path } = await req.json();
    
    // Normalize type
    if (type === 'click') type = 'product_click';
    
    // Skip logging for admin paths to avoid "zament"
    if (path && path.startsWith('/admin-99x-hsd')) {
      return NextResponse.json({ success: true, message: 'Skipped admin path' });
    }

    await dbConnect();

    const newStat = await Stat.create({
      type: type || 'product_click',
      productId: productId || null,
      agent: agent || null,
      userAgent: userAgent || null,
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

    // 1. Total Visits (page_view)
    const totalVisits = await Stat.countDocuments({ type: 'page_view' });

    // 2. Total Product Clicks (All)
    const totalClicks = await Stat.countDocuments({ type: 'product_click' });

    // 3. Top Products (product_click)
    // We need to convert productId string to ObjectId for lookup if it's a valid hex
    const topProducts = await Stat.aggregate([
      { $match: { type: 'product_click', productId: { $ne: null, $ne: "" } } },
      { $group: { _id: "$productId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        // Try to match as ObjectId if it's a valid 24-char hex string
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
      { $match: { type: 'product_click', agent: { $ne: null } } },
      { $group: { _id: "$agent", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    // 5. Top Browsers
    const topBrowsers = await Stat.aggregate([
      { $match: { userAgent: { $ne: null } } },
      { $group: { _id: "$userAgent", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // 6. Recent Activity
    // Since productId is now a string, we might need manual population if auto-population fails
    const recentActivityRaw = await Stat.find()
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
