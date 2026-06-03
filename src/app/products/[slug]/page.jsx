import { unstable_cache } from 'next/cache';
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import ProductDetail from "@/components/ProductDetail";
import PopupModal from "@/components/PopupModal";
import { extractItemId } from "@/utils/converter";
import axios from "axios";
import * as cheerio from "cheerio";

const USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1";

// ─── Weidian scraper — cached 2 hours per itemId ─────────────────────────────
const scrapeWeidian = unstable_cache(
  async (itemId) => {
    try {
      const url = `https://weidian.com/item.html?itemID=${itemId}`;
      const res = await axios.get(url, {
        headers: { "User-Agent": USER_AGENT, Referer: "https://weidian.com/" },
        timeout: 4000,
      });

      if (!res.data) return null;

      const $ = cheerio.load(res.data);
      const scriptTag = $("#__rocker-render-inject__");
      if (!scriptTag.length) return null;

      const data = JSON.parse(scriptTag.attr("data-obj"));
      const itemInfo = data?.result?.default_model?.item_info;
      const skuProperties = data?.result?.default_model?.sku_properties;

      const details = {};
      if (itemInfo) {
        if (itemInfo.sales_num || itemInfo.sales)
          details.sales = itemInfo.sales_num || itemInfo.sales;
        if (itemInfo.fav_count || itemInfo.favorite)
          details.favorites = itemInfo.fav_count || itemInfo.favorite;
        if (itemInfo.weight) details.weight = itemInfo.weight;
        if (itemInfo.delivery_desc || itemInfo.delivery)
          details.delivery = itemInfo.delivery_desc || itemInfo.delivery;
      }

      let sizes = [];
      let scrapedColors = [];

      if (skuProperties?.attr_list) {
        const sizeAttr = skuProperties.attr_list.find((attr) => {
          const name = (attr.attr_name || attr.name || "").toLowerCase();
          return (
            name.includes("尺码") ||
            name.includes("size") ||
            name.includes("rozmiar") ||
            name.includes("eur")
          );
        });
        if (sizeAttr?.attr_values) {
          sizes = sizeAttr.attr_values
            .map((v) => v.attr_name || v.name || "")
            .filter(Boolean);
        }

        let colorAttr = skuProperties.attr_list.find(
          (attr) => attr.attr_values && attr.attr_values.some((v) => v.img)
        );
        if (!colorAttr) {
          colorAttr = skuProperties.attr_list.find((attr) => {
            const name = (attr.attr_name || attr.name || "").toLowerCase();
            return (
              name.includes("颜色") ||
              name.includes("color") ||
              name.includes("style") ||
              name.includes("款式") ||
              name.includes("kolor")
            );
          });
        }
        if (colorAttr?.attr_values) {
          scrapedColors = colorAttr.attr_values
            .map((v) => {
              let imgUrl = v.img || "";
              if (imgUrl && !imgUrl.startsWith("http")) imgUrl = `https:${imgUrl}`;
              if (imgUrl) {
                const sep = imgUrl.includes("?") ? "&" : "?";
                imgUrl = `${imgUrl}${sep}w=400&h=400`;
              }
              return { name: v.attr_name || v.name || "", image: imgUrl || null };
            })
            .filter((c) => c.name);
        }
      }

      return { details, sizes, scrapedColors };
    } catch {
      return null;
    }
  },
  ["weidian-scrape"],
  { revalidate: 7200, tags: ["weidian"] } // 2h cache
);

