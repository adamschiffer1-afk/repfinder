import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import mongoose from "mongoose";
import {
  buildProductFilter,
  buildProductSort,
  buildSearchFilter,
  hasActiveStorefrontFilters
} from "@/lib/buildProductQuery";

function getPinnedOrderSortStages() {
  return [
    {
      $addFields: {
        __pinnedOrderSort: { $ifNull: ["$pinnedOrder", 999999] }
      }
    },
    { $sort: { isPinned: -1, __pinnedOrderSort: 1, createdAt: -1 } },
    { $project: { __pinnedOrderSort: 0 } }
  ];
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const suggest = searchParams.get('suggest');
    const page = parseInt(searchParams.get('page'), 10);
    const limit = parseInt(searchParams.get('limit'), 10) || 24;
    const admin = searchParams.get('admin') === 'true';
    const search = searchParams.get('search')?.trim() || '';
    const sortParam = searchParams.get('sort') || (admin ? 'pinned_order' : 'newest');

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
          pinnedProducts = await Product.aggregate([
            { $match: { ...query, isPinned: true } },
            ...getPinnedOrderSortStages(),
            { $skip: skip },
            { $limit: pinnedOnPage }
          ]);
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

    if (page && !Number.isNaN(page)) {
      const skip = (page - 1) * limit;

      if (sortParam === 'pinned_order') {
        const [products, total] = await Promise.all([
          Product.aggregate([
            { $match: query },
            ...getPinnedOrderSortStages(),
            { $skip: skip },
            { $limit: limit }
          ]),
          Product.countDocuments(query)
        ]);

        return NextResponse.json({
          products,
          total,
          page,
          pages: Math.ceil(total / limit) || 1
        });
      }

      const sort = buildProductSort(sortParam, {
        pinnedFirst: !admin && !hasActiveStorefrontFilters(searchParams)
      });

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

    if (sortParam === 'pinned_order') {
      const products = await Product.aggregate([
        { $match: query },
        ...getPinnedOrderSortStages()
      ]);
      return NextResponse.json(products);
    }

    const sort = buildProductSort(sortParam, {
      pinnedFirst: !admin && !hasActiveStorefrontFilters(searchParams)
    });
    const products = await Product.find(query).sort(sort).lean();
    return NextResponse.json(products);
  } catch (error) {
    console.error('Products API error:', error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

async function generateUniqueSlug(name, productId = null) {
  let baseSlug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  if (!baseSlug) baseSlug = "product";
  let slug = baseSlug;
  let counter = 1;
  while (true) {
    const query = { slug };
    if (productId) {
      query._id = { $ne: productId };
    }
    const exists = await Product.findOne(query).select("_id").lean();
    if (!exists) break;
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  return slug;
}

export async function POST(req) {
  try {
    const session = await auth();
    if (!session || session.user.email !== "kakobuybs209@gmail.com") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    await dbConnect();
    
    if (data.name) {
      data.slug = await generateUniqueSlug(data.name);
    }
    
    const product = await Product.create(data);
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Failed to create product:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const session = await auth();
    if (!session || session.user.email !== "kakobuybs209@gmail.com") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ids, deletePinned, confirm } = await req.json();

    if (deletePinned === true) {
      if (confirm !== "DELETE_PINNED") {
        return NextResponse.json({ error: "Missing delete confirmation" }, { status: 400 });
      }

      await dbConnect();
      const result = await Product.deleteMany({ isPinned: true });
      return NextResponse.json({
        message: `Successfully deleted ${result.deletedCount} pinned products`,
        deletedCount: result.deletedCount
      });
    }

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

    const { ids, update, reorder } = await req.json();

    if (Array.isArray(reorder)) {
      const operations = reorder
        .map((item) => ({
          id: item?.id,
          pinnedOrder: Number.parseInt(item?.pinnedOrder, 10)
        }))
        .filter((item) => mongoose.Types.ObjectId.isValid(item.id) && Number.isFinite(item.pinnedOrder));

      if (operations.length === 0 || operations.length !== reorder.length) {
        return NextResponse.json({ error: "Invalid reorder payload" }, { status: 400 });
      }

      await dbConnect();
      const result = await Product.bulkWrite(
        operations.map((item) => ({
          updateOne: {
            filter: { _id: item.id },
            update: { $set: { isPinned: true, pinnedOrder: item.pinnedOrder } }
          }
        }))
      );

      return NextResponse.json({
        message: "Pinned order updated",
        modifiedCount: result.modifiedCount
      });
    }

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
        // If unpinning, clear pinnedOrder. If pinning, set to 999999 to avoid null sorting issues.
        if (key === "isPinned") {
          if (update[key] === false) {
            updateData.pinnedOrder = null;
          } else {
            updateData.pinnedOrder = 999999;
          }
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
