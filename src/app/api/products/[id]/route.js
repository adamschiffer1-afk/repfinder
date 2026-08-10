import { ProductDB, supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

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
    let query = supabaseAdmin.from('products').select('id').eq('slug', slug);
    
    if (productId) {
      query = query.neq('id', productId);
    }
    
    const { data, error } = await query.limit(1);
    if (error) throw error;
    
    if (!data || data.length === 0) break;
    
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
}

export async function GET(req, { params }) {
  try {
    const { id } = params;
    
    const product = await ProductDB.findById(id);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Generate slug if missing
    if (!product.slug && product.name) {
      const generatedSlug = await generateUniqueSlug(product.name, product.id);
      await ProductDB.update(id, { slug: generatedSlug });
      product.slug = generatedSlug;
    }

    // Return simplified version for now (full scraping logic can be added later)
    return NextResponse.json({
      success: true,
      product,
      variants: [],
      sizes: ['S', 'M', 'L', 'XL'],
      colors: [{
        name: 'Default Style',
        image: product.image,
        productId: product.id
      }],
      qcImages: product.qc_images || [],
      details: {
        sales: product.clicks * 4 + 12,
        views: product.clicks * 18 + 42,
        favorites: Math.round(product.clicks * 1.5 + 4),
        weight: "N/A",
        delivery: "N/A",
        platform: product.link?.includes("weidian.com") ? "weidian" : "unknown"
      }
    });

  } catch (error) {
    console.error("GET product details error:", error);
    return NextResponse.json({ error: "Failed to get product details" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const session = await auth();
    if (!session || session.user.email !== "kakobuybs209@gmail.com") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    await ProductDB.delete(id);
    return NextResponse.json({ message: "Product deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const session = await auth();
    if (!session || session.user.email !== "kakobuybs209@gmail.com") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const data = await req.json();
    
    console.log("PUT /api/products/[id] - Received data:", JSON.stringify(data, null, 2));
    
    // Map MongoDB field names to Supabase
    const mappedData = {};
    if (data.name !== undefined) mappedData.name = data.name;
    if (data.price !== undefined) mappedData.price = data.price;
    if (data.image !== undefined) mappedData.image = data.image;
    if (data.category !== undefined) mappedData.category = data.category;
    if (data.batch !== undefined) mappedData.batch = data.batch;
    if (data.link !== undefined) mappedData.link = data.link;
    if (data.clicks !== undefined) mappedData.clicks = data.clicks;
    if (data.isPinned !== undefined) mappedData.is_pinned = data.isPinned;
    if (data.pinnedOrder !== undefined) mappedData.pinned_order = data.pinnedOrder;
    if (data.qcImages !== undefined) mappedData.qc_images = data.qcImages;
    if (data.slug) {
      mappedData.slug = await generateUniqueSlug(data.slug, id);
    } else if (data.name) {
      const existing = await ProductDB.findById(id);
      if (!existing || !existing.slug) {
        mappedData.slug = await generateUniqueSlug(data.name, id);
      }
    }

    console.log("PUT /api/products/[id] - Mapped data for Supabase:", JSON.stringify(mappedData, null, 2));

    const product = await ProductDB.update(id, mappedData);
    
    console.log("PUT /api/products/[id] - Update successful:", product.id);
    
    return NextResponse.json(product);
  } catch (error) {
    console.error("Update product error:", error);
    console.error("Error details:", error.message, error.stack);
    return NextResponse.json({ 
      error: "Failed to update product",
      details: error.message 
    }, { status: 500 });
  }
}
