import { ProductDB, supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const suggest = searchParams.get('suggest');
    const page = parseInt(searchParams.get('page'), 10);
    const limit = parseInt(searchParams.get('limit'), 10) || 24;
    const admin = searchParams.get('admin') === 'true';
    const search = searchParams.get('search')?.trim() || '';
    const sortParam = searchParams.get('sort') || (admin ? 'pinned_order' : 'created_at');
    
    // Get filter params
    const category = searchParams.get('category');
    const batch = searchParams.get('batch');
    const pinned = searchParams.get('pinned');

    // Build filters
    const filters = {};
    if (search) filters.search = search;
    if (category && category !== 'all') filters.category = category;
    if (batch && batch !== 'all') filters.batch = batch;
    if (pinned && pinned !== 'all') filters.is_pinned = pinned;

    // Suggest names for autocomplete
    if (suggest === 'names') {
      let query = supabaseAdmin
        .from('products')
        .select('name')
        .limit(15);
      
      if (search) {
        query = query.ilike('name', `%${search}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Group by name and count
      const nameCount = {};
      data.forEach(p => {
        nameCount[p.name] = (nameCount[p.name] || 0) + 1;
      });
      
      const names = Object.entries(nameCount)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
        .slice(0, 15);
      
      return NextResponse.json(names);
    }

    // Handle pagination
    if (page && !Number.isNaN(page)) {
      const { data: products, count: total } = await ProductDB.find(filters, {
        page,
        limit,
        sort: sortParam
      });

      return NextResponse.json({
        products,
        total,
        page,
        pages: Math.ceil((total || 0) / limit) || 1
      });
    }

    // No pagination - return all
    const { data: products } = await ProductDB.find(filters, { sort: sortParam });
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

export async function POST(req) {
  try {
    const session = await auth();
    if (!session || session.user.email !== "kakobuybs209@gmail.com") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    
    if (data.name) {
      data.slug = await generateUniqueSlug(data.name);
    }
    
    const product = await ProductDB.create(data);
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

      const { data, error } = await supabaseAdmin
        .from('products')
        .delete()
        .eq('is_pinned', true)
        .select('id');
      
      if (error) throw error;
      
      return NextResponse.json({
        message: `Successfully deleted ${data?.length || 0} pinned products`,
        deletedCount: data?.length || 0
      });
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Invalid product IDs" }, { status: 400 });
    }

    const result = await ProductDB.deleteMany(ids);
    return NextResponse.json({ 
      message: `Successfully deleted ${result.deletedCount} products`, 
      deletedCount: result.deletedCount 
    });
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

    // Handle reordering pinned products
    if (Array.isArray(reorder)) {
      const operations = reorder
        .map((item) => ({
          id: item?.id,
          pinned_order: Number.parseInt(item?.pinnedOrder, 10)
        }))
        .filter((item) => item.id && Number.isFinite(item.pinned_order));

      if (operations.length === 0 || operations.length !== reorder.length) {
        return NextResponse.json({ error: "Invalid reorder payload" }, { status: 400 });
      }

      // Update each product's pinned order
      const promises = operations.map(item =>
        supabaseAdmin
          .from('products')
          .update({ is_pinned: true, pinned_order: item.pinned_order, updated_at: new Date().toISOString() })
          .eq('id', item.id)
      );

      await Promise.all(promises);

      return NextResponse.json({
        message: "Pinned order updated",
        modifiedCount: operations.length
      });
    }

    // Handle bulk updates
    if (!Array.isArray(ids) || ids.length === 0 || !update) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    // Allowed fields for bulk update (map MongoDB names to Supabase)
    const updateData = {};
    if (update.category !== undefined) updateData.category = update.category;
    if (update.batch !== undefined) updateData.batch = update.batch;
    if (update.isPinned !== undefined) {
      updateData.is_pinned = update.isPinned;
      if (update.isPinned === false) {
        updateData.pinned_order = null;
      } else {
        updateData.pinned_order = 999999;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const result = await ProductDB.updateMany(ids, updateData);
    return NextResponse.json({ 
      message: `Successfully updated ${result.modifiedCount} products`, 
      modifiedCount: result.modifiedCount 
    });
  } catch (error) {
    console.error("Bulk update error:", error);
    return NextResponse.json({ error: "Failed to update products" }, { status: 500 });
  }
}
