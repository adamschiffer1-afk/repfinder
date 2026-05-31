import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import axios from "axios";
import * as cheerio from "cheerio";
import { detectCategory } from "@/utils/categoryHelper";

const AFFILIATE_CODE = 'xfrostyy';

export async function POST(req) {
  const session = await auth();
  
  if (!session || session.user.email !== "kakobuybs209@gmail.com") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Extract itemID
    let itemId = "";
    const itemIdMatch = url.match(/itemID=(\d+)/) || url.match(/item\/(\d+)/);
    if (itemIdMatch) {
      itemId = itemIdMatch[1];
    } else {
      return NextResponse.json({ error: "Invalid Weidian URL" }, { status: 400 });
    }

    const weidianUrl = `https://weidian.com/item.html?itemID=${itemId}`;
    
    const res = await axios.get(weidianUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
      },
      timeout: 10000
    });

    const $ = cheerio.load(res.data);
    const scriptTag = $('#__rocker-render-inject__');
    
    if (scriptTag.length === 0) {
      return NextResponse.json({ error: "Could not find product data. Bot protection?" }, { status: 404 });
    }

    const data = JSON.parse(scriptTag.attr('data-obj'));
    const itemInfo = data.result.default_model.item_info;
    
    const finalName = itemInfo.item_name;
    const basePriceCNY = parseFloat(itemInfo.origin_price);
    const priceUSD = (basePriceCNY * 0.14).toFixed(2);

    // Grab EXACTLY 1 image (the main head image)
    const mainImage = itemInfo.item_head.startsWith('http') 
        ? `${itemInfo.item_head}?w=400&h=400` 
        : `https:${itemInfo.item_head}?w=400&h=400`;

    await dbConnect();

    const productData = {
        name: finalName,
        price: parseFloat(priceUSD),
        image: mainImage,
        category: detectCategory(finalName),
        batch: 'best',
        link: `https://www.kakobuy.com/item/details?url=${encodeURIComponent(weidianUrl)}&affcode=${AFFILIATE_CODE}`,
        isPinned: true,
        pinnedOrder: 999999
    };

    const newProduct = await Product.create(productData);

    return NextResponse.json({ 
      success: true, 
      message: `Successfully added product`,
      product: newProduct
    });

  } catch (error) {
    console.error("Bulk Scraper API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
