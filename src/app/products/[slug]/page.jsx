import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import ProductDetail from "@/components/ProductDetail";
import PopupModal from "@/components/PopupModal";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  try {
    await dbConnect();
    let product;
    if (slug.match(/^[0-9a-fA-F]{24}$/)) {
      product = await Product.findById(slug).lean();
    }
    if (!product) {
      product = await Product.findOne({ slug }).lean();
    }
    if (!product) {
      return {
        title: 'Nie znaleziono produktu | RepFinder',
      };
    }
    return {
      title: `${product.name} | RepFinder`,
      description: `Kup ${product.name} od Weidian/Taobao/1688. Sprawdź szczegóły, warianty, rozmiary i zdjęcia QC na RepFinder.`,
      openGraph: {
        images: [product.image]
      }
    };
  } catch (err) {
    return {
      title: 'Szczegóły Produktu | RepFinder',
    };
  }
}

export default async function ProductDetailPage({ params }) {
  const { slug } = await params;
  
  await dbConnect();
  let productId = slug;
  if (!slug.match(/^[0-9a-fA-F]{24}$/)) {
    const product = await Product.findOne({ slug }).select('_id').lean();
    if (product) {
      productId = product._id.toString();
    }
  }

  return (
    <>
      <ProductDetail productId={productId} />
      <PopupModal />
    </>
  );
}
