import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import ProductDetail from "@/components/ProductDetail";
import PopupModal from "@/components/PopupModal";

export async function generateMetadata({ params }) {
  const { id } = await params;
  try {
    await dbConnect();
    const product = await Product.findById(id).lean();
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
  const { id } = await params;
  return (
    <>
      <ProductDetail productId={id} />
      <PopupModal />
    </>
  );
}
