import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  buildProductFilter,
  buildProductSort,
  buildSearchFilter,
  hasActiveStorefrontFilters
} from "@/lib/buildProductQuery";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const suggest = searchParams.get('suggest');
    const page = parseInt(searchParams.get('page'), 10);
    const limit = parseInt(searchParams.get('limit'), 10) || 24;
    const admin = searchParams.get('admin') === 'true';
    const search = searchParams.get('search')?.trim() || '';
    const sortParam = searchParams.get('sort') || 'newest';

    await dbConnect();

    if (suggest === 'names') {
      const match = buildSearchFilter(search) || {};
      const pipeline = [
        ...(Object.keys(match).length ? [{ $match: match }] : []),
        { $group: { _id: '$name', count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
        { $limit: 15 },
        { $project: { _id: 0, name: '$_id', count: 1 } }
      ];
      const names = await Product.aggregate(pipeline);
      return NextResponse.json(names);
    }

    const query = buildProductFilter(searchParams);

    // Handle random sort using $sample aggregation for true randomness
    if (sortParam === 'random' && page && !Number.isNaN(page)) {
      const showPinnedFirst = !hasActiveStorefrontFilters(searchParams);
      
      if (showPinnedFirst) {
        const pinnedCount = await Product.countDocuments({ ...query, isPinned: true });
        const nonPinnedQuery = { ...query, isPinned: { $ne: true } };
        const totalNonPinned = await Product.countDocuments(nonPinnedQuery);
        const total = pinnedCount + totalNonPinned;
        
        const skip = (page - 1) * limit;
        
        let pinnedProducts = [];
        if (skip < pinnedCount) {
          const pinnedOnPage = Math.min(limit, pinnedCount - skip);
          pinnedProducts = await Product.find({ ...query, isPinned: true })
            .sort({ pinnedOrder: 1, createdAt: -1 })
            .skip(skip)
            .limit(pinnedOnPage)
            .lean();
        }
        
        const sampleSize = Math.max(0, limit - pinnedProducts.length);
        let randomProducts = [];
        if (sampleSize > 0) {
          randomProducts = await Product.aggregate([
            { $match: nonPinnedQuery },
            { $sample: { size: sampleSize } }
          ]);
        }
        
        const products = [...pinnedProducts, ...randomProducts];
        
        return NextResponse.json({
          products,
          total,
          page,
          pages: Math.ceil(total / limit) || 1
        });
      } else {
        // Standard random sampling for all matching products
        const matchStage = Object.keys(query).length ? [{ $match: query }] : [];
        const total = await Product.countDocuments(query);
        const [products] = await Promise.all([
          Product.aggregate([
            ...matchStage,
            { $sample: { size: limit } }
          ])
        ]);
        return NextResponse.json({
          products,
          total,
          page,
          pages: Math.ceil(total / limit) || 1
        });
      }
    }

    const sort = admin && !sortParam
      ? { isPinned: -1, pinnedOrder: 1, createdAt: -1 }
      : buildProductSort(sortParam, {
          pinnedFirst: admin ? false : !hasActiveStorefrontFilters(searchParams)
        });

    if (page && !Number.isNaN(page)) {
      const skip = (page - 1) * limit;
      const [products, total] = await Promise.all([
        Product.find(query).sort(sort).skip(skip).limit(limit).lean(),
        Product.countDocuments(query)
      ]);

      return NextResponse.json({
        products,
        total,
        page,
        pages: Math.ceil(total / limit) || 1
      });
    }

    const products = await Product.find(query).sort(sort).lean();
    return NextResponse.json(products);
  } catch (error) {
    console.error('Products API error:', error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await auth();
    if (!session || session.user.email !== "kakobuybs209@gmail.com") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    await dbConnect();
    const product = await Product.create(data);
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const session = await auth();
    if (!session || session.user.email !== "kakobuybs209@gmail.com") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Invalid product IDs" }, { status: 400 });
    }

    await dbConnect();
    const result = await Product.deleteMany({ _id: { $in: ids } });
    return NextResponse.json({ message: `Successfully deleted ${result.deletedCount} products`, deletedCount: result.deletedCount });
  } catch (error) {
    console.error("Bulk delete error:", error);
    return NextResponse.json({ error: "Failed to delete products" }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const session = await auth();
    if (!session || session.user.email !== "kakobuybs209@gmail.com") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ids, update } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0 || !update) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    await dbConnect();
    
    // Allowed fields for bulk update
    const allowedFields = ["category", "batch", "isPinned"];
    const updateData = {};
    for (const key of allowedFields) {
      if (update[key] !== undefined) {
        updateData[key] = update[key];
        // If unpinning, clear pinnedOrder
        if (key === "isPinned" && update[key] === false) {
          updateData.pinnedOrder = null;
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const result = await Product.updateMany(
      { _id: { $in: ids } },
      { $set: updateData }
    );

    return NextResponse.json({ message: `Successfully updated ${result.modifiedCount} products`, modifiedCount: result.modifiedCount });
  } catch (error) {
    console.error("Bulk update error:", error);
    return NextResponse.json({ error: "Failed to update products" }, { status: 500 });
  }
}
