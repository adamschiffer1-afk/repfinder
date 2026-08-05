import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { extractItemId } from "@/utils/converter";
import axios from "axios";
import * as cheerio from "cheerio";

const USER_AGENT = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1";

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

export async function GET(req, { params }) {
  try {
    const { id } = params;
    await dbConnect();
    
    let product = await Product.findById(id).lean();
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (!product.slug && product.name) {
      const generatedSlug = await generateUniqueSlug(product.name, product._id);
      await Product.updateOne({ _id: product._id }, { $set: { slug: generatedSlug } });
      product.slug = generatedSlug;
    }

    const itemId = extractItemId(product.link);
    let variants = [];
    let localQcImages = [];

    // Fetch all related products in the database that share the same itemId in their link
    // OR have QC photos explicitly tagged with our current product's itemId
    let allRelatedProducts = [];
    if (itemId) {
      allRelatedProducts = await Product.find({
        $or: [
          { link: { $regex: itemId } },
          { "qcImages.colorway": itemId }
        ]
      }).lean();
      
      // Filter out variants that match the itemId
      variants = allRelatedProducts.filter(relProduct => 
        relProduct.link && relProduct.link.includes(itemId)
      );
    }

    // Consolidated list of QC images from all related products
    const seenUrls = new Set();
    const consolidatedQcImages = [];

    // Helper to extract colorway name
    const getShortColorwayName = (pName) => {
      if (!pName) return 'Default';
      if (pName.includes('(')) {
        return pName.split('(').pop().replace(')', '').trim();
      }
      if (pName.includes('-')) {
        return pName.split('-').pop().trim();
      }
      return pName;
    };

    // Helper to resolve colorway name (if ID -> product name)
    const resolvedNamesCache = {};
    const resolveColorwayName = async (col, sourceProduct) => {
      const cleanCol = col?.trim() || 'Default';
      if (cleanCol === 'Default' || cleanCol.toLowerCase() === 'default') {
        return getShortColorwayName(sourceProduct.name);
      }
      // If it is a numeric ID of 9+ digits, let's resolve to product name
      if (/^\d{9,}$/.test(cleanCol)) {
        if (resolvedNamesCache[cleanCol]) {
          return resolvedNamesCache[cleanCol];
        }
        const match = await Product.findOne({ link: { $regex: cleanCol } }).lean();
        if (match) {
          const resolved = getShortColorwayName(match.name);
          resolvedNamesCache[cleanCol] = resolved;
          return resolved;
        }
      }
      return cleanCol;
    };

    // Process current product's QC photos first
    const rawQcImages = product.qcImages || [];
    for (const img of rawQcImages) {
      const url = typeof img === 'string' ? img : img.url;
      if (url && !seenUrls.has(url)) {
        seenUrls.add(url);
        const resolvedColorway = await resolveColorwayName(img.colorway, product);
        consolidatedQcImages.push({
          url,
          colorway: resolvedColorway,
          addedAt: img.addedAt || new Date()
        });
      }
    }

    // Process related products' QC photos
    for (const relProduct of allRelatedProducts) {
      if (relProduct._id.toString() === product._id.toString()) continue;
      const relQc = relProduct.qcImages || [];
      for (const img of relQc) {
        const url = typeof img === 'string' ? img : img.url;
        if (url && !seenUrls.has(url)) {
          const isExplicitlyForUs = img.colorway === itemId;
          const isSibling = relProduct.link && itemId && relProduct.link.includes(itemId);
          
          if (isExplicitlyForUs || isSibling) {
            seenUrls.add(url);
            const sourceForName = isExplicitlyForUs ? product : relProduct;
            const resolvedColorway = await resolveColorwayName(img.colorway, sourceForName);
            consolidatedQcImages.push({
              url,
              colorway: resolvedColorway,
              addedAt: img.addedAt || new Date()
            });
          }
        }
      }
    }

    localQcImages = consolidatedQcImages;

    // Default metadata
    let liveDetails = {
      sales: product.clicks * 4 + 12,
      views: product.clicks * 18 + 42,
      favorites: Math.round(product.clicks * 1.5 + 4),
      weight: "N/A",
      delivery: "N/A",
      platform: product.link.includes("weidian.com") ? "weidian" : product.link.includes("taobao.com") ? "taobao" : product.link.includes("1688.com") ? "1688" : "unknown"
    };

    let sizes = [];
    let scrapedColors = [];

    // Optional Live Weidian Scraper for accurate sizes, colors, and metadata
    if (itemId && liveDetails.platform === "weidian") {
      try {
        const weidianUrl = `https://weidian.com/item.html?itemID=${itemId}`;
        const res = await axios.get(weidianUrl, {
          headers: {
            "User-Agent": USER_AGENT,
            "Referer": "https://weidian.com/"
          },
          timeout: 4000
        });

        if (res.data) {
          const $ = cheerio.load(res.data);
          const scriptTag = $("#__rocker-render-inject__");
          if (scriptTag.length > 0) {
            const data = JSON.parse(scriptTag.attr("data-obj"));
            const itemInfo = data?.result?.default_model?.item_info;
            const skuProperties = data?.result?.default_model?.sku_properties;

            if (itemInfo) {
              if (itemInfo.sales_num || itemInfo.sales) {
                liveDetails.sales = itemInfo.sales_num || itemInfo.sales;
              }
              if (itemInfo.fav_count || itemInfo.favorite) {
                liveDetails.favorites = itemInfo.fav_count || itemInfo.favorite;
              }
              if (itemInfo.weight) liveDetails.weight = itemInfo.weight;
              if (itemInfo.delivery_desc || itemInfo.delivery) {
                liveDetails.delivery = itemInfo.delivery_desc || itemInfo.delivery;
              }
            }

            if (skuProperties && skuProperties.attr_list) {
              // Extract sizes
              const sizeAttr = skuProperties.attr_list.find(attr => {
                const name = (attr.attr_name || attr.name || '').toLowerCase();
                return name.includes('尺码') || name.includes('size') || name.includes('rozmiar') || name.includes('eur');
              });
              if (sizeAttr && sizeAttr.attr_values) {
                sizes = sizeAttr.attr_values.map(v => v.attr_name || v.name || '').filter(Boolean);
              }

              // Extract colorways (kolorystyki)
              let colorAttr = skuProperties.attr_list.find(attr => {
                return attr.attr_values && attr.attr_values.some(v => v.img);
              });
              if (!colorAttr) {
                colorAttr = skuProperties.attr_list.find(attr => {
                  const name = (attr.attr_name || attr.name || '').toLowerCase();
                  return name.includes('颜色') || name.includes('color') || name.includes('style') || name.includes('款式') || name.includes('kolor');
                });
              }
              if (colorAttr && colorAttr.attr_values) {
                scrapedColors = colorAttr.attr_values.map(v => {
                  let imgUrl = v.img || '';
                  if (imgUrl && !imgUrl.startsWith('http')) {
                    imgUrl = `https:${imgUrl}`;
                  }
                  if (imgUrl) {
                    const separator = imgUrl.includes("?") ? "&" : "?";
                    imgUrl = `${imgUrl}${separator}w=400&h=400`;
                  }
                  return {
                    name: v.attr_name || v.name || '',
                    image: imgUrl || null
                  };
                }).filter(c => c.name);
              }
            }
          }
        }
      } catch (scrapeError) {
        console.warn(`[Weidian Scrape Warning] Could not scrape live details for item ${itemId}:`, scrapeError.message);
      }
    }

    // Fallback size generation if scraping did not return any sizes
    if (sizes.length === 0) {
      const cat = (product.category || "").toLowerCase();
      if (cat.includes("shoes") || cat.includes("buty") || cat.includes("sneakers") || cat.includes("footwear")) {
        sizes = ['36','36.5','37','37.5','38','38.5','39','39.5','40','40.5','41','41.5','42','42.5','43','43.5','44','44.5','45','45.5','46','46.5','47','47.5','48'];
      } else if (cat.includes("hoodies") || cat.includes("pants") || cat.includes("shorts") || cat.includes("t-shirts") || cat.includes("jackets") || cat.includes("sweaters") || cat.includes("clothing") || cat.includes("tee")) {
        sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
      } else {
        sizes = ['One Size'];
      }
    }

    // Fallback colorways generation if scraper didn't return any
    let colors = [];
    if (scrapedColors.length > 0) {
      colors = scrapedColors;
    } else if (variants.length > 0) {
      colors = variants.map(v => {
        let name = v.name;
        if (v.name.includes('(')) {
          name = v.name.split('(').pop().replace(')', '').trim();
        } else if (v.name.includes('-')) {
          name = v.name.split('-').pop().trim();
        }
        return {
          name,
          image: v.image,
          productId: v._id.toString()
        };
      });
    } else {
      colors = [{
        name: 'Default Style',
        image: product.image,
        productId: product._id.toString()
      }];
    }

    return NextResponse.json({
      success: true,
      product,
      variants,
      sizes,
      colors,
      qcImages: localQcImages,
      details: liveDetails
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
    await dbConnect();
    await Product.findByIdAndDelete(id);
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
    await dbConnect();
    
    // Automatically generate slug if missing or ensure slug is unique if provided
    if (data.slug) {
      data.slug = await generateUniqueSlug(data.slug, id);
    } else if (data.name) {
      const existing = await Product.findById(id).select("slug").lean();
      if (!existing || !existing.slug) {
        data.slug = await generateUniqueSlug(data.name, id);
      }
    }

    const product = await Product.findByIdAndUpdate(id, data, { new: true });
    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

