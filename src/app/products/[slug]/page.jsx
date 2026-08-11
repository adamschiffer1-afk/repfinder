import { unstable_cache } from 'next/cache';
import { redirect } from 'next/navigation';
import { ProductDB, supabaseAdmin } from "@/lib/supabase";
import ProductDetail from "@/components/ProductDetail";
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
    const product = await ProductDB.findById(productId);
    if (!product) return null;

    const itemId = extractItemId(product.link);
    let variants = [];
    let localQcImages = product.qc_images || [];

    if (itemId) {
      // Find variants with same itemId in link
      const { data: allVariants } = await supabaseAdmin
        .from('products')
        .select('id, name, image, link, qc_images')
        .ilike('link', `%${itemId}%`);
      
      variants = allVariants || [];

      if (localQcImages.length === 0) {
        for (const v of variants) {
          if (v.qc_images?.length > 0) { 
            localQcImages = v.qc_images; 
            break; 
          }
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
        return { name, image: v.image, productId: v.id.toString() };
      });
    } else {
      colors = [{ name: "Default Style", image: product.image, productId: product.id.toString() }];
    }

    return { product, variants, sizes, colors, qcImages: localQcImages, details: liveDetails };
  },
  ["product-detail"],
  { revalidate: 300, tags: ["products"] } // 5 min cache
);

// ─── Metadata ─────────────────────────────────────────────────────────────────
export async function generateMetadata({ params }) {
  const { slug } = await params;
  try {
    let product;
    
    // Check if slug is UUID format
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (uuidRegex.test(slug)) {
      product = await ProductDB.findById(slug);
    }
    
    if (!product) {
      const { data } = await supabaseAdmin
        .from('products')
        .select('name, image')
        .eq('slug', slug)
        .single();
      product = data;
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

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function ProductDetailPage({ params }) {
  const { slug } = await params;

  // Check if slug is UUID format (Supabase uses UUIDs)
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  const isId = uuidRegex.test(slug);
  let productId = slug;
  let productObj = null;

  if (isId) {
    productObj = await ProductDB.findById(slug);
    if (productObj) {
      if (!productObj.slug && productObj.name) {
        const uniqueSlug = await generateUniqueSlug(productObj.name, productObj.id);
        await ProductDB.update(productObj.id, { slug: uniqueSlug });
        productObj.slug = uniqueSlug;
      }
      if (productObj.slug) {
        redirect(`/products/${productObj.slug}`);
      }
    }
  } else {
    const { data: found } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('slug', slug)
      .single();
    
    if (found) productId = found.id.toString();
  }

  // Fetch all data server-side (cached)
  const productData = await getProductData(productId);

  return (
    <>
      <ProductDetail productId={productId} initialData={productData} />
    </>
  );
}
