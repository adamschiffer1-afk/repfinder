import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { extractItemId } from "@/utils/converter";
import axios from "axios";
import * as cheerio from "cheerio";

const USER_AGENT = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1";

export async function GET(req, { params }) {
  try {
    const { id } = params;
    await dbConnect();
    
    const product = await Product.findById(id).lean();
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const itemId = extractItemId(product.link);
    let variants = [];
    let localQcImages = product.qcImages || [];

    if (itemId) {
      // Find all sibling variants in DB
      variants = await Product.find({
        link: { $regex: itemId }
      }).lean();

      // Consolidate local QC images from all variants if our current one has none
      if (localQcImages.length === 0) {
        for (const variant of variants) {
          if (variant.qcImages && variant.qcImages.length > 0) {
            localQcImages = variant.qcImages;
            break;
          }
        }
      }
    }

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
        sizes = ['FR36', 'FR36 2/3', 'FR37 1/3', 'FR38', 'FR38 2/3', 'FR39 1/3', 'FR40', 'FR40 2/3', 'FR41 1/3', 'FR42', 'FR42 2/3', 'FR43 1/3', 'FR44', 'FR44 2/3', 'FR45 1/3', 'FR46', 'FR47 1/3', 'FR48'];
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
    const product = await Product.findByIdAndUpdate(id, data, { new: true });
    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