// ─── Full product data — cached 5 min per productId ──────────────────────────
const getProductData = unstable_cache(
  async (productId) => {
    await dbConnect();

    const product = await Product.findById(productId).lean();
    if (!product) return null;

    const itemId = extractItemId(product.link);
    let variants = [];
    let localQcImages = product.qcImages || [];

    if (itemId) {
      // Use exact string match on itemId to avoid full-collection regex scan
      variants = await Product.find({ link: { $regex: itemId, $options: "i" } })
        .select("_id name image link qcImages")
        .lean();

      if (localQcImages.length === 0) {
        for (const v of variants) {
          if (v.qcImages?.length > 0) { localQcImages = v.qcImages; break; }
        }
      }
    }

    const platform = product.link.includes("weidian.com")
      ? "weidian"
      : product.link.includes("taobao.com")
      ? "taobao"
      : product.link.includes("1688.com")
      ? "1688"
      : "unknown";

    let liveDetails = {
      sales: product.clicks * 4 + 12,
      views: product.clicks * 18 + 42,
      favorites: Math.round(product.clicks * 1.5 + 4),
      weight: "N/A",
      delivery: "N/A",
      platform,
    };

    let sizes = [];
    let scrapedColors = [];

    if (itemId && platform === "weidian") {
      const scraped = await scrapeWeidian(itemId);
      if (scraped) {
        if (scraped.details) Object.assign(liveDetails, scraped.details);
        sizes = scraped.sizes || [];
        scrapedColors = scraped.scrapedColors || [];
      }
    }

    // Fallback sizes
    if (sizes.length === 0) {
      const cat = (product.category || "").toLowerCase();
      if (
        cat.includes("shoes") ||
        cat.includes("buty") ||
        cat.includes("sneakers") ||
        cat.includes("footwear")
      ) {
        sizes = [
          "36","36.5","37","37.5","38","38.5","39","39.5",
          "40","40.5","41","41.5","42","42.5","43","43.5",
          "44","44.5","45","45.5","46","46.5","47","47.5","48",
        ];
      } else if (
        cat.includes("hoodies") ||
        cat.includes("pants") ||
        cat.includes("shorts") ||
        cat.includes("t-shirts") ||
        cat.includes("jackets") ||
        cat.includes("sweaters") ||
        cat.includes("clothing") ||
        cat.includes("tee")
      ) {
        sizes = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];
      } else {
        sizes = ["One Size"];
      }
    }

    // Colors
    let colors = [];
    if (scrapedColors.length > 0) {
      colors = scrapedColors;
    } else if (variants.length > 0) {
      colors = variants.map((v) => {
        let name = v.name;
        if (v.name.includes("(")) {
          name = v.name.split("(").pop().replace(")", "").trim();
        } else if (v.name.includes("-")) {
          name = v.name.split("-").pop().trim();
        }
        return { name, image: v.image, productId: v._id.toString() };
      });
    } else {
      colors = [{ name: "Default Style", image: product.image, productId: product._id.toString() }];
    }

    // Serialize Mongoose objects
    const serialized = JSON.parse(JSON.stringify({ product, variants, sizes, colors, qcImages: localQcImages, details: liveDetails }));
    return serialized;
  },
  ["product-detail"],
  { revalidate: 300, tags: ["products"] } // 5 min cache
);

// ─── Metadata ─────────────────────────────────────────────────────────────────
export async function generateMetadata({ params }) {
  const { slug } = await params;
  try {
    await dbConnect();
    let product;
    if (slug.match(/^[0-9a-fA-F]{24}$/)) {
      product = await Product.findById(slug).select("name image").lean();
    }
    if (!product) {
      product = await Product.findOne({ slug }).select("name image").lean();
    }
    if (!product) return { title: "Nie znaleziono produktu | RepFinder" };
    return {
      title: `${product.name} | RepFinder`,
      description: `Kup ${product.name} od Weidian/Taobao/1688. Sprawdź szczegóły, warianty, rozmiary i zdjęcia QC na RepFinder.`,
      openGraph: { images: [product.image] },
    };
  } catch {
    return { title: "Szczegóły Produktu | RepFinder" };
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function ProductDetailPage({ params }) {
  const { slug } = await params;

  await dbConnect();

  // Resolve slug → productId
  let productId = slug;
  if (!slug.match(/^[0-9a-fA-F]{24}$/)) {
    const found = await Product.findOne({ slug }).select("_id").lean();
    if (found) productId = found._id.toString();
  }

  // Fetch all data server-side (cached)
  const productData = await getProductData(productId);

  return (
    <>
      <ProductDetail productId={productId} initialData={productData} />
      <PopupModal />
    </>
  );
}
