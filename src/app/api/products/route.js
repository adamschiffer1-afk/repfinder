import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page'));
    const limit = parseInt(searchParams.get('limit')) || 50;
    const admin = searchParams.get('admin') === 'true';
    const search = searchParams.get('search');
    const skip = (page - 1) * limit;

    await dbConnect();
    
    let query = {};
    if (search) {
      query = { name: { $regex: search, $options: 'i' } };
    }

    let sort = { createdAt: -1 };

    if (admin) {
      sort = { isPinned: -1, createdAt: -1 };
    }

    if (page) {
      const products = await Product.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit);
      
      const total = await Product.countDocuments(query);
      
      return NextResponse.json({
        products,
        total,
        page,
        pages: Math.ceil(total / limit)
      });
    }

    // Default: return all products (backward compatibility)
    const products = await Product.find(query).sort(sort);
    return NextResponse.json(products);
  } catch (error) {
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
